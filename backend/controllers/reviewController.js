import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { asNumber, asObjectId, asString, stripOperators } from '../utils/sanitizeInput.js';

const errorStatus = (error) => error?.statusCode || 500;

// GET /api/reviews/product/:productId  — public, paginated
export const getProductReviews = async (req, res) => {
  try {
    const productId = asObjectId(req.params.productId);
    const safeQuery = stripOperators({ ...req.query });
    const page = Math.max(1, asNumber(safeQuery.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(safeQuery.limit, 10)));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ product: productId })
        .populate('user', 'fullName')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ product: productId }),
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(errorStatus(error)).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// GET /api/reviews/product/:productId/can-review  — auth required
// Returns whether the logged-in user can review + any existing review
export const canReview = async (req, res) => {
  try {
    const productId = asObjectId(req.params.productId);
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
    res.status(errorStatus(error)).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// POST /api/reviews  — auth required, customer only
export const createReview = async (req, res) => {
  try {
    const sanitizedBody = stripOperators({ ...req.body });
    const productIdRaw = sanitizedBody.productId;
    const ratingRaw = sanitizedBody.rating;
    const commentRaw = sanitizedBody.comment;
    const userId = req.user._id;

    if (!productIdRaw || !ratingRaw) {
      return res.status(400).json({ success: false, message: 'productId and rating are required' });
    }

    const productId = asObjectId(productIdRaw);
    const ratingNum = asNumber(ratingRaw, 0);
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
      comment: commentRaw ? asString(commentRaw).trim() : '',
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
    res.status(errorStatus(error)).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// DELETE /api/reviews/:id  — auth required, owner or admin
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(asObjectId(req.params.id));
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
    res.status(errorStatus(error)).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};
