import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  sku: {
    type: String,
    trim: true,
    uppercase: true,
  },
  compareAtPrice: {
    type: Number,
    min: 0
  },
  onSale: {
    type: Boolean,
    default: false
  },
  salePrice: {
    type: Number,
    min: 0
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand'
  },
  gender: {
    type: String,
    enum: ['Men', 'Women', 'Kids', 'Unisex'],
    default: 'Unisex'
  },
  stock: {
    required: true,
    type: Number,
    default: 0,
    min: 0
  },
  mainImage: {
    type: String
  },
  images: [{
    type: String
  }],
  // Inventory variants (color, size, etc.)
  variants: [{
    color: String,
    size: String,
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'out_of_stock', 'discontinued'],
      default: 'active'
    },
    image: String
  }],
  specifications: {
    type: Map,
    of: String
  },
  tags: [{
    type: String
  }],
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'out_of_stock', 'discontinued'],
    default: 'active'
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  views: {
    type: Number,
    default: 0
  },
  sales: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
productSchema.index({ vendor: 1, status: 1 });
productSchema.index({ category: 1 });
productSchema.index({ vendor: 1, sku: 1 }, { unique: true, sparse: true });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Virtual field to calculate total stock from variants
productSchema.virtual('totalStock').get(function() {
  if (this.variants && this.variants.length > 0) {
    return this.variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
  }
  return this.stock;
});

// Method to recalculate stock from variants
productSchema.methods.updateStockFromVariants = function() {
  if (this.variants && this.variants.length > 0) {
    this.stock = this.variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
  }
  return this.stock;
};

// Pre-save middleware to automatically update stock from variants
productSchema.pre('save', function(next) {
  if (this.variants && this.variants.length > 0) {
    // If variants exist, calculate stock as sum of variant quantities
    this.stock = this.variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
  }

  if (!this.onSale) {
    this.salePrice = undefined;
  }
  
  // Update status based on stock
  if (this.stock === 0 && this.status === 'active') {
    this.status = 'out_of_stock';
  } else if (this.stock > 0 && this.status === 'out_of_stock') {
    this.status = 'active';
  }
  
  next();
});

// Ensure virtuals are included when converting to JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

export default Product;
