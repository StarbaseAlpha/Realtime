'use strict';

function Realtime(auth=null, options = {
  "whoami": true,
  "whois": true,
  "join":true,
  "leave":true,
  "message":true,
  "chat":true,
  "rooms":true,
  "users":true,
  "room":true
}) {
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
    }
    c.send({"msgID":msgID, "type":"users", "users":results});
    return null;
  };

  const onListRoom = (c, m) => {
    let msgID = m.msgID.toString() || null;
    if (m.room && typeof m.room === 'string') {
      if (!rooms[m.room]) {
        c.send({"msgID":msgID, "error":{"type":"room", "message":"Room does not exist.", "room":m.room}});
        return null;
      }
      if (!rooms[m.room].users[c.id]) {
        c.send({"msgID":msgID, "error":{"type":"room", "message":"You are not in this room.", "room":m.room}});
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
    let list = [];
    for(let i in rooms) {
      list.push(i);
    }
    c.send({"msgID":msgID, "type":"rooms", "rooms":list});
  };

  const onJoin = (c, m) => {
    let msgID = m.msgID.toString() || null;
    if (!rooms[m.room]) {
      rooms[m.room] = {
        "users":{}
      };
    }
    if (rooms[m.room].users[c.id]) {
      c.send({"msgID":msgID, "error":{"type":"join", "message":"You are already in the room.", "room":m.room}});
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
      if (rooms[m.room].users[i].id !== c.id) {
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
      c.send({"msgID":msgID, "error":{"type":"leave", "message":"You are not in the room.","room":m.room}});
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
      c.send({"msgID":msgID, "error":{"type":"message", "message":"The user does not exist.","to":m.to}});
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
      c.send({"msgID":msgID, "error":{"type":"chat", "message":"You have not joined the room.", "room":m.room}});
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

  const onWhoami = (c, m) => {
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

  const onWhois = (c, m) => {
    let msgID = m.msgID.toString() || null;
    if (m.id && typeof m.id === 'string') {
      if (!users[m.id]) {
        c.send({"msgID":msgID, "error":{"type":"whois", "message":"User does not exist.", "id":m.id}});
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
        c.send({"msgID":msgID, "error":{"type":"whois", "message":"User does not exist.", "username":m.username}});
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
      c.send({"msgID":msgID, "error":{"type":"auth", "message":"Authentication token is expired or invalid."}});
    }
  };

  const addClient = (client) => {
    onConnect(client);
    client.on('close', (e) => {
      onDisconnect(client);
    });
    client.on('message', (message) => {
      let msg = null;
      try {
        msg = JSON.parse(message);
      } catch (err) {
        msg = null;
      }
      if (msg) {
        onClientMessage(client, msg);
      }
    });
  };

  const onClientMessage = (c,m) => {
    if (typeof m !== 'object') {
      return null;
    }

    if (!m.msgID) {
      m.msgID = 0;
    }
    let msgID = m.msgID.toString() || null;

    if (auth && !users[c.id].auth && m.type !== 'auth') {
      c.send({"msgID":msgID, "error":{"type":"auth", "message":"Authentication is required."}});
      return null;
    }

    if (auth && m.type === 'auth') {
      onAuth(c, m);
      return null;
    }

    if (options.join && m.type === 'join' && typeof m.room === 'string') {
      onJoin(c, m);
      return null;
    }

    if (options.leave && m.type === 'leave' && typeof m.room === 'string') {
      onLeave(c, m);
      return null;
    }

    if (options.message && m.type === 'message' && typeof m.to === 'string') {
      onMessage(c, m);
      return null;
    }

    if (options.chat && m.type === 'chat' && typeof m.room === 'string') {
      onChat(c, m);
      return null;
    }

    if (options.users && m.type === 'users') {
      onListAllUsers(c, m);
      return null;
    }

    if (options.rooms && m.type === 'rooms') {
      onListAllRooms(c, m);
      return null;
    }

    if (options.room && m.type === 'room') {
      onListRoom(c, m);
      return null;
    }

    if (options.whoami && m.type === 'whoami') {
      onWhoami(c, m);
      return null;
    }

    if (options.whois && m.type === 'whois') {
      onWhois(c, m);
      return null;
    }

    c.send({"msgID":msgID, "error":{"type":"request", "message":"Request was invalid or restricted."}});
    return null;

  };

  return {addClient};
}

module.exports = Realtime;
