import express from 'express';
import { body } from 'express-validator';
import * as apiClientController from '../controllers/apiClientController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const createApiClientValidation = [
  body('name').trim().notEmpty().withMessage('Client name is required'),
  body('description').optional().trim(),
  body('scopes').optional().isArray().withMessage('Scopes must be an array'),
  body('rateLimitTier').optional().isIn(['basic', 'standard', 'premium', 'unlimited']),
  body('expiresInDays').optional().isInt({ min: 1, max: 3650 })
];

// User routes (manage their own API clients)
router.post('/', authenticate, createApiClientValidation, apiClientController.createApiClient);
router.get('/', authenticate, apiClientController.getMyApiClients);
router.get('/:id', authenticate, apiClientController.getApiClientById);
router.patch('/:id', authenticate, apiClientController.updateApiClient);
router.post('/:id/regenerate', authenticate, apiClientController.regenerateSecret);
router.delete('/:id', authenticate, apiClientController.deleteApiClient);

// Admin routes
router.get('/admin/all', authenticate, requireAdmin, apiClientController.getAllApiClients);
router.patch('/admin/:id/revoke', authenticate, requireAdmin, apiClientController.revokeApiClient);

export default router;
