import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshToken')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
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

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update user status
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'outlet', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
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
    res.status(500).json({
      success: false,
      message: error.message
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
      message: error.message
    });
  }
};

// Get all vendors
export const getAllVendors = async (req, res) => {
  try {
    const { isApproved, isActive } = req.query;
    
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update vendor status (active/inactive)
export const updateVendorStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const vendor = await User.findById(req.params.id);

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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Approve vendor
export const approveVendor = async (req, res) => {
  try {
    const vendor = await User.findById(req.params.id);

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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reject vendor
export const rejectVendor = async (req, res) => {
  try {
    const { reason } = req.body;

    const vendor = await User.findById(req.params.id);

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
    res.status(500).json({
      success: false,
      message: error.message
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
      message: error.message
    });
  }
};
