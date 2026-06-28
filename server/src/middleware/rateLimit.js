import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { getRedis } from '../config/redis.js';

/**
 * Rate limiting that works across multiple processes.
 *
 * - REDIS_URL set + Redis reachable  → RateLimiterRedis (shared counter).
 * - otherwise                         → RateLimiterMemory (per-process).
 *
 * `rate-limiter-flexible` ships both strategies behind the same API, so the
 * middleware logic is identical either way. Returns Express middleware.
 *
 *   const limiter = await rateLimiter({ points: 30, duration: 900 });
 *   router.post('/login', limiter, handler);
 */
export async function rateLimiter({ points = 30, duration = 900, name = 'api' } = {}) {
  const redis = await getRedis();
  let limiter;

  if (redis) {
    limiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rl:${name}`,
      points,
      duration,
      useRedisPackage: true,
    });
  } else {
    console.warn(
      `[rate-limit] "${name}" using in-process memory. Set REDIS_URL for multi-process safety.`
    );
    limiter = new RateLimiterMemory({ points, duration, keyPrefix: `rl:${name}` });
  }

  return async function rateLimitMiddleware(req, res, next) {
    try {
      const info = await limiter.consume(req.ip);
      res.set('RateLimit-Limit', String(points));
      res.set('RateLimit-Remaining', String(info.remainingPoints));
      res.set('RateLimit-Reset', String(Math.ceil(info.msBeforeNext / 1000)));
      next();
    } catch (rej) {
      const retry = Math.ceil((rej?.msBeforeNext || 1000) / 1000);
      res.set('Retry-After', String(retry));
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
  };
}
