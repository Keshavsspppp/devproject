import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { streamReview, activeProvider } from '../services/aiService.js';

const router = Router();

router.use(attachUser, requireAuth);

/**
 * POST /api/ai/review  (text/event-stream)
 * Body: { code, language?, instruction?, sessionId? }
 *
 * Streams SSE events:
 *   data: {"type":"meta","provider":"...","model":"..."}
 *   data: {"type":"delta","text":"..."}
 *   data: {"type":"done"}
 *   data: {"type":"error","text":"..."}
 */
router.post(
  '/review',
  asyncHandler(async (req, res) => {
    const { code, language, instruction } = req.body;
    if (!code || !code.trim()) throw HttpError.badRequest('code is required');
    if (code.length > 8000) throw HttpError.badRequest('code too large (max 8000 chars)');

    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    // keep the connection alive between slow chunks
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);
    req.on('close', () => clearInterval(heartbeat));

    try {
      for await (const evt of streamReview({ code, language, instruction })) {
        send(evt);
        if (evt.type === 'done') break;
      }
    } catch (e) {
      send({ type: 'error', text: e.message || 'Stream failed' });
    } finally {
      res.end();
    }
  })
);

// which provider is active (for the UI badge)
router.get('/provider', (req, res) => {
  res.json({ provider: activeProvider() });
});

export default router;
