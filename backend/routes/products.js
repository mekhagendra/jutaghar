import express from 'express';
import { body } from 'express-validator';
import * as productController from '../controllers/productController.js';
import { authenticate, requireVendor, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const createProductValidation = [
  body('name').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('price').isFloat({ min: 0 }).withMessage('Price is required and must be greater than 0'),
  body('category').trim().notEmpty(),
  body('wholesalePrice').optional().isFloat({ min: 0 }),
  body('minWholesaleQuantity').optional().isInt({ min: 1 }),
  body('isWholesaleOnly').optional().isBoolean()
];

// Public routes
router.get('/', optionalAuth, productController.getProducts);
router.get('/colors', productController.getProductColors);

// Wholesale products (only accessible to sellers) - must be before /:id route
router.get('/wholesale/catalog', authenticate, productController.getWholesaleProducts);

// Vendor routes (requires authentication + vendor role)
router.get('/vendor/my-products', authenticate, requireVendor, productController.getVendorProducts);

// Product by ID - must be after specific routes
router.get('/:id', optionalAuth, productController.getProductById);

router.post('/', authenticate, requireVendor, createProductValidation, productController.createProduct);
router.put('/:id', authenticate, requireVendor, productController.updateProduct);
router.patch('/:id', authenticate, requireVendor, productController.updateProduct);
router.delete('/:id', authenticate, requireVendor, productController.deleteProduct);

// Variant quantity update route
router.patch('/:id/variants/quantity', authenticate, requireVendor, productController.updateVariantQuantity);

// Admin utility route to recalculate all product stocks
router.post('/admin/recalculate-stock', authenticate, productController.recalculateAllStock);

export default router;
