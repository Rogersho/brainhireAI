import { Router } from 'express';
import { z } from 'zod';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getPolicies,
  createPolicy,
  acknowledgePolicy,
  deletePolicy,
} from '../controllers/communications.controller.js';
import { authenticate, requireRole, HR_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const announcementSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(5000),
  category: z.enum(['General', 'HR Update', 'Event', 'Urgent']).optional().default('General'),
  isPinned: z.boolean().optional().default(false),
});

const policySchema = z.object({
  title: z.string().min(2).max(200),
  version: z.string().max(30).optional().default('1.0'),
  category: z
    .enum(['Handbook', 'Code of Conduct', 'Remote Work', 'Security', 'Leave Policy', 'Benefits'])
    .optional()
    .default('Handbook'),
  contentMarkdown: z.string().min(10).max(30000),
  requiresAcknowledgement: z.boolean().optional().default(true),
});

router.get('/announcements', authenticate, requireRole(...INTERNAL_ROLES), getAnnouncements);
router.post('/announcements', authenticate, requireRole(...HR_ROLES), validateBody(announcementSchema), createAnnouncement);
router.delete('/announcements/:id', authenticate, requireRole(...HR_ROLES), deleteAnnouncement);

router.get('/policies', authenticate, requireRole(...INTERNAL_ROLES), getPolicies);
router.post('/policies', authenticate, requireRole(...HR_ROLES), validateBody(policySchema), createPolicy);
router.post('/policies/:id/acknowledge', authenticate, requireRole(...INTERNAL_ROLES), acknowledgePolicy);
router.delete('/policies/:id', authenticate, requireRole(...HR_ROLES), deletePolicy);

export default router;
