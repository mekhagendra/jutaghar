import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import TaxSettings from '../models/TaxSettings.js';
import { asNumber, asString, stripOperators } from '../utils/sanitizeInput.js';

const VENDOR_RETURN_STATUSES = ['requested', 'initiated', 'returned', 'completed', 'rejected'];

const buildProductVariantKey = ({ product, variant }) => {
  const productId = product?._id || product;
  const sku = variant?.sku || '';
  const color = variant?.color || '';
  const size = variant?.size || '';
  return `${String(productId)}|${sku}|${color}|${size}`;
};

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
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get vendor orders
export const getVendorOrders = async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const page = Math.max(1, asNumber(safeQuery.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(safeQuery.limit, 10)));
    const status = safeQuery.status ? asString(safeQuery.status) : '';
    const vendorId = req.user._id;

    const query = { 'items.vendor': vendorId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'fullName email phone')
        .populate('items.product', 'name images')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
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
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get vendor return requests
export const getVendorReturns = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const safeQuery = stripOperators({ ...req.query });
    const page = Math.max(1, asNumber(safeQuery.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(safeQuery.limit, 10)));
    const status = safeQuery.status ? asString(safeQuery.status).toLowerCase() : '';

    const query = {
      'items.vendor': vendorId,
      'returnRequests.0': { $exists: true },
    };

    const orders = await Order.find(query)
      .populate('user', 'fullName email phone')
      .populate('items.product', 'name images')
      .populate('returnRequests.items.product', 'name images')
      .sort('-createdAt');

    const flattened = [];

    for (const order of orders) {
      const vendorItemKeySet = new Set(
        order.items
          .filter((item) => item.vendor?.toString() === vendorId.toString())
          .map((item) => buildProductVariantKey(item))
      );

      for (const request of order.returnRequests || []) {
        const normalizedStatus = request.status === 'approved' ? 'initiated' : request.status;
        if (status && normalizedStatus !== status) continue;

        const requestItems = (request.items || []).filter((item) =>
          vendorItemKeySet.has(buildProductVariantKey(item))
        );

        if (requestItems.length === 0) continue;

        flattened.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          customer: order.user,
          returnRequest: {
            _id: request._id,
            reason: request.reason,
            description: request.description,
            images: request.images || [],
            status: normalizedStatus,
            requestedAt: request.requestedAt,
            reviewedAt: request.reviewedAt,
            reviewNote: request.reviewNote || '',
            items: requestItems,
          },
        });
      }
    }

    flattened.sort((a, b) => {
      const left = new Date(a.returnRequest.requestedAt || 0).getTime();
      const right = new Date(b.returnRequest.requestedAt || 0).getTime();
      return right - left;
    });

    const total = flattened.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, pages);
    const start = (currentPage - 1) * limit;
    const data = flattened.slice(start, start + limit);

    res.json({
      success: true,
      data: {
        returns: data,
        pagination: {
          page: currentPage,
          limit,
          total,
          pages,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Update return request status by vendor
export const updateVendorReturnStatus = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const safeBody = stripOperators({ ...req.body });
    const status = safeBody.status ? asString(safeBody.status).toLowerCase() : '';
    const reviewNote = safeBody.reviewNote ? asString(safeBody.reviewNote).trim() : '';

    if (!VENDOR_RETURN_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid return status'
      });
    }

    const order = await Order.findById(req.params.orderId)
      .populate('items.product', 'name images')
      .populate('returnRequests.items.product', 'name images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const vendorItemKeySet = new Set(
      order.items
        .filter((item) => item.vendor?.toString() === vendorId.toString())
        .map((item) => buildProductVariantKey(item))
    );

    if (vendorItemKeySet.size === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to manage returns for this order'
      });
    }

    const request = order.returnRequests.id(req.params.returnRequestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    const hasVendorItems = (request.items || []).some((item) =>
      vendorItemKeySet.has(buildProductVariantKey(item))
    );

    if (!hasVendorItems) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to manage this return request'
      });
    }

    request.status = status;
    request.reviewedAt = new Date();
    request.reviewNote = reviewNote;

    await order.save();

    const refreshed = await Order.findById(order._id)
      .populate('user', 'fullName email phone')
      .populate('items.product', 'name images')
      .populate('returnRequests.items.product', 'name images');

    const refreshedRequest = refreshed?.returnRequests?.id(req.params.returnRequestId);

    res.json({
      success: true,
      data: {
        orderId: refreshed?._id,
        orderNumber: refreshed?.orderNumber,
        customer: refreshed?.user,
        returnRequest: refreshedRequest,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
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
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get vendor dashboard
export const getVendorDashboard = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const user = await User.findById(vendorId);

    if (!user || user.role !== 'outlet') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Outlet role required.' 
      });
    }

    // Get products count
    const productsCount = await Product.countDocuments({ vendor: vendorId });

    // Get sales orders
    const salesOrders = await Order.find({
      'items.vendor': vendorId,
    });

    // Calculate sales revenue
    const totalSales = salesOrders.reduce((sum, order) => {
      const vendorItems = order.items.filter(item => 
        item.vendor.toString() === vendorId.toString()
      );
      return sum + vendorItems.reduce((itemSum, item) => 
        itemSum + (item.price * item.quantity), 0
      );
    }, 0);

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
        },
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// ─── Tax Settings ─────────────────────────────────────────────────────────────

