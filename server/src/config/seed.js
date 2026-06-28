/**
 * Seed script: idempotent. Works against Mongo (when available) so the app
 * has a real demo dataset. In in-memory mode the store self-seeds on boot.
 *
 *   node src/config/seed.js
 */
import argon2 from 'argon2';
import { connectDB, isMemory, closeDB } from '../db/connect.js';
import { store } from '../db/repo.js';
import { User } from '../models/User.js';
import { Org } from '../models/Org.js';
import { Repo } from '../models/Repo.js';
import { Session } from '../models/Session.js';
import {
  DEMO_USER,
  SECONDARY_USERS,
  DEMO_ORG,
  DEMO_REPO,
  DEMO_SESSION,
} from '../db/demoData.js';

async function seedMongo() {
  const existing = await User.findOne({ email: DEMO_USER.email });
  if (existing) {
    console.log('✓ Demo data already present. Skipping seed.');
    return;
  }
  const owner = await User.create({
    _id: DEMO_USER._id,
    name: DEMO_USER.name,
    email: DEMO_USER.email,
    password: await argon2.hash(DEMO_USER.passwordPlain),
    avatarUrl: DEMO_USER.avatarUrl,
    isDemo: true,
  });
  const others = await Promise.all(
    SECONDARY_USERS.map(async (u) =>
      User.create({
        _id: u._id,
        name: u.name,
        email: u.email,
        password: await argon2.hash(u.passwordPlain),
      })
    )
  );

  const org = await Org.create({
    _id: DEMO_ORG._id,
    name: DEMO_ORG.name,
    slug: DEMO_ORG.slug,
    owner: owner._id,
    members: [
      { user: owner._id, role: 'admin' },
      { user: others[0]._id, role: 'reviewer' },
      { user: others[1]._id, role: 'author' },
    ],
  });
  for (const [u, role] of [
    [owner, 'admin'],
    [others[0], 'reviewer'],
    [others[1], 'author'],
  ]) {
    await User.updateOne({ _id: u._id }, { $addToSet: { memberships: { org: org._id, role } } });
  }

  const repo = await Repo.create({
    _id: DEMO_REPO._id,
    org: org._id,
    name: DEMO_REPO.name,
    fullName: DEMO_REPO.fullName,
    provider: 'demo',
    defaultBranch: DEMO_REPO.defaultBranch,
    allowedRoles: DEMO_REPO.allowedRoles,
    createdBy: owner._id,
  });

  await Session.create({
    _id: DEMO_SESSION._id,
    org: org._id,
    repo: repo._id,
    title: DEMO_SESSION.title,
    status: 'active',
    pullNumber: DEMO_SESSION.pullNumber,
    pullTitle: DEMO_SESSION.pullTitle,
    headSha: DEMO_SESSION.headSha,
    baseSha: DEMO_SESSION.baseSha,
    files: DEMO_SESSION.files,
    participants: [],
    createdBy: owner._id,
  });

  console.log('✓ Seeded demo data into MongoDB.');
  console.log(`  Login: ${DEMO_USER.email} / ${DEMO_USER.passwordPlain}`);
}

async function main() {
  await connectDB();
  if (isMemory()) {
    // force lazy seeding
    await store.listOrgsForUser(DEMO_USER._id).catch(() => null);
    console.log('✓ In-memory store is self-seeded (no Mongo needed). Nothing to persist.');
    return;
  }
  await seedMongo();
  await closeDB();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
