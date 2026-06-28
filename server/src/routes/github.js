import { Router } from 'express';
import crypto, { randomBytes } from 'crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import {
  oauthAuthorizeUrl,
  exchangeCodeForToken,
  verifyWebhookSignature,
  githubConfigured,
} from '../services/githubService.js';
import { authService } from '../services/authService.js';
import { store } from '../db/repo.js';
import { env } from '../config/env.js';

const router = Router();

// Cookie name for the OAuth state anti-CSRF token. Short-lived, HttpOnly so it
// can't be read by JS, SameSite=Lax so it rides along the top-level redirect.
const STATE_COOKIE = 'gh_oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const stateCookieOpts = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.jwt.cookieSecure,
  maxAge: STATE_TTL_MS,
  path: '/',
});

function clearStateCookie(res) {
  res.clearCookie(STATE_COOKIE, { ...stateCookieOpts(), maxAge: undefined });
}

// begin OAuth: mint + persist a high-entropy state token, then return the URL.
router.get(
  '/connect',
  attachUser,
  requireAuth,
  (req, res) => {
    // Embed user fingerprint in state value
    const state = `${randomBytes(24).toString('hex')}.${req.user._id}`;
    res.cookie(STATE_COOKIE, state, stateCookieOpts());
    res.json({ authorizeUrl: oauthAuthorizeUrl(state), state });
  }
);

// OAuth callback → verify state (CSRF) → exchange code → upsert user →
// persist GitHub token → set auth cookies → redirect to client.
router.get(
  '/callback',
  attachUser,
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    // ── CSRF: state must match the cookie we set on /connect ──────────
    const cookieState = req.cookies?.[STATE_COOKIE];
    clearStateCookie(res); // single-use, regardless of outcome
    if (error) throw HttpError.badRequest(`OAuth error: ${error}`);
    if (!code) throw HttpError.badRequest('Missing code');

    if (!cookieState || !state || !timingSafeEqual(cookieState, state)) {
      throw HttpError.badRequest('Invalid OAuth state (possible CSRF attempt)');
    }

    // Verify user ID fingerprint in the state to ensure the callback session
    // belongs to the same user who initiated /connect.
    const parts = String(state).split('.');
    const stateUserId = parts[1];
    if (!stateUserId || !req.user || String(req.user._id) !== stateUserId) {
      throw HttpError.forbidden('OAuth state does not match the current session');
    }

    const token = await exchangeCodeForToken(code);

    // fetch the GitHub user profile
    const resp = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    const gh = await resp.json();

    const user = await authService.externalLogin(
      {
        provider: 'github',
        providerId: String(gh.id),
        name: gh.name || gh.login,
        email: gh.email || `${gh.login}@users.noreply.github.com`,
        avatarUrl: gh.avatar_url,
      },
      { res, userAgent: req.headers['user-agent'] }
    );

    // persist the GitHub access token onto the user record (for PR fetches)
    await store.updateUser(user._id, { githubToken: token, githubId: String(gh.id) });

    res.redirect(`${env.clientOrigin}/oauth/redirect?ok=1`);
  })
);

/** Constant-time string comparison to avoid leaking length/prefix info. */
function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    // still do a comparison to keep timing roughly uniform
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * GitHub webhook receiver.
 * Verifies the HMAC signature (when a secret is configured) and routes
 * `pull_request` events. The socket layer is wired from server.js via the
 * event emitter so live sessions can refresh on push.
 *
 * Body must be raw for signature verification — registered with a verify
 * callback in server.js.
 */
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const sig = req.get('x-hub-signature-256');
    const event = req.get('x-github-event');
    if (env.github.webhookSecret && !verifyWebhookSignature(req.rawBody || '', sig)) {
      throw HttpError.unauthorized('Invalid signature');
    }
    if (event === 'pull_request') {
      const action = req.body.action;
      const pr = req.body.pull_request;
      // surface to socket layer
      req.app.emit('github:pull_request', { action, pr, repo: req.body.repository });
    }
    res.json({ received: true, event });
  })
);

router.get('/status', (req, res) => {
  res.json({ configured: githubConfigured() });
});

export default router;
