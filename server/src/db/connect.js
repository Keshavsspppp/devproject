import mongoose from 'mongoose';
import { env } from '../config/env.js';

// disconnected | connecting | connected | fallback
// `fallback` ⇒ use memory store permanently for this process.
// Anything other than `connected` ⇒ also use memory store, so requests that
// arrive DURING the Mongo retry window never hang in Mongoose's command buffer.
let state = 'disconnected';

export const dbState = () => state;
/** True when we should serve reads/writes from the in-memory store. */
export const isMemory = () => state !== 'connected';
/** Memory or real Mongo is active and ready. */
export const isReady = () => state === 'connected' || state === 'fallback';
/** Mongo specifically won the race and is live. */
export const isMongo = () => state === 'connected';

/**
 * Connect to MongoDB with retries. If DEMO_MODE is on and every attempt
 * fails, we transparently fall back to the in-memory store so the app
 * still runs end-to-end (clearly logged).
 */
export async function connectDB() {
  if (env.demoMode === false) {
    // Real deployment: hard fail if Mongo is unreachable.
    await tryConnect(1);
    state = 'connected';
    return;
  }

  // Demo mode: try Mongo a few times, then fall back to in-memory.
  const ok = await tryConnect(3, 1000);
  if (ok) {
    state = 'connected';
    return;
  }
  console.warn(
    '\n⚠️  MongoDB not reachable after retries. DEMO_MODE=true → switching to the\n' +
      '   in-memory store. Data will NOT persist across restarts.\n' +
      '   To use real MongoDB: start `mongod` or set MONGO_URI to an Atlas URI.\n'
  );
  state = 'fallback';
}

async function tryConnect(attempts, baseDelay = 500) {
  // Fail fast on any command issued before connect resolves, instead of
  // buffering for 10s — this is what keeps a misconfigured Mongo from hanging
  // every request when we accidentally route to mongoStore.
  mongoose.set('bufferCommands', false);

  for (let i = 1; i <= attempts; i++) {
    try {
      await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 3000,
        bufferCommands: false,
      });
      console.log('✓ MongoDB connected');
      // If Mongo drops after a successful connect, fall back to memory so the
      // app keeps serving instead of erroring every request.
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected → switching to in-memory store');
        state = 'fallback';
      });
      return true;
    } catch (err) {
      console.warn(`Mongo attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) await sleep(baseDelay * i);
    }
  }
  return false;
}

export async function closeDB() {
  if (state === 'connected') await mongoose.disconnect();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
