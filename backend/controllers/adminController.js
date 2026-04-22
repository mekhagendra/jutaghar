import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { asNumber, asObjectId, asString, stripOperators } from '../utils/sanitizeInput.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const errorStatus = (error) => error?.statusCode || 500;

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const page = Math.max(1, asNumber(safeQuery.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(safeQuery.limit, 20)));
    const role = safeQuery.role ? asString(safeQuery.role) : '';
    const status = safeQuery.status ? asString(safeQuery.status) : '';
    const search = safeQuery.search ? asString(safeQuery.search) : '';

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { fullName: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { businessName: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshToken')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
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

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(asObjectId(req.params.id))
      .select('-password -refreshToken')
      .populate('affiliatedBy', 'fullName email businessName');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Update user status
export const updateUserStatus = async (req, res) => {
  try {
    const sanitizedBody = stripOperators({ ...req.body });
    const status = asString(sanitizedBody.status || '');

    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const user = await User.findByIdAndUpdate(
      asObjectId(req.params.id),
      { status },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const sanitizedBody = stripOperators({ ...req.body });
    const role = asString(sanitizedBody.role || '');

    if (!['admin', 'outlet', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findByIdAndUpdate(
      asObjectId(req.params.id),
      { role },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get pending vendors
export const getPendingVendors = async (req, res) => {
  try {
    const vendors = await User.find({
      role: 'outlet',
      status: 'pending'
    }).select('-password -refreshToken').sort('-createdAt');

    res.json({
      success: true,
      data: { vendors }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get all vendors
export const getAllVendors = async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const isApproved = safeQuery.isApproved !== undefined ? asString(safeQuery.isApproved) : undefined;
    const isActive = safeQuery.isActive !== undefined ? asString(safeQuery.isActive) : undefined;
    
    const query = { role: 'outlet' };
    
    if (isApproved !== undefined) {
      query.status = isApproved === 'true' ? 'active' : 'pending';
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const vendors = await User.find(query)
      .select('-password -refreshToken')
      .sort('-createdAt');

    // Get product counts for each vendor
    const vendorsWithProductCount = await Promise.all(
      vendors.map(async (vendor) => {
        const productCount = await Product.countDocuments({ 
          vendor: vendor._id 
        });
        return {
          ...vendor.toObject(),
          productCount,
          isApproved: vendor.status === 'active',
          isActive: vendor.isActive !== false
        };
      })
    );

    res.json({
      success: true,
      data: { vendors: vendorsWithProductCount }
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Update vendor status (active/inactive)
export const updateVendorStatus = async (req, res) => {
  try {
    const sanitizedBody = stripOperators({ ...req.body });
    const isActiveRaw = sanitizedBody.isActive;
    const isActive = typeof isActiveRaw === 'boolean' ? isActiveRaw : asString(isActiveRaw) === 'true';

    const vendor = await User.findById(asObjectId(req.params.id));

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.role !== 'outlet') {
      return res.status(400).json({
        success: false,
        message: 'User is not an outlet'
      });
    }

    vendor.isActive = isActive;
    await vendor.save();

    res.json({
      success: true,
      data: vendor,
      message: `Vendor ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Approve vendor
export const approveVendor = async (req, res) => {
  try {
    const vendor = await User.findById(asObjectId(req.params.id));

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.role !== 'outlet') {
      return res.status(400).json({
        success: false,
        message: 'User is not an outlet'
      });
    }

    vendor.status = 'active';
    vendor.approvedAt = new Date();
    vendor.approvedBy = req.user._id;
    await vendor.save();

    res.json({
      success: true,
      data: vendor,
      message: 'Vendor approved successfully'
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Reject vendor
export const rejectVendor = async (req, res) => {
  try {
    const sanitizedBody = stripOperators({ ...req.body });
    const reason = sanitizedBody.reason ? asString(sanitizedBody.reason) : '';

    const vendor = await User.findById(asObjectId(req.params.id));

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.role !== 'outlet') {
      return res.status(400).json({
        success: false,
        message: 'User is not an outlet'
      });
    }

    vendor.status = 'suspended';
    await vendor.save();

    res.json({
      success: true,
      message: 'Vendor rejected successfully',
      reason
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get admin statistics
export const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalOutlets,
      activeOutlets,
      pendingOutlets,
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      recentOrders
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', status: 'active' }),
      User.countDocuments({ role: 'outlet' }),
      User.countDocuments({ role: 'outlet', status: 'active' }),
      User.countDocuments({ role: 'outlet', status: 'pending' }),
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.find()
        .populate('user', 'fullName email')
        .sort('-createdAt')
        .limit(10)
    ]);

    // Calculate revenue
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers
        },
        outlets: {
          total: totalOutlets,
          active: activeOutlets,
          pending: pendingOutlets
        },
        products: {
          total: totalProducts,
          active: activeProducts
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders
        },
        revenue: {
          total: totalRevenue
        },
        recentOrders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};
