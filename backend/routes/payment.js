import express from 'express';
import { body } from 'express-validator';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const initiateOrderValidation = [
  body('items').isArray({ min: 1 }),
  body('items.*.product').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('paymentMethod').isIn(['esewa', 'khalti', 'cash_on_delivery']),
  body('shippingAddress').notEmpty()
];

// Tax estimate (for checkout preview)
router.post('/tax-estimate', authenticate, paymentController.estimateTax);

// Initiate order (create pending order before payment)
router.post('/initiate', authenticate, initiateOrderValidation, paymentController.initiateOrder);

// eSewa signature generation
router.post('/esewa/signature', authenticate, paymentController.generateEsewaSignature);

// Khalti initiation (proxy to avoid CORS)
router.post('/khalti/initiate', authenticate, paymentController.initiateKhaltiPayment);

// Payment verification routes
router.get('/esewa/verify', authenticate, paymentController.verifyEsewaPayment);
router.post('/khalti/verify', paymentController.verifyKhaltiPayment);

export default router;
