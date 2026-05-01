import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  variant: {
    color: String,
    size: String,
    sku: String
  }
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  country: String
}, { _id: false });

const returnRequestItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  variant: {
    color: String,
    size: String,
    sku: String,
  },
}, { _id: false });

const returnRequestSchema = new mongoose.Schema({
  items: {
    type: [returnRequestItemSchema],
    default: [],
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  images: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['requested', 'initiated', 'returned', 'completed', 'rejected', 'approved'],
    default: 'requested',
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: Date,
  reviewNote: {
    type: String,
    trim: true,
    default: '',
  },
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'returned', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['esewa', 'khalti', 'cash_on_delivery'],
    required: true
  },
  shippingAddress: shippingAddressSchema,
  notes: String,
  trackingNumber: String,
  cancelReason: String,
  shippedAt: Date,
  deliveredAt: Date,
  returnedAt: Date,
  cancelledAt: Date,
  gatewayTransactionId: {
    type: String,
    default: undefined
  },
  gatewayPidx: {
    type: String,
    default: undefined
  },
  returnRequests: {
    type: [returnRequestSchema],
    default: [],
  },
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `JG${year}${month}${day}${random}`;
  }
  next();
});

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
// Note: orderNumber already has unique index from schema definition
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.vendor': 1 });
orderSchema.index(
  { gatewayTransactionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      gatewayTransactionId: { $type: 'string' },
    },
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
