/**
 * In-memory implementation of the repository contract.
 *
 * Mirrors mongoStore's method signatures so the REST/WS layer never knows
 * which backend is in use. Used when Mongo is unreachable in DEMO_MODE.
 *
 * Passwords are stored as argon2 hashes (same as Mongo), seeded lazily on
 * first boot. All lookups are by string id for parity with Mongoose ObjectId
 * toString().
 */
import argon2 from 'argon2';
import { randomUUID } from 'crypto';
import {
  DEMO_USER,
  SECONDARY_USERS,
  DEMO_ORG,
  DEMO_REPO,
  DEMO_SESSION,
} from './demoData.js';

const clone = (x) => (x == null ? null : JSON.parse(JSON.stringify(stripLean(x))));
// strip mongoose-ish artifacts we don't have here; identity for plain objects
const stripLean = (x) => x;

class MemoryDB {
  constructor() {
    this.users = new Map();
    this.tokens = new Map();
    this.orgs = new Map();
    this.repos = new Map();
    this.sessions = new Map();
    this.threads = new Map();
    this.comments = new Map();
    this.seeded = false;
  }

  async ensureSeeded() {
    if (this.seeded) return;
    this.seeded = true;
    await this._seed();
  }

  async _seed() {
    // Users (hash passwords)
    for (const u of [DEMO_USER, ...SECONDARY_USERS]) {
      this.users.set(u._id, {
        _id: u._id,
        name: u.name,
        email: u.email,
        password: await argon2.hash(u.passwordPlain),
        avatarUrl: u.avatarUrl || '',
        memberships: [],
        githubId: null,
        githubToken: null,
        isDemo: !!u.isDemo,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Org + memberships
    this.orgs.set(DEMO_ORG._id, {
      ...DEMO_ORG,
      owner: DEMO_USER._id,
      members: [
        { user: DEMO_USER._id, role: 'admin' },
        { user: SECONDARY_USERS[0]._id, role: 'reviewer' },
        { user: SECONDARY_USERS[1]._id, role: 'author' },
      ],
      teams: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.users.get(DEMO_USER._id).memberships.push({ org: DEMO_ORG._id, role: 'admin' });
    this.users.get(SECONDARY_USERS[0]._id).memberships.push({
      org: DEMO_ORG._id,
      role: 'reviewer',
    });
    this.users.get(SECONDARY_USERS[1]._id).memberships.push({
      org: DEMO_ORG._id,
      role: 'author',
    });

    // Repo
    this.repos.set(DEMO_REPO._id, {
      ...DEMO_REPO,
      org: DEMO_ORG._id,
      externalId: '',
      createdBy: DEMO_USER._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Session
    this.sessions.set(DEMO_SESSION._id, {
      ...DEMO_SESSION,
      org: DEMO_ORG._id,
      repo: DEMO_REPO._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

let db;

async function getDb() {
  if (!db) {
    db = new MemoryDB();
    await db.ensureSeeded();
  }
  return db;
}

const toId = (x) => (x == null ? null : String(x._id || x));

// populate author/user objects for parity with Mongoose .populate()
function populateUser(db, id) {
  const u = db.users.get(String(id));
  return u
    ? { _id: u._id, name: u.name, email: u.email, avatarUrl: u.avatarUrl }
    : null;
}

export const memoryStore = {
  kind: 'memory',

  // ── Users ────────────────────────────────────────────────────────
  async createUser(data) {
    const db = await getDb();
    const _id = data._id || randomUUID();
    const doc = {
      _id,
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password || null,
      avatarUrl: data.avatarUrl || '',
      memberships: data.memberships || [],
      githubId: data.githubId || null,
      githubToken: data.githubToken || null,
      isDemo: data.isDemo || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.users.set(String(_id), doc);
    return clone(doc);
  },
  async findUserById(id, { withPassword = false } = {}) {
    const db = await getDb();
    const u = db.users.get(String(id));
    if (!u) return null;
    const o = clone(u);
    if (!withPassword) delete o.password;
    return o;
  },
  async findUserByEmail(email, { withPassword = false } = {}) {
    const db = await getDb();
    for (const u of db.users.values()) {
      if (u.email === String(email).toLowerCase()) {
        const o = clone(u);
        if (!withPassword) delete o.password;
        return o;
      }
    }
    return null;
  },
  async findUserByGithubId(githubId) {
    const db = await getDb();
    for (const u of db.users.values()) {
      if (u.githubId === String(githubId)) return clone(u);
    }
    return null;
  },
  async updateUser(id, patch) {
    const db = await getDb();
    const u = db.users.get(String(id));
    if (!u) return null;
    Object.assign(u, patch, { updatedAt: new Date() });
    const o = clone(u);
    delete o.password;
    return o;
  },
  async listUsers() {
    const db = await getDb();
    return Array.from(db.users.values()).map((u) => {
      const o = clone(u);
      delete o.password;
      return o;
    });
  },

  // ── Refresh tokens ───────────────────────────────────────────────
  async createRefreshToken(data) {
    const db = await getDb();
    const _id = randomUUID();
    const doc = {
      _id,
      user: String(data.user),
      family: data.family,
      hash: data.hash,
      status: 'active',
      userAgent: data.userAgent || '',
      expiresAt: data.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.tokens.set(_id, doc);
    return clone(doc);
  },
  async findActiveRefreshTokenByHash(hash) {
    const db = await getDb();
    for (const t of db.tokens.values()) {
      if (t.hash === hash && t.status === 'active') return clone(t);
    }
    return null;
  },
  async markRefreshTokenUsed(id) {
    const db = await getDb();
    const t = db.tokens.get(String(id));
    if (!t) return null;
    t.status = 'used';
    t.updatedAt = new Date();
    return clone(t);
  },
  async revokeFamily(family) {
    const db = await getDb();
    for (const t of db.tokens.values()) if (t.family === family) t.status = 'revoked';
  },
  async revokeAllForUser(userId) {
    const db = await getDb();
    for (const t of db.tokens.values())
      if (String(t.user) === String(userId)) t.status = 'revoked';
  },

  // ── Orgs ─────────────────────────────────────────────────────────
  async createOrg(data) {
    const db = await getDb();
    const _id = data._id || randomUUID();
    const doc = {
      _id,
      name: data.name,
      slug: data.slug,
      owner: String(data.owner),
      members: [{ user: String(data.owner), role: 'admin' }],
      teams: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.orgs.set(String(_id), doc);
    const owner = db.users.get(String(data.owner));
    if (owner) owner.memberships.push({ org: String(_id), role: 'admin' });
    return clone(doc);
  },
  async findOrgById(id) {
    const db = await getDb();
    const o = db.orgs.get(String(id));
    if (!o) return null;
    return clone({ ...o, members: o.members.map((m) => ({ ...m, user: populateUser(db, m.user) })) });
  },
  async findOrgBySlug(slug) {
    const db = await getDb();
    for (const o of db.orgs.values()) if (o.slug === slug) return this.findOrgById(o._id);
    return null;
  },
  async listOrgsForUser(userId) {
    const db = await getDb();
    const out = [];
    for (const o of db.orgs.values()) {
      if (o.members.some((m) => String(m.user) === String(userId))) {
        out.push(clone({ ...o, members: o.members.map((m) => ({ ...m, user: populateUser(db, m.user) })) }));
      }
    }
    return out;
  },
  async addOrgMember(orgId, userId, role = 'author') {
    const db = await getDb();
    const o = db.orgs.get(String(orgId));
    if (o && !o.members.some((m) => String(m.user) === String(userId))) {
      o.members.push({ user: String(userId), role });
    }
    const u = db.users.get(String(userId));
    if (u && !u.memberships.some((m) => String(m.org) === String(orgId))) {
      u.memberships.push({ org: String(orgId), role });
    }
    return this.findOrgById(orgId);
  },

  // ── Repos ────────────────────────────────────────────────────────
  async createRepo(data) {
    const db = await getDb();
    const _id = data._id || randomUUID();
    const doc = {
      _id,
      org: String(data.org),
      name: data.name,
      fullName: data.fullName || data.name,
      provider: data.provider || 'demo',
      externalId: data.externalId || '',
      defaultBranch: data.defaultBranch || 'main',
      allowedRoles: data.allowedRoles || ['admin', 'reviewer', 'author'],
      createdBy: data.createdBy ? String(data.createdBy) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.repos.set(String(_id), doc);
    return clone(doc);
  },
  async findRepoById(id) {
    const db = await getDb();
    const r = db.repos.get(String(id));
    return r ? clone(r) : null;
  },
  async listRepos(orgId) {
    const db = await getDb();
    let list = Array.from(db.repos.values());
    if (orgId) list = list.filter((r) => String(r.org) === String(orgId));
    return list
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map((r) => clone(r));
  },

  // ── Sessions ─────────────────────────────────────────────────────
  async createSession(data) {
    const db = await getDb();
    const _id = data._id || randomUUID();
    const doc = {
      _id,
      org: String(data.org),
      repo: String(data.repo),
      title: data.title,
      status: data.status || 'active',
      pullNumber: data.pullNumber ?? null,
      pullTitle: data.pullTitle || '',
      headSha: data.headSha || '',
      baseSha: data.baseSha || '',
      files: data.files || [],
      participants: data.participants || [],
      summary: '',
      createdBy: String(data.createdBy),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.sessions.set(String(_id), doc);
    return clone(doc);
  },
  async findSessionById(id) {
    const db = await getDb();
    const s = db.sessions.get(String(id));
    if (!s) return null;
    return clone({
      ...s,
      repo: db.repos.get(String(s.repo)) || s.repo,
      createdBy: populateUser(db, s.createdBy),
      participants: (s.participants || []).map((p) => ({
        ...p,
        user: populateUser(db, p.user),
      })),
    });
  },
  async listSessions({ orgId, repoId, status } = {}) {
    const db = await getDb();
    let list = Array.from(db.sessions.values());
    if (orgId) list = list.filter((s) => String(s.org) === String(orgId));
    if (repoId) list = list.filter((s) => String(s.repo) === String(repoId));
    if (status) list = list.filter((s) => s.status === status);
    return list
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map((s) =>
        clone({
          ...s,
          repo: db.repos.get(String(s.repo)) || { _id: s.repo },
          createdBy: populateUser(db, s.createdBy),
        })
      );
  },
  async updateSession(id, patch) {
    const db = await getDb();
    const s = db.sessions.get(String(id));
    if (!s) return null;
    Object.assign(s, patch, { updatedAt: new Date() });
    return clone(s);
  },
  async addParticipant(sessionId, user, role = 'reviewer') {
    const db = await getDb();
    const s = db.sessions.get(String(sessionId));
    if (!s) return null;
    const uid = String(user._id || user);
    if (!s.participants.find((p) => String(p.user) === uid)) {
      s.participants.push({ user: uid, role, joinedAt: new Date(), cursor: { file: '', line: 0, col: 0 } });
    }
    s.updatedAt = new Date();
    return this.findSessionById(sessionId);
  },
  async removeParticipant(sessionId, userId) {
    const db = await getDb();
    const s = db.sessions.get(String(sessionId));
    if (!s) return null;
    s.participants = s.participants.filter((p) => String(p.user) !== String(userId));
    s.updatedAt = new Date();
    return this.findSessionById(sessionId);
  },
  async updateParticipantCursor(sessionId, userId, cursor) {
    const db = await getDb();
    const s = db.sessions.get(String(sessionId));
    if (!s) return;
    const p = s.participants.find((pp) => String(pp.user) === String(userId));
    if (p) p.cursor = { ...p.cursor, ...cursor };
  },

  // ── Comments ─────────────────────────────────────────────────────
  async createComment(data) {
    const db = await getDb();
    const _id = randomUUID();
    const doc = {
      _id,
      session: String(data.session),
      author: String(data.author),
      file: data.file || '',
      lineFrom: data.lineFrom ?? null,
      lineTo: data.lineTo ?? null,
      side: data.side || 'right',
      body: data.body,
      parent: data.parent ? String(data.parent) : null,
      resolved: false,
      severity: data.severity || 'info',
      source: data.source || 'human',
      reactions: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.comments.set(String(_id), doc);
    return clone({ ...doc, author: populateUser(db, doc.author) });
  },
  async listComments(sessionId) {
    const db = await getDb();
    return Array.from(db.comments.values())
      .filter((c) => String(c.session) === String(sessionId))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((c) => clone({ ...c, author: populateUser(db, c.author) }));
  },
  async updateComment(id, patch) {
    const db = await getDb();
    const c = db.comments.get(String(id));
    if (!c) return null;
    Object.assign(c, patch, { updatedAt: new Date() });
    return clone({ ...c, author: populateUser(db, c.author) });
  },
  async findCommentById(id) {
    const db = await getDb();
    const c = db.comments.get(String(id));
    return c ? clone(c) : null;
  },
  async addReaction(commentId, emoji, userId) {
    const db = await getDb();
    const c = db.comments.get(String(commentId));
    if (!c) return null;
    if (!c.reactions) c.reactions = {};
    const list = c.reactions[emoji] || [];
    const userIdStr = String(userId);
    const index = list.indexOf(userIdStr);
    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(userIdStr);
    }
    c.reactions[emoji] = list;
    c.updatedAt = new Date();
    return clone({ ...c, author: populateUser(db, c.author) });
  },

  // ── Threads ──────────────────────────────────────────────────────
  async createThread(data) {
    const db = await getDb();
    const _id = randomUUID();
    const doc = {
      _id,
      org: String(data.org),
      repo: String(data.repo),
      session: data.session ? String(data.session) : null,
      title: data.title,
      body: data.body || '',
      author: String(data.author),
      file: data.file || '',
      line: data.line ?? null,
      tags: data.tags || [],
      status: 'open',
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.threads.set(String(_id), doc);
    return clone({ ...doc, author: populateUser(db, doc.author) });
  },
  async findThreadById(id) {
    const db = await getDb();
    const t = db.threads.get(String(id));
    if (!t) return null;
    return clone({
      ...t,
      author: populateUser(db, t.author),
      replies: (t.replies || []).map((r) => ({ ...r, author: populateUser(db, r.author) })),
    });
  },
  async listThreads({ orgId, repoId, sessionId, status } = {}) {
    const db = await getDb();
    let list = Array.from(db.threads.values());
    if (orgId) list = list.filter((t) => String(t.org) === String(orgId));
    if (repoId) list = list.filter((t) => String(t.repo) === String(repoId));
    if (sessionId) list = list.filter((t) => String(t.session) === String(sessionId));
    if (status) list = list.filter((t) => t.status === status);
    return list
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map((t) => clone({ ...t, author: populateUser(db, t.author) }));
  },
  async addReply(threadId, reply) {
    const db = await getDb();
    const t = db.threads.get(String(threadId));
    if (!t) return null;
    t.replies.push({
      _id: randomUUID(),
      author: String(reply.author),
      body: reply.body,
      source: reply.source || 'human',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    t.updatedAt = new Date();
    return this.findThreadById(threadId);
  },
  async setThreadStatus(threadId, status) {
    const db = await getDb();
    const t = db.threads.get(String(threadId));
    if (!t) return null;
    t.status = status;
    t.updatedAt = new Date();
    return this.findThreadById(threadId);
  },
};
