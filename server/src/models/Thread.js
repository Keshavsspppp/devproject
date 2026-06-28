import mongoose from 'mongoose';

/**
 * Async discussion threads — persist beyond the live session.
 * A thread is anchored to a repo and (optionally) a session + file/line.
 */
const replySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    source: { type: String, enum: ['human', 'ai'], default: 'human' },
  },
  { timestamps: true }
);

const threadSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    repo: { type: mongoose.Schema.Types.ObjectId, ref: 'Repo', required: true, index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file: { type: String, default: '' },
    line: { type: Number, default: null },
    tags: [{ type: String }],
    status: { type: String, enum: ['open', 'resolved', 'wontfix'], default: 'open' },
    replies: [replySchema],
  },
  { timestamps: true }
);

threadSchema.virtual('replyCount').get(function () {
  return this.replies?.length || 0;
});

export const Thread = mongoose.model('Thread', threadSchema);
