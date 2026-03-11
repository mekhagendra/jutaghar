import express from 'express';
import * as vendorController from '../controllers/vendorController.js';
import { authenticate, requireVendor } from '../middleware/auth.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(requireVendor);

// Vendor dashboard with B2B/B2C stats
router.get('/dashboard', vendorController.getVendorDashboard);

// Vendor dashboard stats
router.get('/stats', vendorController.getVendorStats);

// Vendor orders (B2C sales)
router.get('/orders', vendorController.getVendorOrders);
router.get('/orders/:id', vendorController.getVendorOrderById);

// Vendor products summary
router.get('/products/summary', vendorController.getProductsSummary);

// Seller purchase orders (B2B - for sellers only)
router.get('/purchases', vendorController.getSellerPurchases);

// Seller management (for manufacturers/importers)
router.get('/sellers', vendorController.getVendorSellers);
router.post('/sellers', vendorController.createSeller);
router.patch('/sellers/:sellerId/status', vendorController.updateSellerStatus);

export default router;
