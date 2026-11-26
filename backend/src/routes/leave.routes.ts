import { Router } from 'express';
import { z } from 'zod';
import {
  getLeaveTypes,
  createLeaveType,
  getHolidays,
  createHoliday,
  deleteHoliday,
  getMyLeaveBalances,
  getLeaveRequests,
  createLeaveRequest,
  reviewLeaveRequest,
  cancelLeaveRequest,
  getOutOfOfficeCalendar,
} from '../controllers/leave.controller.js';
import { authenticate, requireRole, HR_ROLES, HIRING_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const leaveTypeSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
  annualAllowanceDays: z.number().min(0).max(365),
  isPaid: z.boolean().optional().default(true),
  requiresDocument: z.boolean().optional().default(false),
  maxCarryoverDays: z.number().min(0).max(60).optional().default(0),
  colorHex: z.string().max(20).optional().default('#0EA5E9'),
});

const holidaySchema = z.object({
  name: z.string().min(2).max(150),
  holidayDate: z.string().min(8),
  locationId: z.string().uuid().nullable().optional(),
  isPaid: z.boolean().optional().default(true),
});

const leaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string().min(8),
  endDate: z.string().min(8),
  isHalfDay: z.boolean().optional().default(false),
  reason: z.string().max(1000).optional().default(''),
});

const reviewSchema = z.object({
  decision: z.enum(['Approved', 'Rejected']),
  reviewNote: z.string().max(500).optional().default(''),
});

router.get('/types', authenticate, requireRole(...INTERNAL_ROLES), getLeaveTypes);
router.post('/types', authenticate, requireRole(...HR_ROLES), validateBody(leaveTypeSchema), createLeaveType);

router.get('/holidays', authenticate, requireRole(...INTERNAL_ROLES), getHolidays);
router.post('/holidays', authenticate, requireRole(...HR_ROLES), validateBody(holidaySchema), createHoliday);
router.delete('/holidays/:id', authenticate, requireRole(...HR_ROLES), deleteHoliday);

router.get('/balances/me', authenticate, requireRole(...INTERNAL_ROLES), getMyLeaveBalances);
router.get('/calendar', authenticate, requireRole(...INTERNAL_ROLES), getOutOfOfficeCalendar);

router.get('/requests', authenticate, requireRole(...INTERNAL_ROLES), getLeaveRequests);
router.post('/requests', authenticate, requireRole(...INTERNAL_ROLES), validateBody(leaveRequestSchema), createLeaveRequest);
router.patch('/requests/:id/review', authenticate, requireRole(...HIRING_ROLES), validateBody(reviewSchema), reviewLeaveRequest);
router.patch('/requests/:id/cancel', authenticate, requireRole(...INTERNAL_ROLES), cancelLeaveRequest);

export default router;
