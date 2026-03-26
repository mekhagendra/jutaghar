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
    minlength: 6
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
    enum: ['admin', 'manager', 'outlet', 'user'],
    default: 'user'
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
  
  refreshToken: String
}, {
  timestamps: true
});

// Index for better query performance
// Note: email already has unique index from schema definition
userSchema.index({ role: 1, status: 1 });
userSchema.index({ affiliatedBy: 1 });

const User = mongoose.model('User', userSchema);

export default User;
