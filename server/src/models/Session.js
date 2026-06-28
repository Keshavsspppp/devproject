import mongoose from 'mongoose';

/**
 * A live review session is bound to a repo + (optionally) a PR.
 * Participants are reviewers/authors who join the real-time room.
 */
const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['reviewer', 'author', 'observer'], default: 'reviewer' },
    joinedAt: { type: Date, default: Date.now },
    cursor: {
      file: { type: String, default: '' },
      line: { type: Number, default: 0 },
      col: { type: Number, default: 0 },
    },
    color: { type: String, default: '' },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    repo: { type: mongoose.Schema.Types.ObjectId, ref: 'Repo', required: true, index: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active', index: true },
    // PR linkage (optional)
    pullNumber: { type: Number, default: null },
    pullTitle: { type: String, default: '' },
    headSha: { type: String, default: '' },
    baseSha: { type: String, default: '' },
    // Snapshot of files/diff reviewed in this session
    files: [
      {
        path: { type: String, required: true },
        status: { type: String, default: 'modified' },
        additions: { type: Number, default: 0 },
        deletions: { type: Number, default: 0 },
        patch: { type: String, default: '' }, // unified diff text
      },
    ],
    participants: [participantSchema],
    summary: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

sessionSchema.virtual('id').get(function () {
  return this._id.toString();
});

export const Session = mongoose.model('Session', sessionSchema);
