import { Router } from 'express';
import { z } from 'zod';
import {
  getTodayAttendance,
  clockIn,
  clockOut,
  getAttendanceLogs,
  requestCorrection,
  getCorrections,
  reviewCorrection,
} from '../controllers/attendance.controller.js';
import { authenticate, requireRole, INTERNAL_ROLES, HIRING_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const clockInSchema = z.object({
  workMode: z.enum(['Office', 'Remote', 'Field']).optional().default('Office'),
  notes: z.string().max(500).optional().default(''),
});

const clockOutSchema = z.object({
  breakMinutes: z.number().int().min(0).max(240).optional().default(0),
  notes: z.string().max(500).optional().default(''),
});

const correctionSchema = z.object({
  workDate: z.string().min(8),
  requestedClockIn: z.string().optional().nullable(),
  requestedClockOut: z.string().optional().nullable(),
  reason: z.string().min(3).max(1000),
});

const reviewSchema = z.object({
  decision: z.enum(['Approved', 'Rejected']),
});

router.get('/today', authenticate, requireRole(...INTERNAL_ROLES), getTodayAttendance);
router.post('/clock-in', authenticate, requireRole(...INTERNAL_ROLES), validateBody(clockInSchema), clockIn);
router.post('/clock-out', authenticate, requireRole(...INTERNAL_ROLES), validateBody(clockOutSchema), clockOut);
router.get('/', authenticate, requireRole(...INTERNAL_ROLES), getAttendanceLogs);
router.get('/corrections', authenticate, requireRole(...INTERNAL_ROLES), getCorrections);
router.post('/corrections', authenticate, requireRole(...INTERNAL_ROLES), validateBody(correctionSchema), requestCorrection);
router.patch('/corrections/:id', authenticate, requireRole(...HIRING_ROLES), validateBody(reviewSchema), reviewCorrection);

export default router;
