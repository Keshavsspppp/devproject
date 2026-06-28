import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { authService, publicUser } from '../services/authService.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { REFRESH_COOKIE } from '../utils/tokens.js';
import { store } from '../db/repo.js';
import { rateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Build the limiter once at module load (async — resolved before routes mount).
// 30 auth attempts / 15 min / IP. Redis-backed when REDIS_URL is set so the
// counter is shared across all processes (PM2 cluster, multi-container…).
const authLimiter = await rateLimiter({
  points: 30,
  duration: 15 * 60,
  name: 'auth',
});

// register
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const user = await authService.register(req.body);
    const pub = await authService.login(
      { email: user.email, password: req.body.password },
      { res, userAgent: req.headers['user-agent'] }
    );
    res.status(201).json({ user: pub });
  })
);

// login
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw HttpError.badRequest('email and password required');
    const user = await authService.login(
      { email, password },
      { res, userAgent: req.headers['user-agent'] }
    );
    res.json({ user });
  })
);

// logout
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE], { res });
    res.json({ ok: true });
  })
);

// refresh (rotates token)
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refresh = req.cookies?.[REFRESH_COOKIE];
    if (!refresh) throw HttpError.unauthorized('No refresh token');
    const user = await authService.rotateRefresh(refresh, {
      res,
      userAgent: req.headers['user-agent'],
    });
    res.json({ user });
  })
);

// me
router.get('/me', attachUser, requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// demo quick-login (only meaningful in demo mode; convenience for recruiters)
router.post(
  '/demo',
  asyncHandler(async (req, res) => {
    const user = await store.findUserByEmail('demo@devcollab.dev', { withPassword: true });
    if (!user) throw HttpError.notFound('Demo user not seeded yet');
    await authService.login(
      { email: user.email, password: 'demo1234' },
      { res, userAgent: req.headers['user-agent'] }
    );
    res.json({ user: publicUser(user) });
  })
);

export default router;
