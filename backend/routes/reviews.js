import express from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public: get reviews for a product
router.get('/product/:productId', reviewController.getProductReviews);

// Auth required
router.get('/product/:productId/can-review', authenticate, reviewController.canReview);
router.post('/', authenticate, reviewController.createReview);
router.delete('/:id', authenticate, reviewController.deleteReview);

export default router;
