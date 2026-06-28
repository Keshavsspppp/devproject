import { User } from '../models/User.js';
import { Org } from '../models/Org.js';
import { Repo } from '../models/Repo.js';
import { Session } from '../models/Session.js';
import { Thread } from '../models/Thread.js';
import { Comment } from '../models/Comment.js';
import { RefreshToken } from '../models/RefreshToken.js';

const toObj = (doc, opts) => (doc ? doc.toObject(opts) : null);

export const mongoStore = {
  kind: 'mongo',

  // ── Users ────────────────────────────────────────────────────────
  async createUser(data) {
    return toObj(await User.create(data), { virtuals: true });
  },
  async findUserById(id, { withPassword = false } = {}) {
    // Include githubToken (select:false in the schema) so PR fetches work after
    // OAuth. It never reaches a response body — publicUser() strips it.
    const q = User.findById(id).select('+githubToken');
    if (withPassword) q.select('+password');
    return toObj(await q.exec(), { virtuals: true });
  },
  async findUserByEmail(email, { withPassword = false } = {}) {
    const q = User.findOne({ email: String(email).toLowerCase() });
    if (withPassword) q.select('+password');
    return toObj(await q.exec(), { virtuals: true });
  },
  async findUserByGithubId(githubId) {
    return toObj(await User.findOne({ githubId }), { virtuals: true });
  },
  async updateUser(id, patch) {
    // Only allow known fields; $set so we don't clobber untouched ones.
    return toObj(
      await User.findByIdAndUpdate(id, { $set: patch }, { new: true }).select('-password'),
      { virtuals: true }
    );
  },
  async listUsers() {
    return (await User.find().lean()).map((u) => ({ ...u }));
  },

  // ── Refresh tokens (rotation + family revocation) ────────────────
  async createRefreshToken(data) {
    return toObj(await RefreshToken.create(data));
  },
  async findActiveRefreshTokenByHash(hash) {
    return toObj(await RefreshToken.findOne({ hash, status: 'active' }));
  },
  async markRefreshTokenUsed(id) {
    return toObj(await RefreshToken.findByIdAndUpdate(id, { status: 'used' }, { new: true }));
  },
  async revokeFamily(family) {
    await RefreshToken.updateMany({ family }, { status: 'revoked' });
  },
  async revokeAllForUser(userId) {
    await RefreshToken.updateMany({ user: userId }, { status: 'revoked' });
  },

  // ── Orgs ─────────────────────────────────────────────────────────
  async createOrg(data) {
    const org = await Org.create(data);
    await User.updateOne(
      { _id: data.owner },
      { $addToSet: { memberships: { org: org._id, role: 'admin' } } }
    );
    return toObj(org, { virtuals: true });
  },
  async findOrgById(id) {
    return toObj(await Org.findById(id).populate('members.user', 'name email avatarUrl'), {
      virtuals: true,
    });
  },
  async findOrgBySlug(slug) {
    return toObj(await Org.findOne({ slug }).populate('members.user', 'name email avatarUrl'), {
      virtuals: true,
    });
  },
  async listOrgsForUser(userId) {
    const orgs = await Org.find({ 'members.user': userId }).populate(
      'members.user',
      'name email avatarUrl'
    );
    return orgs.map((o) => toObj(o, { virtuals: true }));
  },
  async addOrgMember(orgId, userId, role = 'author') {
    await Org.updateOne({ _id: orgId }, { $addToSet: { members: { user: userId, role } } });
    await User.updateOne({ _id: userId }, { $addToSet: { memberships: { org: orgId, role } } });
    return toObj(await Org.findById(orgId), { virtuals: true });
  },

  // ── Repos ────────────────────────────────────────────────────────
  async createRepo(data) {
    return toObj(await Repo.create(data));
  },
  async findRepoById(id) {
    return toObj(await Repo.findById(id));
  },
  async listRepos(orgId) {
    const q = orgId ? Repo.find({ org: orgId }) : Repo.find();
    return (await q.sort({ updatedAt: -1 }).lean()).map((r) => ({ ...r }));
  },

  // ── Sessions ─────────────────────────────────────────────────────
  async createSession(data) {
    return toObj(await Session.create(data));
  },
  async findSessionById(id) {
    return toObj(
      await Session.findById(id).populate('participants.user', 'name email avatarUrl'),
      { virtuals: true }
    );
  },
  async listSessions({ orgId, repoId, status } = {}) {
    const f = {};
    if (orgId) f.org = orgId;
    if (repoId) f.repo = repoId;
    if (status) f.status = status;
    const list = await Session.find(f)
      .sort({ updatedAt: -1 })
      .populate('repo', 'name fullName')
      .populate('createdBy', 'name email avatarUrl')
      .lean();
    return list;
  },
  async updateSession(id, patch) {
    return toObj(await Session.findByIdAndUpdate(id, patch, { new: true }), { virtuals: true });
  },
  async addParticipant(sessionId, user, role = 'reviewer') {
    const s = await Session.findById(sessionId);
    if (!s) return null;
    const exists = s.participants.find((p) => String(p.user) === String(user._id || user));
    if (!exists) s.participants.push({ user: user._id || user, role, joinedAt: new Date() });
    await s.save();
    return toObj(
      await Session.findById(sessionId).populate('participants.user', 'name email avatarUrl'),
      { virtuals: true }
    );
  },
  async removeParticipant(sessionId, userId) {
    await Session.updateOne({ _id: sessionId }, { $pull: { participants: { user: userId } } });
    return toObj(await Session.findById(sessionId), { virtuals: true });
  },
  async updateParticipantCursor(sessionId, userId, cursor) {
    await Session.updateOne(
      { _id: sessionId, 'participants.user': userId },
      { $set: { 'participants.$.cursor': cursor } }
    );
  },

  // ── Comments ─────────────────────────────────────────────────────
  async createComment(data) {
    const doc = await Comment.create(data);
    return toObj(await Comment.findById(doc._id).populate('author', 'name email avatarUrl'));
  },
  async listComments(sessionId) {
    return (await Comment.find({ session: sessionId })
      .sort({ createdAt: 1 })
      .populate('author', 'name email avatarUrl')
      .lean()).map((c) => ({ ...c }));
  },
  async updateComment(id, patch) {
    return toObj(
      await Comment.findByIdAndUpdate(id, patch, { new: true }).populate(
        'author',
        'name email avatarUrl'
      )
    );
  },
  async findCommentById(id) {
    return toObj(await Comment.findById(id));
  },
  async addReaction(commentId, emoji, userId) {
    const comment = await Comment.findById(commentId);
    if (!comment) return null;
    if (!comment.reactions) {
      comment.reactions = new Map();
    }
    const list = comment.reactions.get(emoji) || [];
    const userIdStr = String(userId);
    const index = list.findIndex((id) => String(id) === userIdStr);
    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(userId);
    }
    comment.reactions.set(emoji, list);
    await comment.save();
    return toObj(await Comment.findById(commentId).populate('author', 'name email avatarUrl'));
  },

  // ── Threads ──────────────────────────────────────────────────────
  async createThread(data) {
    return toObj(await Thread.create(data));
  },
  async findThreadById(id) {
    return toObj(
      await Thread.findById(id)
        .populate('author', 'name email avatarUrl')
        .populate('replies.author', 'name email avatarUrl'),
      { virtuals: true }
    );
  },
  async listThreads({ orgId, repoId, sessionId, status } = {}) {
    const f = {};
    if (orgId) f.org = orgId;
    if (repoId) f.repo = repoId;
    if (sessionId) f.session = sessionId;
    if (status) f.status = status;
    return (await Thread.find(f)
      .sort({ updatedAt: -1 })
      .populate('author', 'name email avatarUrl')
      .lean()).map((t) => ({ ...t }));
  },
  async addReply(threadId, reply) {
    return toObj(
      await Thread.findByIdAndUpdate(
        threadId,
        { $push: { replies: reply } },
        { new: true }
      )
        .populate('replies.author', 'name email avatarUrl')
        .populate('author', 'name email avatarUrl'),
      { virtuals: true }
    );
  },
  async setThreadStatus(threadId, status) {
    return toObj(
      await Thread.findByIdAndUpdate(threadId, { status }, { new: true })
        .populate('author', 'name email avatarUrl')
        .populate('replies.author', 'name email avatarUrl'),
      { virtuals: true }
    );
  },
};
