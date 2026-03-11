import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// Get vendor statistics
export const getVendorStats = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const [
      totalProducts,
      activeProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      completedOrders
    ] = await Promise.all([
      Product.countDocuments({ vendor: vendorId }),
      Product.countDocuments({ vendor: vendorId, status: 'active' }),
      Product.countDocuments({ vendor: vendorId, status: 'out_of_stock' }),
      Order.countDocuments({ 'items.vendor': vendorId }),
      Order.countDocuments({ 'items.vendor': vendorId, status: 'pending' }),
      Order.countDocuments({ 'items.vendor': vendorId, status: 'delivered' })
    ]);

    // Calculate revenue for this vendor
    const revenueResult = await Order.aggregate([
      { $match: { 'items.vendor': vendorId, paymentStatus: 'paid' } },
      { $unwind: '$items' },
      { $match: { 'items.vendor': vendorId } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $multiply: ['$items.price', '$items.quantity'] }
          }
        }
      }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Get top selling products
    const topProducts = await Product.find({ vendor: vendorId })
      .sort('-sales')
      .limit(5)
      .select('name sales price images');

    res.json({
      success: true,
      data: {
        products: {
          total: totalProducts,
          active: activeProducts,
          outOfStock: outOfStockProducts
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders
        },
        revenue: {
          total: totalRevenue
        },
        topProducts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get vendor orders
export const getVendorOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const vendorId = req.user._id;

    const query = { 'items.vendor': vendorId };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'fullName email phone')
        .populate('items.product', 'name images')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);

    // Filter items to show only this vendor's items
    const filteredOrders = orders.map(order => {
      const orderObj = order.toObject();
      orderObj.items = orderObj.items.filter(
        item => item.vendor.toString() === vendorId.toString()
      );
      return orderObj;
    });

    res.json({
      success: true,
      data: {
        orders: filteredOrders,
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

// Get vendor order by ID
export const getVendorOrderById = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const order = await Order.findById(req.params.id)
      .populate('user', 'fullName email phone')
      .populate('items.product', 'name images price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if vendor has items in this order
    const hasVendorItems = order.items.some(
      item => item.vendor.toString() === vendorId.toString()
    );

    if (!hasVendorItems) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    // Filter to show only vendor's items
    const orderObj = order.toObject();
    orderObj.items = orderObj.items.filter(
      item => item.vendor.toString() === vendorId.toString()
    );

    res.json({
      success: true,
      data: orderObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get products summary
export const getProductsSummary = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const summary = await Product.aggregate([
      { $match: { vendor: vendorId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get vendor dashboard with B2B and B2C stats
export const getVendorDashboard = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const user = await User.findById(vendorId);

    if (!user || user.role !== 'vendor') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Vendor role required.' 
      });
    }

    // Get products count
    const productsCount = await Product.countDocuments({ vendor: vendorId });

    // Get B2C sales orders (vendor selling to customers)
    const salesOrders = await Order.find({
      'items.vendor': vendorId,
      orderType: 'B2C'
    });

    // Get B2B purchase orders (seller buying from manufacturers/importers)
    const purchaseOrders = user.role === 'seller' ? await Order.find({
      user: vendorId,
      orderType: 'B2B'
    }) : [];

    // Calculate sales revenue
    const totalSales = salesOrders.reduce((sum, order) => {
      const vendorItems = order.items.filter(item => 
        item.vendor.toString() === vendorId.toString()
      );
      return sum + vendorItems.reduce((itemSum, item) => 
        itemSum + (item.price * item.quantity), 0
      );
    }, 0);

    // Calculate purchase costs (for sellers)
    const totalPurchases = purchaseOrders.reduce((sum, order) => sum + order.total, 0);

    // Get sellers under this vendor (if manufacturer or importer)
    const sellers = user.role !== 'seller' ? await User.find({
      parentVendor: vendorId,
      role: 'seller'
    }).select('fullName email businessName status') : [];

    res.json({
      success: true,
      data: {
        vendorInfo: {
          businessName: user.businessName,
          role: user.role,
          email: user.email,
          status: user.status
        },
        stats: {
          productsCount,
          totalSalesOrders: salesOrders.length,
          totalSales,
          totalPurchaseOrders: purchaseOrders.length,
          totalPurchases,
          sellersCount: sellers.length
        },
        sellers: sellers.length > 0 ? sellers : undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get seller's purchase orders from manufacturers/importers
export const getSellerPurchases = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user || user.role !== 'seller') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Seller role required.' 
      });
    }

    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      user: userId,
      orderType: 'B2B'
    };

    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('items.vendor', 'businessName role email')
        .populate('items.product', 'name images')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        orders,
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

// Get sellers under vendor (for manufacturers/importers)
export const getVendorSellers = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const user = await User.findById(vendorId);

    if (!user || !['manufacturer', 'importer', 'seller', 'outlet'].includes(user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Vendor role required.' 
      });
    }

    if (['seller', 'outlet'].includes(user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Sellers and outlets cannot have sub-sellers.' 
      });
    }

    const sellers = await User.find({
      parentVendor: vendorId,
      role: 'seller'
    }).select('-password -refreshToken');

    res.json({
      success: true,
      data: { sellers }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create seller under vendor (for manufacturers/importers)
export const createSeller = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const vendor = await User.findById(vendorId);

    if (!vendor || !['manufacturer', 'importer'].includes(vendor.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Manufacturer or Importer role required.' 
      });
    }

    const { 
      email, 
      password, 
      fullName, 
      phone, 
      businessName, 
      businessAddress 
    } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !phone || !businessName) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields: email, password, fullName, phone, businessName' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create seller
    const seller = new User({
      email,
      password: hashedPassword,
      fullName,
      phone,
      role: 'seller',
      businessName,
      businessAddress,
      parentVendor: vendorId,
      status: 'active' // Auto-approve sellers created by verified vendors
    });

    await seller.save();

    res.status(201).json({
      success: true,
      message: 'Seller created successfully',
      data: {
        seller: {
          id: seller._id,
          email: seller.email,
          fullName: seller.fullName,
          businessName: seller.businessName,
          status: seller.status
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

// Update seller status (for manufacturers/importers)
export const updateSellerStatus = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { sellerId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status. Must be active or suspended.' 
      });
    }

    const seller = await User.findOne({
      _id: sellerId,
      parentVendor: vendorId,
      role: 'seller'
    });

    if (!seller) {
      return res.status(404).json({ 
        success: false,
        message: 'Seller not found or not under your management' 
      });
    }

    seller.status = status;
    await seller.save();

    res.json({
      success: true,
      message: `Seller ${status === 'active' ? 'activated' : 'suspended'} successfully`,
      data: {
        seller: {
          id: seller._id,
          email: seller.email,
          fullName: seller.fullName,
          status: seller.status
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
