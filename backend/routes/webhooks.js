import express from 'express';
import { handleEsewaWebhook, handleKhaltiWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Public webhook endpoints: upstream gateways call these directly.
router.post('/khalti', handleKhaltiWebhook);
router.post('/esewa', handleEsewaWebhook);

export default router;
