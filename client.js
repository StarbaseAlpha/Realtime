'use strict';

function Realtime(sock, WEBRTC, auth=null, stun=null) {

  const rtc = WEBRTC(sock.send, stun);
  rtc.onState((conn, state)=>{
    if (onMessage && typeof onMessage === 'function') {
      onMessage({"type":"webrtc", conn, state});
    }
  });

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

    if (m.type === 'answer') {
      return rtc.gotAnswer(m);
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
    "call":async (to, stream=null) => {
      return rtc.call(to, stream);
    },
    "answer":async (call, stream) => {
      return rtc.answer(call, stream);
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
    "calls":rtc.calls,
    "rtc":rtc,
    "sock":sock
  }

}
