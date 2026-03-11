import express from 'express';
import { body } from 'express-validator';
import * as orderController from '../controllers/orderController.js';
import { authenticate, requireVendor } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const createOrderValidation = [
  body('items').isArray({ min: 1 }),
  body('items.*.product').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('paymentMethod').isIn(['esewa', 'khalti', 'cash_on_delivery']),
  body('shippingAddress').notEmpty()
];

// Public route – track by order number (no auth)
router.get('/track/:orderNumber', orderController.trackOrder);

// Customer routes
router.post('/', authenticate, createOrderValidation, orderController.createOrder);
router.get('/', authenticate, orderController.getUserOrders);
router.get('/:id', authenticate, orderController.getOrderById);
router.patch('/:id/cancel', authenticate, orderController.cancelOrder);

// Vendor routes
router.get('/vendor/orders', authenticate, requireVendor, orderController.getVendorOrders);
router.patch('/:id/status', authenticate, requireVendor, orderController.updateOrderStatus);

export default router;
