import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';

import { env } from './config/env.js';
import { connectDB, isMemory } from './db/connect.js';
import { attachUser } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { registerSessionHandlers } from './sockets/sessionHandler.js';

import authRoutes from './routes/auth.js';
import orgRoutes from './routes/orgs.js';
import repoRoutes from './routes/repos.js';
import sessionRoutes from './routes/sessions.js';
import threadRoutes from './routes/threads.js';
import aiRoutes from './routes/ai.js';
import githubRoutes from './routes/github.js';

async function createApp() {
  await connectDB();

  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );

  // Single body parser for the whole API. For the GitHub webhook route we also
  // stash the raw body so the HMAC signature can be verified — and critically
  // we do NOT mount a second express.json on that path (a second parser would
  // consume/hang on the already-read stream). `type` lets it handle JSON only.
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        if (req.originalUrl === '/api/github/webhook') {
          req.rawBody = buf.toString('utf8');
        }
      },
    })
  );
  app.use(cookieParser());
  if (!env.isProd) app.use(morgan('dev'));

  // health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      demoMode: env.demoMode,
      store: isMemory() ? 'memory' : 'mongo',
      ai: env.ai.provider,
      github: env.github.configured,
      time: new Date().toISOString(),
    });
  });

  // routes
  app.use('/api/auth', authRoutes);
  app.use('/api/orgs', orgRoutes);
  app.use('/api/repos', repoRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/threads', threadRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/github', githubRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

async function start() {
  const app = await createApp();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: { origin: env.clientOrigin, credentials: true },
    path: '/socket.io',
  });

  const sessionApi = registerSessionHandlers(io);
  app.set('io', io);
  app.set('sessionApi', sessionApi);

  // bridge GitHub webhooks → live sessions
  app.on('github:pull_request', ({ action, pr, repo }) => {
    if (!pr || !repo) return;
    const payload = {
      action,
      number: pr.number,
      title: pr.title,
      repo: repo.full_name,
    };
    // best-effort broadcast to a global channel (sessions will filter)
    io.of('/sessions').emit('github:pull_request', payload);
    console.log(`[webhook] pull_request ${action} #${pr.number} (${repo.full_name})`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\nPort ${env.port} is already in use.\n` +
          'Stop the existing backend process, or start this server with another port:\n' +
          '  set PORT=4002 && npm run dev\n'
      );
      process.exit(1);
    }
    throw err;
  });

  server.listen(env.port, () => {
    console.log('\n┌──────────────────────────────────────────────');
    console.log('│  DevCollab API');
    console.log(`│  http://localhost:${env.port}`);
    console.log(`│  store: ${isMemory() ? 'IN-MEMORY (demo)' : 'MongoDB'}`);
    console.log(`│  ai: ${env.ai.provider}   github: ${env.github.configured ? 'on' : 'demo'}`);
    console.log('└──────────────────────────────────────────────\n');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
