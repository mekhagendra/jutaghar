import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.patch('/users/:id/role', adminController.updateUserRole);

// Vendor management
router.get('/vendors', adminController.getAllVendors);
router.get('/vendors/pending', adminController.getPendingVendors);
router.patch('/vendors/:id/approve', adminController.approveVendor);
router.patch('/vendors/:id/reject', adminController.rejectVendor);
router.patch('/vendors/:id/status', adminController.updateVendorStatus);

// Statistics
router.get('/stats', adminController.getAdminStats);
router.get('/audit-log', adminController.getAuditLog);

// Product featured management (admin only)
router.get('/products', adminController.getAdminProducts);
router.patch('/products/:id/featured', adminController.updateFeaturedProduct);

export default router;
