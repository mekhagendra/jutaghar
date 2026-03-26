import express from 'express';
import * as vendorController from '../controllers/vendorController.js';
import { authenticate, requireVendor } from '../middleware/auth.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(requireVendor);

// Vendor dashboard stats
router.get('/dashboard', vendorController.getVendorDashboard);

// Vendor dashboard stats
router.get('/stats', vendorController.getVendorStats);

// Vendor orders (B2C sales)
router.get('/orders', vendorController.getVendorOrders);
router.get('/orders/:id', vendorController.getVendorOrderById);

// Vendor products summary
router.get('/products/summary', vendorController.getProductsSummary);

// Tax settings
router.get('/tax', vendorController.getTaxSettings);
router.put('/tax', vendorController.updateTaxSettings);
router.post('/tax/rules', vendorController.addTaxRule);
router.delete('/tax/rules/:ruleId', vendorController.deleteTaxRule);

export default router;
