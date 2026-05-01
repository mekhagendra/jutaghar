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
  body('paymentMethod').isIn(['cash_on_delivery']),
  body('shippingAddress').notEmpty()
];

// Public route – track by order number (no auth)
router.get('/track/:orderNumber', orderController.trackOrder);

// Customer routes
router.post('/', authenticate, createOrderValidation, orderController.createOrder);
router.get('/', authenticate, orderController.getUserOrders);
router.get('/:id', authenticate, orderController.getOrderById);
router.patch('/:id/cancel', authenticate, orderController.cancelOrder);
router.post(
  '/:id/return-request',
  authenticate,
  [
    body('reason').isString().trim().isLength({ min: 2, max: 120 }),
    body('description').optional().isString().trim().isLength({ max: 2000 }),
    body('images').optional().isArray({ max: 5 }),
    body('items').optional().isArray({ min: 1, max: 20 }),
    body('items.*.product').optional().notEmpty(),
    body('items.*.quantity').optional().isInt({ min: 1 }),
  ],
  orderController.requestReturn
);

// Vendor routes
router.get('/vendor/orders', authenticate, requireVendor, orderController.getVendorOrders);
router.patch('/:id/status', authenticate, requireVendor, orderController.updateOrderStatus);

export default router;
