import mongoose from 'mongoose';

/**
 * Inline comments are attached to a line range in a file within a session.
 * A comment may be top-level or a reply (parentId set).
 */
const commentSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Location (optional: general session comments have no file/line)
    file: { type: String, default: '' },
    lineFrom: { type: Number, default: null },
    lineTo: { type: Number, default: null },
    side: { type: String, enum: ['left', 'right'], default: 'right' },
    // Content
    body: { type: String, required: true },
    // Threading
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    resolved: { type: Boolean, default: false },
    severity: { type: String, enum: ['info', 'nit', 'suggestion', 'blocking'], default: 'info' },
    // AI provenance
    source: { type: String, enum: ['human', 'ai'], default: 'human' },
    reactions: {
      type: Map,
      of: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: {},
    },
  },
  { timestamps: true }
);

commentSchema.index({ session: 1, file: 1, lineFrom: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
