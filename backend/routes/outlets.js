import express from 'express';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { asString, stripOperators } from '../utils/sanitizeInput.js';

const router = express.Router();

// Get all active vendors (public route for outlets page)
router.get('/', async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const isApproved = safeQuery.isApproved ? asString(safeQuery.isApproved) : '';
    
    const query = {
      role: 'seller',
      isActive: true
    };
    
    if (isApproved === 'true') {
      query.status = 'active';
    }

    const vendors = await User.find(query)
      .select('fullName businessName email phone businessAddress role sellerImage')
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
