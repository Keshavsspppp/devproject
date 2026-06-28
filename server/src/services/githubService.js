import crypto from 'crypto';
import { env } from '../config/env.js';
import { DEMO_PR } from '../db/demoData.js';

/**
 * GitHub integration.
 *
 * - OAuth code→token exchange.
 * - Fetch open PRs + a single PR diff (files/patch).
 * - Webhook verification (HMAC) + event → session update.
 *
 * When GitHub credentials are absent, falls back to DEMO data so the UI
 * is fully functional for a 2-minute demo.
 */

const API = 'https://api.github.com';

export const githubConfigured = () => env.github.configured;

export function oauthAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: env.github.clientId || 'demo',
    scope: 'repo read:org',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(code) {
  if (!githubConfigured()) {
    throw new Error('GitHub OAuth not configured (set GITHUB_CLIENT_ID/SECRET)');
  }
  const resp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.github.clientId,
      client_secret: env.github.clientSecret,
      code,
    }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token;
}

async function gh(path, token) {
  const resp = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!resp.ok) throw new Error(`GitHub API ${resp.status} for ${path}`);
  return resp.json();
}

/** Fetch up to 30 open PRs for a repo (fullName e.g. "owner/name"). */
export async function listPullRequests(fullName, token) {
  if (!githubConfigured() || !token) return demoPulls();
  const prs = await gh(`/repos/${fullName}/pulls?state=open&per_page=30`, token);
  return prs.map(normalizePr);
}

export async function getPullRequest(fullName, number, token) {
  if (!githubConfigured() || !token) return demoPull(number);
  const [pr, files] = await Promise.all([
    gh(`/repos/${fullName}/pulls/${number}`, token),
    gh(`/repos/${fullName}/pulls/${number}/files`, token),
  ]);
  const n = normalizePr(pr);
  n.files = files.map((f) => ({
    path: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch || '',
  }));
  return n;
}

export function normalizePr(pr) {
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: pr.draft,
    author: pr.user?.login,
    head: pr.head?.ref,
    base: pr.base?.ref,
    headSha: pr.head?.sha,
    baseSha: pr.base?.sha,
    url: pr.html_url,
    additions: pr.additions,
    deletions: pr.deletions,
    updatedAt: pr.updated_at,
  };
}

/** Verify a GitHub webhook signature (HMAC SHA-256). */
export function verifyWebhookSignature(rawBody, signature) {
  if (!env.github.webhookSecret || !signature) return true; // not enforced in demo
  const expected =
    'sha256=' + crypto.createHmac('sha256', env.github.webhookSecret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  // timingSafeEqual throws on length mismatch — guard so a malformed header
  // is rejected cleanly instead of crashing the request.
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

// ── Demo data fallbacks ────────────────────────────────────────────
function demoPulls() {
  return [
    demoPull(DEMO_PR.number),
    {
      number: 41,
      title: 'Add request rate limiting to /auth routes',
      state: 'open',
      draft: false,
      author: 'grace',
      head: 'feat/rate-limit',
      base: 'main',
      headSha: '112233445566',
      baseSha: '998877665544',
      url: '#',
      additions: 24,
      deletions: 1,
      updatedAt: new Date().toISOString(),
    },
    {
      number: 39,
      title: 'WebSocket reconnect with exponential backoff',
      state: 'open',
      draft: true,
      author: 'linus',
      head: 'feat/ws-reconnect',
      base: 'main',
      headSha: '665544332211',
      baseSha: '998877665544',
      url: '#',
      additions: 67,
      deletions: 12,
      updatedAt: new Date().toISOString(),
    },
  ];
}

function demoPull(number) {
  if (number !== DEMO_PR.number) {
    return {
      number,
      title: `Demo PR #${number}`,
      state: 'open',
      draft: false,
      author: 'demo',
      head: 'demo-' + number,
      base: 'main',
      headSha: 'deadbeef' + number,
      baseSha: '998877665544',
      url: '#',
      additions: 10,
      deletions: 4,
      updatedAt: new Date().toISOString(),
      files: [],
    };
  }
  return {
    number: DEMO_PR.number,
    title: DEMO_PR.title,
    state: 'open',
    draft: false,
    author: 'linus',
    head: DEMO_PR.head,
    base: DEMO_PR.base,
    headSha: DEMO_PR.headSha,
    baseSha: DEMO_PR.baseSha,
    url: '#',
    additions: 8,
    deletions: 3,
    updatedAt: new Date().toISOString(),
    files: DEMO_PR.files,
  };
}