export const getTaxSettings = async (req, res) => {
  try {
    let settings = await TaxSettings.findOne({ vendor: req.user._id }).populate(
      'rules.categories',
      'name'
    );
    if (!settings) {
      settings = await TaxSettings.create({ vendor: req.user._id });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

export const updateTaxSettings = async (req, res) => {
  try {
    const { enabled, taxLabel, defaultRate, inclusive, rules } = req.body;

    if (rules !== undefined && !Array.isArray(rules)) {
      return res.status(400).json({ success: false, message: 'rules must be an array' });
    }
    if (Array.isArray(rules)) {
      for (const r of rules) {
        if (!r.name || typeof r.rate !== 'number' || r.rate < 0 || r.rate > 100) {
          return res.status(400).json({
            success: false,
            message: 'Each rule requires a name and a rate between 0 and 100',
          });
        }
      }
    }

    const update = {};
    if (enabled !== undefined) update.enabled = Boolean(enabled);
    if (taxLabel !== undefined) update.taxLabel = String(taxLabel).substring(0, 30);
    if (defaultRate !== undefined) update.defaultRate = Number(defaultRate);
    if (inclusive !== undefined) update.inclusive = Boolean(inclusive);
    if (rules !== undefined) update.rules = rules;

    const settings = await TaxSettings.findOneAndUpdate(
      { vendor: req.user._id },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    ).populate('rules.categories', 'name');

    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

export const addTaxRule = async (req, res) => {
  try {
    const { name, rate, applyToAll, categories } = req.body;
    if (!name || typeof rate !== 'number' || rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        message: 'Rule requires a name and a rate between 0 and 100',
      });
    }

    const settings = await TaxSettings.findOneAndUpdate(
      { vendor: req.user._id },
      {
        $push: {
          rules: {
            name,
            rate,
            applyToAll: applyToAll ?? true,
            categories: categories ?? [],
          },
        },
      },
      { new: true, upsert: true }
    ).populate('rules.categories', 'name');

    res.status(201).json({ success: true, data: settings });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

export const deleteTaxRule = async (req, res) => {
  try {
    const settings = await TaxSettings.findOneAndUpdate(
      { vendor: req.user._id },
      { $pull: { rules: { _id: req.params.ruleId } } },
      { new: true }
    ).populate('rules.categories', 'name');

    if (!settings) {
      return res.status(404).json({ success: false, message: 'Tax settings not found' });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};
