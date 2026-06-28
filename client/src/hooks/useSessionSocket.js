import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getCookie } from '../utils/cookies.js';

/**
 * Connect to the /sessions namespace, join a room, and expose live state:
 *   - presence:    array of { userId, name, color, cursor, typing }
 *   - typing:      array of user display names currently typing
 *   - connected:   boolean
 *   - send():      emit typed events (cursor/typing/comment)
 *   - on():        register a handler for a server event (returns unsub)
 *
 * All handlers are kept in refs so the socket connection is stable.
 */
export function useSessionSocket(sessionId, { onComment, onCommentUpdate, onReaction } = {}) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // userId -> { name, ts }
  const handlers = useRef({ onComment, onCommentUpdate, onReaction });
  handlers.current = { onComment, onCommentUpdate, onReaction };

  useEffect(() => {
    if (!sessionId) return;
    // Retrieve the non-HttpOnly ws_token cookie for authentication during socket handshake
    const token = getCookie('ws_token');
    const socket = io('/sessions', {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('session:join', { sessionId }, (ack) => {
        if (ack?.ok) setPresence(ack.presence || []);
      });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('presence', (list) => setPresence(list || []));
    socket.on('user:joined', (u) =>
      setPresence((s) => (s.find((x) => x.userId === u.userId) ? s : [...s, u]))
    );
    socket.on('user:left', ({ userId }) => {
      setPresence((s) => s.filter((x) => x.userId !== userId));
      setTypingUsers((t) => {
        const n = { ...t };
        delete n[userId];
        return n;
      });
    });

    socket.on('cursor:move', ({ userId, name, color, cursor }) => {
      setPresence((s) =>
        s.map((p) => (p.userId === userId ? { ...p, name, color, cursor } : p))
      );
    });

    socket.on('typing:start', ({ userId, name }) => {
      setTypingUsers((t) => ({ ...t, [userId]: { name, ts: Date.now() } }));
    });
    socket.on('typing:stop', ({ userId }) => {
      setTypingUsers((t) => {
        const n = { ...t };
        delete n[userId];
        return n;
      });
    });

    socket.on('comment:add', (c) => handlers.current.onComment?.(c));
    socket.on('comment:update', (c) => handlers.current.onCommentUpdate?.(c));
    socket.on('reaction:update', (r) => handlers.current.onReaction?.(r));

    return () => {
      socket.emit('session:leave', { sessionId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const send = (event, payload) => socketRef.current?.emit(event, payload);

  // auto-expire typing indicators after 3s of silence
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setTypingUsers((cur) => {
        const next = {};
        let changed = false;
        for (const [id, v] of Object.entries(cur)) {
          if (now - v.ts < 3000) next[id] = v;
          else changed = true;
        }
        return changed ? next : cur;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return { connected, presence, typingUsers, send };
}
