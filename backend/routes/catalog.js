import express from 'express';
import { body } from 'express-validator';
import * as catalogController from '../controllers/catalogController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']),
  body('displayOrder').optional().isInt({ min: 0 })
];

const brandValidation = [
  body('name').trim().notEmpty().withMessage('Brand name is required'),
  body('description').optional().trim(),
  body('website').optional().trim().isURL().withMessage('Invalid website URL'),
  body('status').optional().isIn(['active', 'inactive']),
  body('displayOrder').optional().isInt({ min: 0 })
];

// ========== CATEGORIES ==========
// Public routes
router.get('/categories', catalogController.getCategories);

// Admin routes
router.post('/categories', authenticate, requireAdmin, categoryValidation, catalogController.createCategory);
router.put('/categories/:id', authenticate, requireAdmin, catalogController.updateCategory);
router.delete('/categories/:id', authenticate, requireAdmin, catalogController.deleteCategory);

// ========== BRANDS ==========
// Public routes
router.get('/brands', catalogController.getBrands);

// Admin routes
router.post('/brands', authenticate, requireAdmin, brandValidation, catalogController.createBrand);
router.put('/brands/:id', authenticate, requireAdmin, catalogController.updateBrand);
router.delete('/brands/:id', authenticate, requireAdmin, catalogController.deleteBrand);

export default router;
