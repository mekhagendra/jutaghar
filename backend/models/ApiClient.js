import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

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

// Hash client secret before saving (bcrypt, work-factor 12)
apiClientSchema.pre('save', async function(next) {
  if (this.isModified('clientSecret')) {
    this.clientSecret = await bcrypt.hash(this.clientSecret, 12);
  }
  next();
});

// Timing-safe secret verification via bcrypt.compare
apiClientSchema.methods.verifySecret = async function(secret) {
  return bcrypt.compare(secret, this.clientSecret);
};

// Index for better query performance
apiClientSchema.index({ owner: 1, status: 1 });
apiClientSchema.index({ createdAt: -1 });

const ApiClient = mongoose.model('ApiClient', apiClientSchema);

export default ApiClient;
