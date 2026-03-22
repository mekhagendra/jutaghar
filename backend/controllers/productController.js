import { validationResult } from 'express-validator';
import Product from '../models/Product.js';
import { processProductImages } from '../utils/imageStorage.js';

// Get all products with filters
export const getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      vendor,
      gender,
      minPrice,
      maxPrice,
      search,
      sort,
      wholesaleOnly = false,
      status
    } = req.query;

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
      sortField = sortMap[sort] || sort;
    }

    const query = {};

    // Only filter by active status for non-admin users
    if (!status && (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager'))) {
      query.status = 'active';
    } else if (status) {
      query.status = status;
    }

    // Filter wholesale-only products based on user type
    if (wholesaleOnly === 'true') {
      query.isWholesaleOnly = true;
    } else {
      // Hide wholesale-only products from regular customers
      if (!req.user || req.user.role === 'user') {
        query.isWholesaleOnly = { $ne: true };
      }
    }

    // Apply filters
    if (category) {
      const categories = category.split(',').map(c => c.trim());
      query.category = categories.length > 1 ? { $in: categories } : categories[0];
    }
    if (req.query.brand) {
      const brands = req.query.brand.split(',').map(b => b.trim());
      query.brand = brands.length > 1 ? { $in: brands } : brands[0];
    }
    if (vendor) query.vendor = vendor;
    if (gender) {
      const genders = gender.split(',').map(g => g.trim());
      query.gender = genders.length > 1 ? { $in: genders } : genders[0];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by variant color
    if (req.query.color) {
      const colors = req.query.color.split(',').map(c => c.trim());
      query['variants.color'] = colors.length > 1
        ? { $in: colors.map(c => new RegExp(`^${c}$`, 'i')) }
        : new RegExp(`^${colors[0]}$`, 'i');
    }

    // Filter by onSale
    if (req.query.onSale === 'true') {
      query.onSale = true;
    }

    // Filter by variant size
    if (req.query.size) {
      const sizes = req.query.size.split(',').map(s => s.trim());
      query['variants.size'] = sizes.length > 1 ? { $in: sizes } : sizes[0];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('vendor', 'businessName fullName role')
        .populate('category', 'name')
        .populate('brand', 'name')
        .sort(sortField)
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(query)
    ]);

    // Filter wholesale price visibility
    const filteredProducts = products.map(product => {
      const productObj = product.toObject();
      
      // Only show wholesale price to sellers
      if (!req.user || req.user.role !== 'seller') {
        delete productObj.wholesalePrice;
        delete productObj.minWholesaleQuantity;
      }
      
      return productObj;
    });

    res.json({
      success: true,
      data: {
        products: filteredProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
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

    const productObj = product.toObject();
    
    // Only show wholesale price to sellers
    if (!req.user || req.user.role !== 'seller') {
      delete productObj.wholesalePrice;
      delete productObj.minWholesaleQuantity;
    }

    res.json({
      success: true,
      data: productObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
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

    const productData = {
      ...req.body,
      vendor: req.user._id
    };

    // Save base64 images to upload directory
    processProductImages(productData);

    // Validate wholesale pricing based on role
    if (req.user.role === 'manufacturer' || req.user.role === 'importer') {
      // Manufacturers and importers MUST provide wholesale pricing
      if (!productData.wholesalePrice) {
        return res.status(400).json({
          success: false,
          message: 'Wholesale price is required for manufacturers and importers'
        });
      }
      
      // Ensure wholesale price is less than retail price
      if (productData.wholesalePrice >= productData.price) {
        return res.status(400).json({
          success: false,
          message: 'Wholesale price must be less than retail price'
        });
      }
    } else if (req.user.role === 'seller') {
      // Sellers CAN add products but only for retail (no wholesale pricing)
      // This represents their own inventory that they won't sell wholesale
      delete productData.wholesalePrice;
      delete productData.minWholesaleQuantity;
      delete productData.isWholesaleOnly;
    }

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
      message: error.message
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

    // Save base64 images to upload directory
    processProductImages(req.body);

    Object.assign(product, req.body);
    await product.save();

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
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
      message: error.message
    });
  }
};

// Get vendor's products
export const getVendorProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = { vendor: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .populate('brand', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get wholesale products (only for sellers)
export const getWholesaleProducts = async (req, res) => {
  try {
    // Check if user is a seller
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only registered sellers can view wholesale products.'
      });
    }

    const { 
      page = 1, 
      limit = 20, 
      category, 
      vendor,
      gender,
      minPrice,
      maxPrice,
      search,
      sort = '-createdAt'
    } = req.query;

    const query = { 
      status: 'active',
      wholesalePrice: { $exists: true, $ne: null }
    };

    // Apply filters
    if (category) query.category = category;
    if (vendor) query.vendor = vendor;
    if (gender) query.gender = gender;
    if (minPrice || maxPrice) {
      query.wholesalePrice = {};
      if (minPrice) query.wholesalePrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.wholesalePrice.$lte = parseFloat(maxPrice);
    }
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('vendor', 'businessName fullName role email phone')
        .populate('category', 'name')
        .populate('brand', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update variant quantity and recalculate total stock
export const updateVariantQuantity = async (req, res) => {
  try {
    const { variantId, quantity } = req.body;
    
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
    res.status(500).json({
      success: false,
      message: error.message
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
      message: error.message
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
    res.status(500).json({ success: false, message: error.message });
  }
};
