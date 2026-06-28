import { verifyAccess } from '../utils/tokens.js';
import { store } from '../db/repo.js';
import { HttpError } from '../utils/HttpError.js';
import { ACCESS_COOKIE } from '../utils/tokens.js';

/**
 * Attach req.user if a valid access token is present (cookie or Bearer).
 * Does NOT fail when missing — use requireAuth for that.
 */
export async function attachUser(req, _res, next) {
  try {
    const token =
      req.cookies?.[ACCESS_COOKIE] ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);
    if (token) {
      const payload = verifyAccess(token);
      if (payload?.sub) {
        const user = await store.findUserById(payload.sub).catch(() => null);
        if (user) req.user = user;
      }
    }
  } catch (e) {
    console.error('[auth] attachUser middleware error:', e);
  }
  next();
}

export const requireAuth = (req, _res, next) => {
  if (!req.user) return next(HttpError.unauthorized('Authentication required'));
  next();
};

/**
 * Ensure the user is a member of the org referenced on the request
 * (req.params.orgId or req.body.orgId or resolved from repo/session).
 * Stashes the resolved role on req.role.
 */
export async function resolveOrgRole(req, _res, next) {
  try {
    let orgId = req.params.orgId || req.body.orgId || req.query.orgId;
    if (!orgId && req.params.repoId) {
      const repo = await store.findRepoById(req.params.repoId);
      if (repo) orgId = repo.org;
    }
    if (!orgId && req.params.sessionId) {
      const s = await store.findSessionById(req.params.sessionId);
      if (s) orgId = s.org;
    }
    if (!orgId && req.params.threadId) {
      const t = await store.findThreadById(req.params.threadId);
      if (t) orgId = t.org;
    }
    if (!orgId) return next(); // nothing to resolve

    const user = req.user;
    if (user) {
      const m = (user.memberships || []).find((mm) => String(mm.org) === String(orgId));
      req.orgId = orgId;
      req.role = m?.role || null;
    }
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Require an org role at-or-above the given level.
 * admin > reviewer > author.
 */
const RANK = { author: 1, reviewer: 2, admin: 3 };
export function requireRole(minRole) {
  return (req, _res, next) => {
    const role = req.role;
    if (!role) return next(HttpError.forbidden('You are not a member of this organisation'));
    if ((RANK[role] || 0) < (RANK[minRole] || 0)) {
      return next(HttpError.forbidden(`Requires ${minRole} role or above`));
    }
    next();
  };
}

/**
 * Require that the user is a member of the resolved org (any role).
 *
 * Runs AFTER resolveOrgRole. If no org could be resolved (e.g. the referenced
 * resource doesn't exist), we let the request through so the route handler can
 * return a 404 rather than leaking existence via a 403.
 */
export function requireMembership(req, _res, next) {
  if (!req.orgId) return next(); // unresolved → handler will 404
  if (!req.role) return next(HttpError.forbidden('You are not a member of this organisation'));
  next();
}

/** Set of org ids (as strings) the user belongs to. */
export function userOrgIds(user) {
  return new Set((user?.memberships || []).map((m) => String(m.org)));
}

