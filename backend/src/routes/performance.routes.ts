import { Router } from 'express';
import { z } from 'zod';
import {
  getCycles,
  createCycle,
  getReviews,
  submitSelfReview,
  submitManagerReview,
  getGoals,
  createGoal,
  updateGoalProgress,
} from '../controllers/performance.controller.js';
import { authenticate, requireRole, HR_ROLES, HIRING_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const cycleSchema = z.object({
  name: z.string().min(2).max(150),
  startDate: z.string().min(8),
  endDate: z.string().min(8),
});

const selfReviewSchema = z.object({
  selfRating: z.number().int().min(1).max(5),
  selfComments: z.string().max(4000).optional().default(''),
});

const managerReviewSchema = z.object({
  managerRating: z.number().int().min(1).max(5),
  managerComments: z.string().max(4000).optional().default(''),
  finalRating: z.number().int().min(1).max(5).optional(),
  generateAiSummary: z.boolean().optional().default(true),
});

const goalSchema = z.object({
  employeeId: z.string().uuid().optional().nullable(),
  title: z.string().min(2).max(200),
  description: z.string().max(1500).optional().default(''),
  metricTarget: z.string().max(200).optional().default(''),
  dueDate: z.string().optional().nullable(),
});

const goalUpdateSchema = z.object({
  progressPercent: z.number().int().min(0).max(100).optional(),
  status: z.enum(['On Track', 'At Risk', 'Completed', 'Dropped']).optional(),
});

router.get('/cycles', authenticate, requireRole(...INTERNAL_ROLES), getCycles);
router.post('/cycles', authenticate, requireRole(...HR_ROLES), validateBody(cycleSchema), createCycle);

router.get('/reviews', authenticate, requireRole(...INTERNAL_ROLES), getReviews);
router.patch('/reviews/:id/self', authenticate, requireRole(...INTERNAL_ROLES), validateBody(selfReviewSchema), submitSelfReview);
router.patch('/reviews/:id/manager', authenticate, requireRole(...HIRING_ROLES), validateBody(managerReviewSchema), submitManagerReview);

router.get('/goals', authenticate, requireRole(...INTERNAL_ROLES), getGoals);
router.post('/goals', authenticate, requireRole(...INTERNAL_ROLES), validateBody(goalSchema), createGoal);
router.patch('/goals/:id', authenticate, requireRole(...INTERNAL_ROLES), validateBody(goalUpdateSchema), updateGoalProgress);

export default router;
