/**
 * Unified repository layer.
 *
 * The whole REST/WS layer talks ONLY to `store`, never directly to Mongoose.
 * `store` resolves to either:
 *   - the Mongoose-backed implementation (when Mongo is reachable), or
 *   - the in-memory implementation (DEMO_MODE fallback, or when Mongo is down).
 *
 * NOTE: resolution must happen LAZILY — at module load time `connectDB()` may
 * not have run yet (or may still be retrying Mongo), so `isMemory()` reads as
 * false even when we'll later fall back. We proxy so every call re-resolves.
 *
 * This is what lets DevCollab run end-to-end with zero infrastructure.
 */
import { isMemory } from './connect.js';
import { mongoStore } from './mongoStore.js';
import { memoryStore } from './memoryStore.js';

const backend = () => (isMemory() ? memoryStore : mongoStore);

export const store = new Proxy(
  {},
  {
    get(_target, prop) {
      const target = backend();
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }
);

export const usingMemory = () => isMemory();
