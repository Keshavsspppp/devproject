import argon2 from 'argon2';
import { HttpError } from '../utils/HttpError.js';
import { store } from '../db/repo.js';
import {
  signAccess,
  signRefresh,
  hashToken,
  verifyRefresh,
  setAuthCookies,
  clearAuthCookies,
} from '../utils/tokens.js';

/**
 * Issue access + refresh, persist hashed refresh (rotation-ready).
 * Returns the refresh record id + family for rotation bookkeeping.
 */
async function issueTokens(res, user, { family, userAgent = '' } = {}) {
  const access = signAccess(user);
  const { token: refresh, family: fam, tokenId } = signRefresh(user, family);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await store.createRefreshToken({
    user: user._id,
    family: fam,
    hash: hashToken(refresh),
    userAgent,
    expiresAt,
  });

  setAuthCookies(res, { access, refresh });
  return { access, refresh, family: fam, tokenId };
}

export function publicUser(user) {
  if (!user) return null;
  const { password, githubToken, ...rest } = user;
  return { ...rest, id: user._id };
}

export const authService = {
  async register({ name, email, password }) {
    if (!name || !email || !password) throw HttpError.badRequest('name, email, password required');
    if (password.length < 8) throw HttpError.badRequest('Password must be ≥ 8 characters');
    const existing = await store.findUserByEmail(email);
    if (existing) throw HttpError.conflict('Email already registered');

    const hash = await argon2.hash(password);
    const user = await store.createUser({
      name,
      email,
      password: hash,
      memberships: [],
    });
    return user;
  },

  async login({ email, password }, { res, userAgent = '' } = {}) {
    const user = await store.findUserByEmail(email, { withPassword: true });
    if (!user || !user.password) throw HttpError.unauthorized('Invalid credentials');

    const ok = await argon2.verify(user.password, password).catch(() => false);
    if (!ok) throw HttpError.unauthorized('Invalid credentials');

    if (res) await issueTokens(res, user, { userAgent });
    return publicUser(user);
  },

  /**
   * Rotate refresh token. The presented (hashed) token must be ACTIVE.
   * - active  → mark USED, issue a new token in the SAME family.
   * - used    → reuse ⇒ revoke the entire family (theft detection).
   * - revoked → reject.
   */
  async rotateRefresh(refreshJwt, { res, userAgent = '' } = {}) {
    const payload = verifyRefresh(refreshJwt);
    if (!payload) throw HttpError.unauthorized('Invalid refresh token');

    const record = await store.findActiveRefreshTokenByHash(hashToken(refreshJwt));
    if (!record) {
      // Possibly a reused/stolen token: revoke family defensively.
      if (payload.family) await store.revokeFamily(payload.family);
      throw HttpError.unauthorized('Refresh token not recognised (family revoked)');
    }

    const user = await store.findUserById(record.user);
    if (!user) throw HttpError.unauthorized('User not found');

    await store.markRefreshTokenUsed(record._id);
    if (res) await issueTokens(res, user, { family: record.family, userAgent });
    return publicUser(user);
  },

  async logout(refreshJwt, { res } = {}) {
    if (refreshJwt) {
      const payload = verifyRefresh(refreshJwt);
      if (payload?.family) await store.revokeFamily(payload.family);
    }
    if (res) clearAuthCookies(res);
  },

  /** OAuth/login helper used by GitHub flow. Creates/links a user. */
  async externalLogin({ provider, providerId, name, email, avatarUrl, token }, { res, userAgent = '' } = {}) {
    let user = await store.findUserByGithubId(providerId);
    if (!user) {
      user = await store.findUserByEmail(email);
      if (!user) {
        user = await store.createUser({ name, email, githubId: providerId, avatarUrl });
      }
    }
    if (res) await issueTokens(res, user, { userAgent });
    return publicUser(user);
  },
};
