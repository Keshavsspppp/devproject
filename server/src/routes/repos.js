import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { attachUser, requireAuth, resolveOrgRole } from '../middleware/auth.js';
import { store } from '../db/repo.js';
import { listPullRequests, getPullRequest, githubConfigured } from '../services/githubService.js';

const router = Router();

router.use(attachUser, requireAuth);

// list repos (optionally filtered by org)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { orgId } = req.query;
    const repos = await store.listRepos(orgId);
    res.json({ repos });
  })
);

// create a repo
router.post(
  '/',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const { orgId, name, fullName, provider = 'demo' } = req.body;
    if (!orgId || !name) throw HttpError.badRequest('orgId and name required');
    const repo = await store.createRepo({
      org: orgId,
      name,
      fullName: fullName || name,
      provider,
      createdBy: req.user._id,
    });
    res.status(201).json({ repo });
  })
);

// repo detail
router.get(
  '/:repoId',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const repo = await store.findRepoById(req.params.repoId);
    if (!repo) throw HttpError.notFound('Repo not found');
    res.json({ repo });
  })
);

// PRs for a repo (from GitHub or demo data)
router.get(
  '/:repoId/pulls',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const repo = await store.findRepoById(req.params.repoId);
    if (!repo) throw HttpError.notFound('Repo not found');
    const token = req.user.githubToken;
    const pulls = await listPullRequests(repo.fullName, token);
    res.json({ pulls, github: githubConfigured() && Boolean(token) });
  })
);

// single PR with files/diff
router.get(
  '/:repoId/pulls/:number',
  resolveOrgRole,
  asyncHandler(async (req, res) => {
    const repo = await store.findRepoById(req.params.repoId);
    if (!repo) throw HttpError.notFound('Repo not found');
    const token = req.user.githubToken;
    const pull = await getPullRequest(repo.fullName, Number(req.params.number), token);
    res.json({ pull, github: githubConfigured() && Boolean(token) });
  })
);

export default router;
