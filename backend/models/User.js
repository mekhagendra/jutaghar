import mongoose from 'mongoose';

const affiliationSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1
  },
  commissionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, { _id: false });

const otpStateSchema = new mongoose.Schema({
  otpHash: String,
  otpExpiresAt: Date,
  pendingPassword: String,
  attempts: { type: Number, default: 0 },
  lockedUntil: { type: Date }
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    minlength: 10
  },
  fullName: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  googleId: {
    type: String,
    sparse: true
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'seller', 'customer'],
    default: 'customer'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Vendor-specific fields (for outlet role)
  businessName: String,
  businessLicense: String,
  businessAddress: String,
  taxId: String,
  
  // User affiliation data
  affiliations: [affiliationSchema],
  affiliatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Vendor request (user requests to become an outlet from profile)
  vendorRequest: {
    status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    businessName: String,
    businessAddress: String,
    taxId: String,
    requestedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: String
  },

  // Timestamps
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  emailVerified: {
    type: Boolean,
    default: true
  },
  emailVerification: otpStateSchema,
  passwordReset: otpStateSchema,
  passwordChange: otpStateSchema,

  mfa: {
    enabled: { type: Boolean, default: false },
    secret: { type: String },          // AES-256-GCM encrypted TOTP secret
    pendingSecret: { type: String },   // temporary, cleared after verification
    recoveryCodes: [{ type: String }], // bcrypt-hashed, one-time use
  },

}, {
  timestamps: true
});

// Index for better query performance
// Note: email already has unique index from schema definition
userSchema.index({ role: 1, status: 1 });
userSchema.index({ affiliatedBy: 1 });

// Backwards compatibility: silently normalize legacy role values loaded from DB
// so the rest of the codebase only deals with 'customer' / 'seller'.
function normalizeLegacyRole(doc) {
  if (!doc) return;
  if (doc.role === 'user') doc.role = 'customer';
  else if (doc.role === 'outlet') doc.role = 'seller';
}
userSchema.post('init', function () { normalizeLegacyRole(this); });
userSchema.pre('save', function (next) { normalizeLegacyRole(this); next(); });

const User = mongoose.model('User', userSchema);

export default User;
