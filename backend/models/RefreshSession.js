import mongoose from 'mongoose';
import crypto from 'crypto';

const refreshSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  hashedToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deviceId: { type: String },
  userAgent: { type: String },
  ip: { type: String },
  lastUsedAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
  // Points to the session that replaced this one (for rotation chain)
  replacedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RefreshSession',
    default: null
  }
}, {
  timestamps: true
});

/**
 * Hash a raw refresh token string for storage.
 * Uses SHA-256; the token itself carries a random jti so this is secure.
 */
refreshSessionSchema.statics.hashToken = function(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

const RefreshSession = mongoose.model('RefreshSession', refreshSessionSchema);

export default RefreshSession;
