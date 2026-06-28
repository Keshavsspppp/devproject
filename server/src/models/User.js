import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
    role: {
      type: String,
      enum: ['admin', 'reviewer', 'author'],
      default: 'author',
    },
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, select: false }, // argon2 hash; absent for OAuth-only users
    avatarUrl: { type: String, default: '' },
    memberships: [membershipSchema],
    githubId: { type: String, sparse: true, index: true },
    githubToken: { type: String, select: false },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.method('roleIn', function (orgId) {
  const id = String(orgId);
  const m = this.memberships.find((mm) => String(mm.org) === id);
  return m?.role || null;
});

export const User = mongoose.model('User', userSchema);
