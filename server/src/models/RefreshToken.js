import mongoose from 'mongoose';

/**
 * Stored refresh tokens: hashed. Supports rotation + family revocation.
 * On refresh, the presented token must be ACTIVE. After use it becomes USED
 * and a new token in the same family is issued. Reuse of a USED token ⇒ the
 * whole family is revoked (refresh-token-theft mitigation).
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    family: { type: String, required: true, index: true },
    hash: { type: String, required: true, index: true },
    status: { type: String, enum: ['active', 'used', 'revoked'], default: 'active', index: true },
    userAgent: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
