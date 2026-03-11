import express from 'express';
import * as heroController from '../controllers/heroController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public: get active slides for the hero section
router.get('/', heroController.getHeroSlides);

// Admin-only routes
router.get('/all', authenticate, requireAdmin, heroController.getAllHeroSlides);
router.post('/', authenticate, requireAdmin, heroController.createHeroSlide);
router.put('/:id', authenticate, requireAdmin, heroController.updateHeroSlide);
router.delete('/:id', authenticate, requireAdmin, heroController.deleteHeroSlide);

export default router;
