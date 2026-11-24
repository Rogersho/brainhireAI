import { Router } from 'express';
import { z } from 'zod';
import {
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
} from '../controllers/notifications.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createNotificationSchema = z.object({
  icon: z.string().max(60).optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  type: z.enum(['info', 'success', 'warning', 'default']).optional(),
  link: z.string().max(255).optional(),
});

const updateNotificationSchema = z.object({
  read: z.boolean(),
});

router.use(authenticate);
router.get('/', getNotifications);
router.post('/', validateBody(createNotificationSchema), createNotification);
router.put('/:id', validateBody(updateNotificationSchema), updateNotification);
router.delete('/:id', deleteNotification);

export default router;
