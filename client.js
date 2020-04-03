'use strict';

function Realtime(sock, auth=null) {

  let onError = null;
  let onConnected = null;
  let onDisconnected = null;
  let onWhoami = null;
  let onWhois = null;
  let onUsers = null;
  let onJoin = null;
  let onLeave = null;
  let onMessage = null;
  let onRooms = null;
  let onRoom = null;
  let onChat = null;
  let onAuth = null;
  let onAll = null;

  sock.onState(s=>{
    if (s === 'connected') {
      if (onConnected && typeof onConnected === 'function') {
        onConnected({"type":"connected"});
      }
      if (onAll && typeof onAll === 'function') {
        onAll({"type":"connected"});
      }
    }

    if (s === 'disconnected') {
      if (onDisconnected && typeof onDisconnected === 'function') {
        onDisconnected({"type":"disconnected"});
      }
      if (onAll && typeof onAll === 'function') {
        onAll({"type":"disconnected"});
      }
    }

  });

  sock.onError(err=>{
    if (onError && typeof onError === 'function') {
      onError({"error":err});
    }

    if (onAll && typeof onAll === 'function') {
      onAll({"error":err});
    }

  });

  sock.onMessage(async m=>{

    if (m.type === 'whoami' && onWhoami && typeof onWhoami === 'function') {
      onWhoami(m);
    }

    if (m.type === 'whois' && onWhois && typeof onWhois === 'function') {
      onWhois(m);
    }

    if (m.type === 'users' && onUsers && typeof onUsers === 'function') {
      onUsers(m);
    }

    if (m.type === 'rooms' && onRooms && typeof onRooms === 'function') {
      onRooms(m);
    }

    if (m.type === 'room' && onRoom && typeof onRoom === 'function') {
      onRoom(m);
    }

    if (m.type === 'message' && onMessage && typeof onMessage === 'function') {
      onMessage(m);
    }

    if (m.type === 'chat' && onChat && typeof onChat === 'function') {
      onChat(m);
    }

    if (m.type === 'join' && onJoin && typeof onJoin === 'function') {
      onJoin(m);
    }
    if (m.type === 'leave' && onLeave && typeof onLeave === 'function') {
      onLeave(m);
    }

    if (m.type === 'auth' && onAuth && typeof onAuth === 'function') {
      onAuth(m);
    }

    if (onAll && typeof onAll === 'function') {
      onAll(m);
    }

  });

  return {
    "onWhoami":(cb) => {
      onWhoami = cb;
    },
    "onWhois":(cb) => {
      onWhois= cb;
    },
    "onUsers":(cb) => {
      onUsers = cb;
    },
    "onJoin":(cb) => {
      onJoin = cb;
    },
    "onLeave":(cb) => {
      onLeave = cb;
    },
    "onRoom":(cb) => {
      onRoom = cb;
    },
    "onRooms":(cb) => {
      onRooms = cb;
    },
    "onChat":(cb) => {
      onChat = cb;
    },
    "onMessage":(cb) => {
      onMessage = cb;
    },
    "onAuth":(cb) => {
      onAuth = cb;
    },
    "onAll":(cb) => {
      onAll = cb;
    },
    "onConnected":(cb) => {
      onConnected = cb;
    },
    "onDisconnected":(cb) => {
      onDisconnected = cb;
    },
    "onError":(cb) => {
      onError = cb;
    },
    "connect":() => {
      sock.connect();
    },
    "close":() => {
      sock.close();
    },
    "whoami":()=> {
      sock.send({"type":"whoami"});
    },
    "whois":(username=null, id=null)=> {
      sock.send({"type":"whois", "username":username, "id":id});
    },
    "join":(room) => {
      sock.send({"type":"join","room":room});
    },
    "leave":(room) => {
      sock.send({"type":"leave","room":room});
    },
    "chat":(room, message) => {
      sock.send({"type":"chat","room":room, "chat":message});
    },
    "message":(to, message) => {
      sock.send({"type":"message","to":to, "message":message});
    },
    "users":() => {
      sock.send({"type":"users"});
    },
    "rooms":() => {
      sock.send({"type":"rooms"});
    },
    "room":(room) => {
      sock.send({"type":"room", "room":room});
    },
    "auth":async () => {
      if (auth) {
        sock.send({"type":"auth", "token":await auth.getToken()});
        return;
      }
      return;
    },
    "sock":sock
  }

}
