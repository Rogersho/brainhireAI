import { Router } from 'express';
import { z } from 'zod';
import { runScreening } from '../controllers/screening.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

const runScreeningSchema = z.object({
  jobId: z.string().uuid('Valid jobId is required'),
});

router.post(
  '/run',
  authenticate,
  requireRole('Recruiter'),
  aiLimiter,
  validateBody(runScreeningSchema),
  runScreening
);

export default router;
