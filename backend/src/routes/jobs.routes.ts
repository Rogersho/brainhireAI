import { Router } from 'express';
import { z } from 'zod';
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} from '../controllers/jobs.controller.js';
import { authenticate, optionalAuth, requireRole, HIRING_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const jobSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  department: z.string().min(2, 'Department is required').max(120),
  location: z.string().min(2, 'Location is required').max(150),
  departmentId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  positionId: z.string().uuid().nullable().optional(),
  description: z.string().max(10000).optional().default(''),
  skills: z.array(z.string().max(80)).optional().default([]),
  status: z.enum(['Active', 'Paused', 'Closed']).optional().default('Active'),
});

router.get('/', optionalAuth, getJobs);
router.get('/:id', optionalAuth, getJobById);
router.post('/', authenticate, requireRole(...HIRING_ROLES), validateBody(jobSchema), createJob);
router.put('/:id', authenticate, requireRole(...HIRING_ROLES), validateBody(jobSchema), updateJob);
router.delete('/:id', authenticate, requireRole(...HIRING_ROLES), deleteJob);

export default router;
