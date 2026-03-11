import mongoose from 'mongoose';
import crypto from 'crypto';

const apiClientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  clientId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  clientSecret: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scopes: [{
    type: String,
    enum: [
      'read:products',
      'write:products',
      'read:orders',
      'write:orders',
      'read:users',
      'write:users',
      'read:catalog',
      'write:catalog',
      'admin:all'
    ]
  }],
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked'],
    default: 'active'
  },
  rateLimitTier: {
    type: String,
    enum: ['basic', 'standard', 'premium', 'unlimited'],
    default: 'basic'
  },
  allowedIPs: [{
    type: String,
    trim: true
  }],
  allowedOrigins: [{
    type: String,
    trim: true
  }],
  lastUsedAt: {
    type: Date
  },
  usageCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate client credentials
apiClientSchema.statics.generateCredentials = function() {
  const clientId = 'cli_' + crypto.randomBytes(16).toString('hex');
  const clientSecret = 'sec_' + crypto.randomBytes(32).toString('hex');
  return { clientId, clientSecret };
};

// Hash client secret before saving
apiClientSchema.pre('save', async function(next) {
  if (this.isModified('clientSecret')) {
    const crypto = await import('crypto');
    this.clientSecret = crypto.createHash('sha256').update(this.clientSecret).digest('hex');
  }
  next();
});

// Method to verify client secret
apiClientSchema.methods.verifySecret = function(secret) {
  const crypto = require('crypto');
  const hashedSecret = crypto.createHash('sha256').update(secret).digest('hex');
  return this.clientSecret === hashedSecret;
};

// Index for better query performance
apiClientSchema.index({ owner: 1, status: 1 });
apiClientSchema.index({ createdAt: -1 });

const ApiClient = mongoose.model('ApiClient', apiClientSchema);

export default ApiClient;
