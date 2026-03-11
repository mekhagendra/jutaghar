import express from 'express';
import { getDeliverySettings, updateDeliverySettings } from '../controllers/deliverySettingsController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getDeliverySettings);
router.put('/', authenticate, requireAdmin, updateDeliverySettings);

export default router;
