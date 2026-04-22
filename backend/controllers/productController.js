import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { asNumber, asObjectId, asString, stripOperators } from '../utils/sanitizeInput.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const errorStatus = (error) => error?.statusCode || 500;

// Get all products with filters
export const getProducts = async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const page = Math.max(1, asNumber(safeQuery.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(safeQuery.limit, 20)));
    const category = safeQuery.category ? asString(safeQuery.category) : '';
    const vendor = safeQuery.vendor ? asString(safeQuery.vendor) : '';
    const gender = safeQuery.gender ? asString(safeQuery.gender) : '';
    const minPrice = safeQuery.minPrice ? asNumber(safeQuery.minPrice, null) : null;
    const maxPrice = safeQuery.maxPrice ? asNumber(safeQuery.maxPrice, null) : null;
    const search = safeQuery.search ? asString(safeQuery.search) : '';
    const sort = safeQuery.sort ? asString(safeQuery.sort) : '';
    const status = safeQuery.status ? asString(safeQuery.status) : '';
    const brand = safeQuery.brand ? asString(safeQuery.brand) : '';
    const color = safeQuery.color ? asString(safeQuery.color) : '';
    const size = safeQuery.size ? asString(safeQuery.size) : '';
    const onSale = safeQuery.onSale ? asString(safeQuery.onSale) : '';

    // Map sort values to MongoDB fields
    let sortField = '-createdAt'; // default
    if (sort) {
      const sortMap = {
        'new': '-createdAt',
        'price-asc': 'price',
        'price-desc': '-price',
        'popular': '-sales',       // Sort by sales (highest first)
        'rating': '-rating.average', // Sort by rating (highest first)
        'name': 'name',
        '-name': '-name'
      };
      sortField = sortMap[sort] || '-createdAt';
    }

    const query = {};

    // Only filter by active status for non-admin users
    if (!status && (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager'))) {
      query.status = 'active';
    } else if (status) {
      query.status = status;
    }

    // Apply filters
    if (category) {
      const categories = category.split(',').map(c => c.trim());
      // Resolve names to ObjectIds if needed
      const resolvedCats = await Promise.all(categories.map(async (c) => {
        if (mongoose.Types.ObjectId.isValid(c)) return c;
        const found = await Category.findOne({ name: new RegExp(`^${escapeRegex(c)}$`, 'i') });
        return found ? found._id : null;
      }));
      const validCats = resolvedCats.filter(Boolean);
      if (validCats.length > 0) {
        query.category = validCats.length > 1 ? { $in: validCats } : validCats[0];
      }
    }
    if (brand) {
      const brands = brand.split(',').map(b => b.trim());
      // Resolve names to ObjectIds if needed
      const resolvedBrands = await Promise.all(brands.map(async (b) => {
        if (mongoose.Types.ObjectId.isValid(b)) return b;
        const found = await Brand.findOne({ name: new RegExp(`^${escapeRegex(b)}$`, 'i') });
        return found ? found._id : null;
      }));
      const validBrands = resolvedBrands.filter(Boolean);
      if (validBrands.length > 0) {
        query.brand = validBrands.length > 1 ? { $in: validBrands } : validBrands[0];
      }
    }
    if (vendor) query.vendor = asObjectId(vendor);
    if (gender) {
      const genders = gender.split(',').map(g => g.trim());
      query.gender = genders.length > 1 ? { $in: genders } : genders[0];
    }
    if (minPrice !== null || maxPrice !== null) {
      query.price = {};
      if (minPrice !== null) query.price.$gte = minPrice;
      if (maxPrice !== null) query.price.$lte = maxPrice;
    }
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by variant color
    if (color) {
      const colors = color.split(',').map(c => c.trim());
      query['variants.color'] = colors.length > 1
        ? { $in: colors.map(c => new RegExp(`^${escapeRegex(c)}$`, 'i')) }
        : new RegExp(`^${escapeRegex(colors[0])}$`, 'i');
    }

    // Filter by onSale
    if (onSale === 'true') {
      query.onSale = true;
    }

    // Filter by variant size
    if (size) {
      const sizes = size.split(',').map(s => s.trim());
      query['variants.size'] = sizes.length > 1 ? { $in: sizes } : sizes[0];
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('vendor', 'businessName fullName role')
        .populate('category', 'name')
        .populate('brand', 'name')
        .sort(sortField)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendor', 'businessName fullName email phone role')
      .populate('category', 'name')
      .populate('brand', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment views
    product.views += 1;
    await product.save();

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Create product (vendor only)
export const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const sanitizedBody = stripOperators({ ...req.body });
    const productData = {
      ...sanitizedBody,
      vendor: req.user._id
    };

    // Set status to active by default for vendors
    if (!productData.status) {
      productData.status = 'active';
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Update product (vendor only - own products)
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership (unless admin/manager)
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && 
        product.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    const sanitizedBody = stripOperators({ ...req.body });
    Object.assign(product, sanitizedBody);
    await product.save();

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Delete product (vendor only - own products)
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership (unless admin/manager)
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && 
        product.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get vendor's products
export const getVendorProducts = async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const page = Math.max(1, asNumber(safeQuery.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(safeQuery.limit, 20)));
    const status = safeQuery.status ? asString(safeQuery.status) : '';

    const query = { vendor: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .populate('brand', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Update variant quantity and recalculate total stock
export const updateVariantQuantity = async (req, res) => {
  try {
    const sanitizedBody = stripOperators({ ...req.body });
    const variantId = asString(sanitizedBody.variantId || '');
    const quantity = Math.max(0, asNumber(sanitizedBody.quantity, 0));
    
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership (unless admin/manager)
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && 
        product.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Find and update the variant
    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    variant.quantity = quantity;
    
    // The pre-save hook will automatically recalculate total stock
    await product.save();

    res.json({
      success: true,
      data: product,
      message: 'Variant quantity updated and total stock recalculated'
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Recalculate stock for all products (admin/manager utility)
export const recalculateAllStock = async (req, res) => {
  try {
    // Only admins and managers can use this utility
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to perform this action'
      });
    }

    const products = await Product.find({ variants: { $exists: true, $not: { $size: 0 } } });
    
    let updated = 0;
    for (const product of products) {
      const oldStock = product.stock;
      product.updateStockFromVariants();
      if (oldStock !== product.stock) {
        await product.save();
        updated++;
      }
    }

    res.json({
      success: true,
      message: `Stock recalculated for ${updated} products`,
      data: {
        totalProcessed: products.length,
        updated
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get unique colors from all active product variants
export const getProductColors = async (req, res) => {
  try {
    const colors = await Product.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$variants' },
      { $match: { 'variants.color': { $exists: true, $ne: '' } } },
      { $group: { _id: { $toLower: '$variants.color' }, name: { $first: '$variants.color' } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({
      success: true,
      data: colors.map(c => c.name)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};
