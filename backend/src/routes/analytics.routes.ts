import { Router } from 'express';
import {
  getHrOverviewAnalytics,
  getAiExecutiveBrief,
} from '../controllers/analytics.controller.js';
import { authenticate, requireRole, HR_ROLES } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/hr-overview', authenticate, requireRole(...HR_ROLES), getHrOverviewAnalytics);
router.post('/ai-brief', authenticate, requireRole(...HR_ROLES), aiLimiter, getAiExecutiveBrief);

export default router;
