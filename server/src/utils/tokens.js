import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import { env } from '../config/env.js';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

export const signAccess = (user) =>
  jwt.sign({ sub: String(user._id), email: user.email, name: user.name }, env.jwt.secret, {
    expiresIn: env.jwt.accessTtl,
  });

/** Refresh token carries an opaque id; only its HASH is ever stored. */
export const signRefresh = (user, family = randomUUID()) => {
  const tokenId = randomUUID();
  const token = jwt.sign({ jti: tokenId, sub: String(user._id), family }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  });
  return { token, family, tokenId };
};

export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export const verifyAccess = (token) => {
  try {
    return jwt.verify(token, env.jwt.secret);
  } catch {
    return null;
  }
};

export const verifyRefresh = (token) => {
  try {
    return jwt.verify(token, env.jwt.refreshSecret);
  } catch {
    return null;
  }
};

export const cookieOpts = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.jwt.cookieSecure,
  path: '/',
});

export function setAuthCookies(res, { access, refresh }) {
  const opts = cookieOpts();
  res.cookie(ACCESS_COOKIE, access, { ...opts, maxAge: ms(env.jwt.accessTtl) });
  res.cookie(REFRESH_COOKIE, refresh, { ...opts, maxAge: ms(env.jwt.refreshTtl) });
}

export function clearAuthCookies(res) {
  const opts = cookieOpts();
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}

export { ACCESS_COOKIE, REFRESH_COOKIE };

// crude "15m" → ms
function ms(ttl) {
  const m = /^(\d+)([smhd])$/.exec(String(ttl));
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
  return n * unit;
}
