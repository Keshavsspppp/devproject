import { env } from './env.js';

/**
 * Lazily-created Redis client. Returns null when REDIS_URL is not set or if
 * the connection fails — callers must always handle null by falling back to
 * an in-process strategy.
 *
 * We connect lazily (on first getRedis()) so the server can boot without
 * blocking on Redis in demo/dev setups where it isn't needed.
 */
let client = null;
let connecting = null;

export async function getRedis() {
  if (client && client.isOpen) return client;
  if (!env.redisUrl) return null;

  if (!connecting) {
    connecting = (async () => {
      try {
        // dynamic import keeps redis out of the require graph when unused
        const { createClient } = await import('redis');
        const c = createClient({
          url: env.redisUrl,
          socket: { connectTimeout: 3000 },
        });
        c.on('error', (e) => console.warn('Redis error:', e.message));
        await c.connect();
        client = c;
        console.log('✓ Redis connected');
        return c;
      } catch (e) {
        console.warn('Redis unavailable, falling back to in-process store:', e.message);
        connecting = null;
        return null;
      }
    })();
  }
  return connecting;
}
