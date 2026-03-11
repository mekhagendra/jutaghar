import express from 'express';
import User from '../models/User.js';
import Product from '../models/Product.js';

const router = express.Router();

// Get all active vendors (public route for outlets page)
router.get('/', async (req, res) => {
  try {
    const { isApproved, role } = req.query;
    
    const query = { 
      role: { $in: ['manufacturer', 'importer', 'seller', 'outlet'] },
      isActive: true
    };
    
    if (isApproved === 'true') {
      query.status = 'active';
    }
    
    if (role && ['manufacturer', 'importer', 'seller', 'outlet'].includes(role)) {
      query.role = role;
    }

    const vendors = await User.find(query)
      .select('fullName businessName email phone businessAddress role')
      .sort('-createdAt');

    // Get product counts for each vendor
    const vendorsWithProductCount = await Promise.all(
      vendors.map(async (vendor) => {
        const productCount = await Product.countDocuments({ 
          vendor: vendor._id,
          status: 'active'
        });
        return {
          ...vendor.toObject(),
          productCount
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
});

export default router;
