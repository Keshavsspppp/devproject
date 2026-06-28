import { verifyAccess } from '../utils/tokens.js';
import { store } from '../db/repo.js';

/**
 * Live review session namespace: /sessions
 *
 * Per-room state (presence, cursors, typing) lives in a Map keyed by sessionId
 * so it survives socket reconnects and is trivially serialisable for the
 * Redis adapter when scaling horizontally.
 *
 * Auth: the client passes the access token via an auth handshake; we verify
 * it and load the user once.
 */

// sessionId -> { users: Map(userId -> presence), typing: Set(userId) }
const rooms = new Map();
const room = (id) => {
  if (!rooms.has(id)) rooms.set(id, { users: new Map(), typing: new Set() });
  return rooms.get(id);
};

/**
 * Resolve the access token for a socket. Prefer an explicit handshake token,
 * but fall back to the `access_token` cookie sent with the handshake request —
 * that cookie is HttpOnly, so the browser cannot read it to pass it via auth.
 */
function tokenFromHandshake(socket) {
  const fromAuth = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (fromAuth) return fromAuth;
  const raw = socket.handshake.headers?.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === 'access_token') return decodeURIComponent(v.join('='));
  }
  return null;
}

const COLORS = ['#f97316', '#06b6d4', '#a855f7', '#22c55e', '#ec4899', '#eab308', '#3b82f6'];
const colorFor = (id) => COLORS[Math.abs(hashCode(String(id))) % COLORS.length];
const hashCode = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
};

export function registerSessionHandlers(io) {
  const nsp = io.of('/sessions');

  nsp.use(async (socket, next) => {
    try {
      const token = tokenFromHandshake(socket);
      const payload = token ? verifyAccess(token) : null;
      if (!payload?.sub) return next(new Error('unauthorized'));
      const user = await store.findUserById(payload.sub);
      if (!user) return next(new Error('unauthorized'));
      socket.data.user = {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      };
      next();
    } catch (e) {
      next(new Error('unauthorized'));
    }
  });

  nsp.on('connection', (socket) => {
    const user = socket.data.user;
    const userId = String(user._id);

    socket.on('session:join', async ({ sessionId }, ack) => {
      if (!sessionId) return ack?.({ error: 'sessionId required' });
      socket.join(sessionId);
      socket.data.sessionId = sessionId;
      socket.data.color = colorFor(userId);

      // presence
      const r = room(sessionId);
      r.users.set(userId, {
        userId,
        name: user.name,
        avatarUrl: user.avatarUrl,
        color: socket.data.color,
        cursor: { file: '', line: 0, col: 0 },
        typing: false,
        socketId: socket.id,
      });

      // persist participant for later reloads
      await store.addParticipant(sessionId, user, 'reviewer').catch(() => null);

      const presence = Array.from(r.users.values());
      ack?.({ ok: true, color: socket.data.color, presence });
      nsp.to(sessionId).emit('presence', presence);
      nsp.to(sessionId).emit('user:joined', r.users.get(userId));
    });

    socket.on('cursor:move', ({ file, line, col }) => {
      const sid = socket.data.sessionId;
      if (!sid) return;
      const r = room(sid);
      const p = r.users.get(userId);
      if (p) p.cursor = { file, line, col };
      socket.to(sid).emit('cursor:move', { userId, name: user.name, color: socket.data.color, cursor: { file, line, col } });
    });

    socket.on('typing:start', ({ file, line } = {}) => {
      const sid = socket.data.sessionId;
      if (!sid) return;
      room(sid).typing.add(userId);
      socket.to(sid).emit('typing:start', { userId, name: user.name, file, line });
    });

    socket.on('typing:stop', () => {
      const sid = socket.data.sessionId;
      if (!sid) return;
      room(sid).typing.delete(userId);
      socket.to(sid).emit('typing:stop', { userId });
    });

    // Pure broadcast channel for comments; persistence is handled by the REST API.
    socket.on('comment:add', (comment) => {
      const sid = socket.data.sessionId;
      if (!sid) return;
      socket.to(sid).emit('comment:add', comment);
    });

    socket.on('comment:update', async ({ id, ...patch }, ack) => {
      const sid = socket.data.sessionId;
      if (!sid) return ack?.({ error: 'not in a session' });

      const comment = await store.findCommentById(id).catch(() => null);
      if (!comment) return ack?.({ error: 'comment not found' });

      // Authorization: only the author OR a session/org admin may mutate.
      // This blocks a participant from editing, resolving, or corrupting
      // another reviewer's comment.
      const isAuthor = String(comment.author) === String(userId);
      let isAdmin = false;
      if (!isAuthor) {
        const session = await store.findSessionById(sid).catch(() => null);
        if (session?.org) {
          const u = await store.findUserById(userId).catch(() => null);
          const m = (u?.memberships || []).find((mm) => String(mm.org) === String(session.org));
          isAdmin = m?.role === 'admin';
        }
      }
      if (!isAuthor && !isAdmin) {
        return ack?.({ error: 'forbidden: only the author or an admin may edit' });
      }

      // Whitelist mutable fields — never let clients set author/session/_id.
      const safe = {};
      for (const k of ['body', 'resolved', 'severity']) {
        if (k in patch) safe[k] = patch[k];
      }
      const updated = await store.updateComment(id, safe).catch(() => null);
      if (updated) nsp.to(sid).emit('comment:update', updated);
      ack?.({ ok: true, updated });
    });

    socket.on('reaction:add', async ({ commentId, emoji }) => {
      const sid = socket.data.sessionId;
      if (!sid) return;
      const updated = await store.addReaction(commentId, emoji, userId).catch(() => null);
      if (updated) {
        nsp.to(sid).emit('reaction:update', { commentId, reactions: updated.reactions });
      }
    });

    const leave = () => {
      const sid = socket.data.sessionId;
      if (!sid) return;
      const r = room(sid);
      r.users.delete(userId);
      r.typing.delete(userId);
      store.removeParticipant(sid, userId).catch(() => null);
      nsp.to(sid).emit('presence', Array.from(r.users.values()));
      nsp.to(sid).emit('user:left', { userId });
    };
    socket.on('session:leave', leave);
    socket.on('disconnect', leave);
  });

  // expose for server.js / webhooks to push external updates
  return {
    pushToSession(sessionId, event, payload) {
      nsp.to(sessionId).emit(event, payload);
    },
  };
}
