/**
 * Demo content shared by the in-memory store and the seed script.
 * One demo user, one org, one repo, one PR, one review session.
 */

export const DEMO_USER = {
  _id: '665000000000000000000001',
  name: 'Ada Demo',
  email: 'demo@devcollab.dev',
  passwordPlain: 'demo1234',
  avatarUrl: '',
  isDemo: true,
};

export const SECONDARY_USERS = [
  {
    _id: '665000000000000000000002',
    name: 'Grace Reviewer',
    email: 'grace@devcollab.dev',
    passwordPlain: 'demo1234',
    avatarUrl: '',
  },
  {
    _id: '665000000000000000000003',
    name: 'Linus Author',
    email: 'linus@devcollab.dev',
    passwordPlain: 'demo1234',
    avatarUrl: '',
  },
];

export const DEMO_ORG = {
  _id: '665000000000000000000010',
  name: 'DevCollab HQ',
  slug: 'devcollab',
};

export const DEMO_REPO = {
  _id: '665000000000000000000020',
  orgId: DEMO_ORG._id,
  name: 'platform',
  fullName: 'devcollab/platform',
  provider: 'demo',
  defaultBranch: 'main',
  allowedRoles: ['admin', 'reviewer', 'author'],
};

// A realistic-ish unified diff for the diff viewer demo.
const AUTH_PATCH = `@@ -12,9 +12,14 @@ export async function login(req, res) {
   const { email, password } = req.body;
-  const user = await User.findOne({ email });
-  if (!user) return res.status(401).json({ error: 'invalid credentials' });
+  const user = await User.findOne({ email }).select('+password');
+  if (!user || !user.password) {
+    // constant-time-ish: still hash something to blunt timing attacks
+    await argon2.hash('x');
+    return res.status(401).json({ error: 'invalid credentials' });
+  }
-  const ok = await bcrypt.compare(password, user.password);
+  const ok = await argon2.verify(user.password, password);
   if (!ok) return res.status(401).json({ error: 'invalid credentials' });
   return issueTokens(res, user);
 }`;

export const DEMO_PR = {
  number: 42,
  title: 'Switch login hashing from bcrypt to argon2',
  state: 'open',
  author: 'linus',
  head: 'feat/argon2-login',
  base: 'main',
  headSha: 'a1b2c3d4e5f6',
  baseSha: '998877665544',
  files: [
    {
      path: 'server/src/routes/auth.js',
      status: 'modified',
      additions: 8,
      deletions: 3,
      patch: AUTH_PATCH,
    },
  ],
};

export const DEMO_SESSION = {
  _id: '665000000000000000000030',
  orgId: DEMO_ORG._id,
  repoId: DEMO_REPO._id,
  title: 'Review: argon2 migration',
  status: 'active',
  pullNumber: DEMO_PR.number,
  pullTitle: DEMO_PR.title,
  headSha: DEMO_PR.headSha,
  baseSha: DEMO_PR.baseSha,
  files: DEMO_PR.files,
  participants: [],
  createdBy: DEMO_USER._id,
};
