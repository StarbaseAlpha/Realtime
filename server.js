'use strict';

function Realtime(sock, auth=null) {
  let rooms = {};
  let users = {};

  const onConnect = (c) => {
    users[c.id] = {
      "id": c.id,
      "client":c,
      "rooms": {}
    };
  };

  const onDisconnect = (c) => {
    let id = c.id;
    for(let room in users[id].rooms) {
      if (rooms[room] && rooms[room].users) {
        delete rooms[room].users[id];
        let timestamp = Date.now();
        for(let i in rooms[room].users) {
        users[i].client.send({
            "type":"leave",
            "room":room,
            "user":c.id,
            "timestamp":timestamp
          });
        }
      }
      if (!Object.keys(rooms[room].users).length) {
        delete rooms[room];
      }
    }
    delete users[id];
  };

  const onListAllUsers = (c, m) => {
    let keys = Object.keys(users);
    let results = {};
    for(let user in users) {
      results[user] = {};
      results[user].id = users[user].id;
      results[user].rooms = users[user].rooms;
    }
    c.send({"type":"users", "users":results});
    return null;
  };

  const onListRoom = (c, m) => {
    if (m.room && typeof m.room === 'string') {
      if (!rooms[m.room]) {
        c.send({"error":"Room does not exist.", "room":m.room});
        return null;
      }
      c.send({
        "type":"room",
        "room": m.room,
        "users": rooms[m.room].users
      });
      return null;
    }
  };

  const onListAllRooms = (c, m) => {
    c.send({"type":"rooms", "rooms":rooms});
  };

  const onJoin = (c, m) => {
    if (!rooms[m.room]) {
      rooms[m.room] = {
        "users":{}
      };
    }
    if (rooms[m.room].users[c.id]) {
      c.send({"error":"You are already in the room.", "room":m.room});
      return null;
    }
    rooms[m.room].users[c.id] = true;
    users[c.id].rooms[m.room] = true;
    let timestamp = Date.now();
    for(let i in rooms[m.room].users) {
      users[i].client.send({
        "type":"join",
        "room":m.room,
        "user":c.id,
        "timestamp":timestamp
      });
    }
  };

  const onLeave = (c, m) => {
    if (!rooms[m.room] || !rooms[m.room].users[c.id]) {
      c.send({"error":"You are not in the room.","room":m.room});
      return null;
    }
    delete rooms[m.room].users[c.id];
    delete users[c.id].rooms[m.room];
    let timestamp = Date.now();
    c.send({
      "type":"leave",
      "room":m.room,
      "user":c.id,
      "timestamp":timestamp
    });
    for(let i in rooms[m.room].users) {
      users[i].client.send({
        "type":"leave",
        "room":m.room,
        "user":c.id,
        "timestamp":timestamp
      });
    }
  };

  const onMessage = (c, m) => {
    if (!users[m.to]) {
      c.send({"error":"The user does not exist.","to":m.to});
      return null;
    } else {
      let timestamp = Date.now();
      users[m.to].client.send({
        "type":"message",
        "from":c.id,
        "message":(m.message||"").toString(),
        "timestamp":timestamp
      });
    }
  };

  const onCall = (c, m) => {
    if (!users[m.to]) {
      c.send({"error":"The user does not exist.","to":m.to});
      return null;
    } else {
      let timestamp = Date.now();
      users[m.to].client.send({
        "id":m.id,
        "type":"call",
        "from":c.id,
        "call":m.call,
        "stream":m.stream,
        "timestamp":timestamp
      });
    }
  };

  const onAnswer = (c, m) => {
    if (!users[m.to]) {
      c.send({"error":"The user does not exist.","to":m.to});
      return null;
    } else {
      let timestamp = Date.now();
      users[m.to].client.send({
        "id":m.id,
        "type":"answer",
        "from":c.id,
        "answer":m.answer,
        "stream":m.stream,
        "timestamp":timestamp
      });
    }
  };

  const onChat = (c, m) => {
    if (!rooms[m.room] || !rooms[m.room].users[c.id]) {
      c.send({"error":"You have not joined the room.", "room":m.room});
      return null;
    }
    let timestamp = Date.now();
    for(let i in rooms[m.room].users) {
      users[i].client.send({
        "type":"chat",
        "room":m.room,
        "from":c.id,
        "chat":m.chat||"",
        "timestamp":timestamp
      });
    }
  };

  const onWhoAmI = (c, m) => {
    c.send({
      "type":"whoami",
      "whoami":c.id.toString()
    });
  };

  sock.onState((c,s) => {
    if (s === 'connected') {
      onConnect(c);
    }
    if (s === 'disconnected') {
      onDisconnect(c);
    }
  });

  sock.onMessage((c,m) => {
    if (typeof m !== 'object') {
      return null;
    }
    if (m.type === 'join' && typeof m.room === 'string') {
      onJoin(c, m);
      return null;
    }
    if (m.type === 'leave' && typeof m.room === 'string') {
      onLeave(c, m);
      return null;
    }
    if (m.type === 'message' && typeof m.to === 'string') {
      onMessage(c, m);
      return null;
    }
    if (m.type === 'call' && typeof m.to === 'string') {
      onCall(c, m);
      return null;
    }
    if (m.type === 'answer' && typeof m.to === 'string') {
      onAnswer(c, m);
      return null;
    }
    if (m.type === 'chat' && typeof m.room === 'string') {
      onChat(c, m);
      return null;
    }
    if (m.type === 'users') {
      onListAllUsers(c, m);
      return null;
    }
    if (m.type === 'rooms') {
      onListAllRooms(c, m);
      return null;
    }
    if (m.type === 'room') {
      onListRoom(c, m);
      return null;
    }
    if (m.type.toLowerCase() === 'whoami') {
      onWhoAmI(c, m);
      return null;
    }
    sock.send({"error":"Your request was invalid."});
    return null;
  });

  sock.onError((c,e) => {
    console.log(c.id,e);
  });
}

module.exports = Realtime;
