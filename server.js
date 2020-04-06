'use strict';

function Realtime(sock, auth=null) {
  let rooms = {};
  let users = {};
  let usernames = {};

  const onConnect = (c) => {
    users[c.id] = {
      "id": c.id,
      "auth":null,
      "username":null,
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
            "user":{"id":c.id, "username":users[c.id].username},
            "timestamp":timestamp
          });
        }
      }
      if (!Object.keys(rooms[room].users).length) {
        delete rooms[room];
      }
    }
    if (users[id].username) {
      let username = users[id].username;
      delete usernames[users[id].username][c.id];
      if (usernames[username] && !Object.keys(usernames[username])) {
        delete usernames[username];
      }
    }
    delete users[id];
  };

  const onListAllUsers = (c, m) => {
    let msgID = m.msgID.toString() || null;
    let results = {};
    for(let user in users) {
      results[user] = {};
      results[user].id = users[user].id;
      if (users[user].username) {
        results[user].username = users[user].username;
      }
      results[user].rooms = users[user].rooms;
    }
    c.send({"msgID":msgID, "type":"users", "users":results});
    return null;
  };

  const onListRoom = (c, m) => {
    let msgID = m.msgID.toString() || null;
    if (m.room && typeof m.room === 'string') {
      if (!rooms[m.room]) {
        c.send({"msgID":msgID, "error":"Room does not exist.", "room":m.room});
        return null;
      }
      c.send({
        "msgID":msgID,
        "type":"room",
        "room": m.room,
        "users": rooms[m.room].users
      });
      return null;
    }
  };

  const onListAllRooms = (c, m) => {
    let msgID = m.msgID.toString() || null;
    c.send({"msgID":msgID, "type":"rooms", "rooms":rooms});
  };

  const onJoin = (c, m) => {
    let msgID = m.msgID.toString() || null;
    if (!rooms[m.room]) {
      rooms[m.room] = {
        "users":{}
      };
    }
    if (rooms[m.room].users[c.id]) {
      c.send({"msgID":msgID, "error":"You are already in the room.", "room":m.room});
      return null;
    }
    rooms[m.room].users[c.id] = {"id":c.id, "username":users[c.id].username};
    users[c.id].rooms[m.room] = true;
    let timestamp = Date.now();
    c.send({
      "msgID":msgID,
          "type":"join",
          "room":m.room,
          "user":{"id":c.id, "username":users[c.id].username},
          "timestamp":timestamp
   });

    for(let i in rooms[m.room].users) {
      if (i !== c.id) {
        users[i].client.send({
          "type":"join",
          "room":m.room,
          "user":{"id":c.id, "username":users[c.id].username},
          "timestamp":timestamp
        });
      }
    }
  };

  const onLeave = (c, m) => {
    let msgID = m.msgID.toString() || null;
    if (!rooms[m.room] || !rooms[m.room].users[c.id]) {
      c.send({"msgID":msgID, "error":"You are not in the room.","room":m.room});
      return null;
    }
    delete rooms[m.room].users[c.id];
    delete users[c.id].rooms[m.room];
    let timestamp = Date.now();

    c.send({
      "msgID":msgID,
        "type":"leave",
        "room":m.room,
        "user":{"id":c.id, "username":users[c.id].username},
        "timestamp":timestamp
    });

    for(let i in rooms[m.room].users) {
      users[i].client.send({
        "type":"leave",
        "room":m.room,
        "user":{"id":c.id, "username":users[c.id].username},
        "timestamp":timestamp
      });
    }
  };

  const onMessage = (c, m) => {
    let msgID = m.msgID.toString() || null;
    if (!users[m.to]) {
      c.send({"msgID":msgID, "error":"The user does not exist.","to":m.to});
      return null;
    } else {
      let timestamp = Date.now();
      users[m.to].client.send({
        "type":"message",
        "from":{"id":c.id, "username":users[c.id].username},
        "message":m.message||null,
        "timestamp":timestamp
      });
      c.send({"msgID":msgID, "to":m.to, "sent":true});
    }
  };

  const onChat = (c, m) => {
    let msgID = m.msgID.toString() || null;
    if (!rooms[m.room] || !rooms[m.room].users[c.id]) {
      c.send({"msgID":msgID, "error":"You have not joined the room.", "room":m.room});
      return null;
    }
    let timestamp = Date.now();
    for(let i in rooms[m.room].users) {
      users[i].client.send({
        "type":"chat",
        "room":m.room,
        "from":{"id":c.id, "username":users[c.id].username},
        "chat":m.chat||null,
        "timestamp":timestamp
      });
    }
    c.send({"msgID":msgID, "room":m.room, "sent":true});
  };

  const onWhoAmI = (c, m) => {
    let msgID = m.msgID.toString() || null;
    c.send({
      "msgID":msgID,
      "type":"whoami",
      "whoami":{
        "id":c.id, 
        "username":users[c.id].username
      }
    });
  };

  const onWhoIs = (c, m) => {
    let msgID = m.msgID.toString() || null;
    if (m.id && typeof m.id === 'string') {
      if (!users[m.id]) {
        c.send({"msgID":msgID, "error":"User does not exist.", "whois":m.id});
        return null;
      }
      c.send({
        "msgID":msgID,
        "type":"whois",
        "user": {
          "id":m.id,
          "username":users[m.id].username
        }
      });
      return null;
    }

    if (m.username && typeof m.username === 'string') {
      if (!usernames[m.username]) {
        c.send({"msgID":msgID, "error":"User does not exist.", "whois":m.username});
        return null;
      }
      c.send({
        "msgID":msgID,
        "type":"whois",
        "user": {
          "ids":Array.from(Object.keys(usernames[m.username])),
          "username":m.username
        }
      });
      return null;
    }

  };


  const onAuth = async (c, m) => {
    let msgID = m.msgID.toString() || null;
    let user = await auth.verifyToken(m.token||"").then(result=>{return result.user;}).catch(err=>{return null;});
    if (user) {
      users[c.id].auth = user.username;
      users[c.id].username = user.username;
      if (user.username) {
        if (!usernames[user.username]) {
          usernames[user.username] = {};
        }
        usernames[user.username][c.id] = users[c.id];
      }
      c.send({"msgID":msgID, "type":"auth", "auth":user.username});
    } else {
      c.send({"msgID":msgID, "error":"Authentication token is expired or invalid."});
    }
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

    let msgID = m.msgID.toString() || null;

    if (auth && !users[c.id].auth && m.type !== 'auth') {
      c.send({"msgID":msgID, "error":"Authentication is required."});
      return null;
    }

    if (auth && m.type === 'auth') {
      onAuth(c, m);
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
    if (m.type.toLowerCase() === 'whois') {
      onWhoIs(c, m);
      return null;
    }
    sock.send({"msgID":msgID, "error":"Your request was invalid."});
    return null;
  });

  sock.onError((c,e) => {
    return null;
  });
}

module.exports = Realtime;
