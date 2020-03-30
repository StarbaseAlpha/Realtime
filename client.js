'use strict';

function Realtime(sock, auth=null) {

  let onMessage = null;

  sock.onState(s=>{
    if (s === 'connected') {
      if (onMessage && typeof onMessage === 'function') {
        onMessage({"type":"connected"});
      }
    }
    if (s === 'disconnected') {
      if (onMessage && typeof onMessage === 'function') {
        onMessage({"type":"disconnected"});
      }
    }
  });

  sock.onError(err=>{
    if (onMessage && typeof onMessage === 'function') {
      onMessage(err);
    }
  });

  sock.onMessage(async m=>{

    if (onMessage && typeof onMessage === 'function') {
      onMessage(m);
    }

  });

  return {
    "onMessage":(cb) => {
      onMessage = cb;
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
