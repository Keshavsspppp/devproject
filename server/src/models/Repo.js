import mongoose from 'mongoose';

const repoSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, required: true }, // e.g. "devcollab/platform"
    provider: { type: String, enum: ['github', 'demo'], default: 'demo' },
    externalId: { type: String, default: '' }, // GitHub repo id when connected
    defaultBranch: { type: String, default: 'main' },
    // Who in the org can review this repo
    allowedRoles: {
      type: [String],
      enum: ['admin', 'reviewer', 'author'],
      default: ['admin', 'reviewer', 'author'],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

repoSchema.index({ org: 1, name: 1 }, { unique: true });

export const Repo = mongoose.model('Repo', repoSchema);
