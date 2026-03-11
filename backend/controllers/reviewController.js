import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// GET /api/reviews/product/:productId  — public, paginated
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ product: productId })
        .populate('user', 'fullName')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments({ product: productId }),
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reviews/product/:productId/can-review  — auth required
// Returns whether the logged-in user can review + any existing review
export const canReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    // Check delivered order containing this product
    const order = await Order.findOne({
      user: userId,
      status: 'delivered',
      'items.product': productId,
    });

    if (!order) {
      return res.json({ success: true, data: { canReview: false, reason: 'no_purchase' } });
    }

    // Check if already reviewed
    const existing = await Review.findOne({ product: productId, user: userId });

    res.json({
      success: true,
      data: {
        canReview: !existing,
        reason: existing ? 'already_reviewed' : null,
        existingReview: existing || null,
        orderId: order._id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/reviews  — auth required, customer only
export const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!productId || !rating) {
      return res.status(400).json({ success: false, message: 'productId and rating are required' });
    }

    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Verify user has a delivered order with this product
    const order = await Order.findOne({
      user: userId,
      status: 'delivered',
      'items.product': productId,
    });

    if (!order) {
      return res.status(403).json({
        success: false,
        message: 'You can only review products you have purchased and received',
      });
    }

    // Check for duplicate
    const existing = await Review.findOne({ product: productId, user: userId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this product' });
    }

    const review = await Review.create({
      product: productId,
      user: userId,
      order: order._id,
      rating: ratingNum,
      comment: comment?.trim() || '',
    });

    // Recalculate product rating
    const stats = await Review.aggregate([
      { $match: { product: review.product } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        'rating.average': Math.round(stats[0].avg * 10) / 10,
        'rating.count': stats[0].count,
      });
    }

    await review.populate('user', 'fullName');

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this product' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/reviews/:id  — auth required, owner or admin
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const productId = review.product;
    await review.deleteOne();

    // Recalculate rating
    const stats = await Review.aggregate([
      { $match: { product: productId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    await Product.findByIdAndUpdate(productId, {
      'rating.average': stats.length > 0 ? Math.round(stats[0].avg * 10) / 10 : 0,
      'rating.count': stats.length > 0 ? stats[0].count : 0,
    });

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
