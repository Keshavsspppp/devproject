import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { attachUser, requireAuth, resolveOrgRole } from '../middleware/auth.js';
import { store } from '../db/repo.js';

const router = Router();

router.use(attachUser, requireAuth);

// list threads
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { orgId, repoId, sessionId, status } = req.query;
    const threads = await store.listThreads({ orgId, repoId, sessionId, status });
    res.json({ threads });
  })
);

// get one thread
router.get(
  '/:threadId',
  asyncHandler(async (req, res) => {
    const t = await store.findThreadById(req.params.threadId);
    if (!t) throw HttpError.notFound('Thread not found');
    res.json({ thread: t });
  })
);

// create thread
router.post(
  '/',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const { orgId, repoId, sessionId, title, body, file, line, tags } = req.body;
    if (!orgId || !repoId || !title) throw HttpError.badRequest('orgId, repoId, title required');
    const thread = await store.createThread({
      org: orgId,
      repo: repoId,
      session: sessionId,
      title,
      body,
      file,
      line,
      tags,
      author: req.user._id,
    });
    res.status(201).json({ thread });
  })
);

// reply
router.post(
  '/:threadId/replies',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const { body, source = 'human' } = req.body;
    if (!body) throw HttpError.badRequest('body required');
    const thread = await store.addReply(req.params.threadId, {
      author: req.user._id,
      body,
      source,
    });
    if (!thread) throw HttpError.notFound('Thread not found');
    res.status(201).json({ thread });
  })
);

// change status
router.patch(
  '/:threadId',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const thread = await store.setThreadStatus(req.params.threadId, status);
    if (!thread) throw HttpError.notFound('Thread not found');
    res.json({ thread });
  })
);

export default router;
