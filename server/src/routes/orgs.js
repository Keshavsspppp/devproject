import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { attachUser, requireAuth, resolveOrgRole, requireRole } from '../middleware/auth.js';
import { store } from '../db/repo.js';

const router = Router();

router.use(attachUser, requireAuth);

// list orgs the user belongs to
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orgs = await store.listOrgsForUser(req.user._id);
    res.json({ orgs });
  })
);

// create org (caller becomes admin)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, slug } = req.body;
    if (!name || !slug) throw HttpError.badRequest('name and slug required');
    const existing = await store.findOrgBySlug(slug);
    if (existing) throw HttpError.conflict('slug already taken');
    const org = await store.createOrg({ name, slug, owner: req.user._id });
    res.status(201).json({ org });
  })
);

// get one org
router.get(
  '/:orgId',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const org = await store.findOrgById(req.params.orgId);
    if (!org) throw HttpError.notFound('Org not found');
    res.json({ org, yourRole: req.role });
  })
);

// add member (admin only)
router.post(
  '/:orgId/members',
  resolveOrgRole,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { email, role = 'author' } = req.body;
    const user = await store.findUserByEmail(email);
    if (!user) throw HttpError.notFound('User not found');
    const org = await store.addOrgMember(req.params.orgId, user._id, role);
    res.json({ org });
  })
);

export default router;
