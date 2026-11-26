import { Router } from 'express';
import { z } from 'zod';
import { getAdminUsers, updateUserAccess, getAuditLogs } from '../controllers/admin.controller.js';
import { authenticate, requireRole, HR_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const updateAccessSchema = z.object({
  role: z.enum(['Admin', 'HRManager', 'HiringManager', 'Employee', 'Candidate']).optional(),
  isActive: z.boolean().optional(),
});

router.get('/users', authenticate, requireRole(...HR_ROLES), getAdminUsers);
router.patch(
  '/users/:id',
  authenticate,
  requireRole('Admin'),
  validateBody(updateAccessSchema),
  updateUserAccess
);
router.get('/audit-logs', authenticate, requireRole(...HR_ROLES), getAuditLogs);

export default router;
