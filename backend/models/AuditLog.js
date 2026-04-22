import mongoose from 'mongoose';

const AUDIT_ACTIONS = [
  'AUTH_LOGIN_SUCCESS',
  'AUTH_LOGIN_FAILED',
  'AUTH_VENDOR_REQUEST_APPROVED',
  'AUTH_VENDOR_REQUEST_REJECTED',
  'AUTH_FORGOT_PASSWORD_OTP_REQUESTED',
  'AUTH_FORGOT_PASSWORD_RESET_VERIFIED',
  'AUTH_ACCOUNT_DELETED',
  'ADMIN_USER_STATUS_UPDATED',
  'ADMIN_USER_ROLE_UPDATED',
  'ADMIN_VENDOR_APPROVED',
  'ADMIN_VENDOR_REJECTED',
  'PAYMENT_ORDER_INITIATED',
  'PAYMENT_ESEWA_VERIFIED',
  'PAYMENT_KHALTI_VERIFIED',
  'API_CLIENT_CREATED',
  'API_CLIENT_DELETED',
  'API_CLIENT_SECRET_REGENERATED',
  'API_CLIENT_REVOKED'
];

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: String,
      required: true,
      default: 'system',
      index: true,
    },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      index: true,
    },
    target: {
      type: String,
      required: true,
      trim: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export { AUDIT_ACTIONS };
export default AuditLog;
