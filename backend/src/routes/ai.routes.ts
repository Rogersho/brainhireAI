import { Router } from 'express';
import { getRecommendations } from '../controllers/ai.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/recommendations', authenticate, requireRole('Candidate'), aiLimiter, getRecommendations);
router.post('/recommendations', authenticate, requireRole('Candidate'), aiLimiter, getRecommendations);

export default router;
