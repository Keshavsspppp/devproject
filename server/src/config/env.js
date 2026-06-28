import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: resolve(serverRoot, '.env') });

const bool = (v, def = false) => {
  if (v === undefined || v === '') return def;
  return String(v).toLowerCase() === 'true';
};

const isProd = (process.env.NODE_ENV || 'development').trim() === 'production';

export const env = {
  nodeEnv: (process.env.NODE_ENV || 'development').trim(),
  isProd,
  port: Number(process.env.PORT) || 4001,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  demoMode: bool(process.env.DEMO_MODE, true),

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devcollab',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    cookieSecure: bool(process.env.COOKIE_SECURE, isProd),
  },

  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    configured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  },

  ai: {
    // provider: mock | gemini | groq
    provider: (process.env.AI_PROVIDER || 'mock').toLowerCase(),
    geminiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    groqKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },

  redisUrl: process.env.REDIS_URL || '',
};

export const isAiConfigured = () => {
  const { provider } = env.ai;
  if (provider === 'mock') return true;
  if (provider === 'gemini') return Boolean(env.ai.geminiKey);
  if (provider === 'groq') return Boolean(env.ai.groqKey);
  return false;
};

if (env.isProd) {
  if (env.jwt.secret === 'dev-secret-change-me') {
    throw new Error('PRODUCTION SECURITY ERROR: JWT_SECRET must be configured and cannot use default value in production environment.');
  }
  if (env.jwt.refreshSecret === 'dev-refresh-secret-change-me') {
    throw new Error('PRODUCTION SECURITY ERROR: JWT_REFRESH_SECRET must be configured and cannot use default value in production environment.');
  }
}
