import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { attachUser, requireAuth, resolveOrgRole } from '../middleware/auth.js';
import { store } from '../db/repo.js';

const router = Router();

router.use(attachUser, requireAuth);

// list sessions (filter by org/repo/status)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { orgId, repoId, status } = req.query;
    const sessions = await store.listSessions({ orgId, repoId, status });
    res.json({ sessions });
  })
);

// get one session (with participants + files)
router.get(
  '/:sessionId',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const s = await store.findSessionById(req.params.sessionId);
    if (!s) throw HttpError.notFound('Session not found');
    res.json({ session: s });
  })
);

// create a session (optionally seeded from a PR)
router.post(
  '/',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const { orgId, repoId, title, pullNumber, pullTitle, headSha, baseSha, files } = req.body;
    if (!orgId || !repoId || !title) throw HttpError.badRequest('orgId, repoId, title required');
    const session = await store.createSession({
      org: orgId,
      repo: repoId,
      title,
      pullNumber,
      pullTitle,
      headSha,
      baseSha,
      files: files || [],
      createdBy: req.user._id,
    });
    res.status(201).json({ session });
  })
);

// join / update status / set summary
router.patch(
  '/:sessionId',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const { status, summary } = req.body;
    const patch = {};
    if (status) patch.status = status;
    if (summary !== undefined) patch.summary = summary;
    const session = await store.updateSession(req.params.sessionId, patch);
    if (!session) throw HttpError.notFound('Session not found');
    res.json({ session });
  })
);

// comments for a session
router.get(
  '/:sessionId/comments',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const comments = await store.listComments(req.params.sessionId);
    res.json({ comments });
  })
);

// create a comment (also broadcast via sockets — handled in socket layer)
router.post(
  '/:sessionId/comments',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const { body, file, lineFrom, lineTo, side, parent, severity, source } = req.body;
    if (!body) throw HttpError.badRequest('body required');
    const comment = await store.createComment({
      session: req.params.sessionId,
      author: req.user._id,
      body,
      file,
      lineFrom,
      lineTo,
      side: side || 'right',
      parent,
      severity: severity || 'info',
      source: source || 'human',
    });
    // Persist the comment. The client will handle broadcasting to other live
    // collaborators over the socket after this REST call succeeds, preventing
    // a duplicate database write.
    res.status(201).json({ comment });
  })
);

// update a comment (resolve / edit)
router.patch(
  '/:sessionId/comments/:commentId',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const { sessionId, commentId } = req.params;
    const { body, resolved, severity } = req.body;

    const comment = await store.findCommentById(commentId).catch(() => null);
    if (!comment) throw HttpError.notFound('Comment not found');

    // Auth check: only author or admin
    const userId = req.user._id;
    const isAuthor = String(comment.author._id || comment.author) === String(userId);
    let isAdmin = false;
    if (!isAuthor) {
      const session = await store.findSessionById(sessionId).catch(() => null);
      if (session?.org) {
        const m = (req.user?.memberships || []).find((mm) => String(mm.org) === String(session.org));
        isAdmin = m?.role === 'admin';
      }
    }

    if (!isAuthor && !isAdmin) {
      throw HttpError.forbidden('Only the author or an admin may update this comment');
    }

    const patch = {};
    if (body !== undefined) patch.body = body;
    if (resolved !== undefined) patch.resolved = resolved;
    if (severity !== undefined) patch.severity = severity;

    const updated = await store.updateComment(commentId, patch);
    if (!updated) throw HttpError.notFound('Failed to update comment');

    // Broadcast updated comment via socket so live clients sync
    const io = req.app.get('io');
    if (!io) {
      console.warn('[sessions] io not available — comment:update not broadcast');
    }
    io?.of('/sessions').to(sessionId).emit('comment:update', updated);

    res.json({ comment: updated });
  })
);

export default router;
