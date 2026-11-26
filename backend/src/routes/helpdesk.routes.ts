import { Router } from 'express';
import { z } from 'zod';
import {
  getTickets,
  createTicket,
  updateTicket,
  getTicketMessages,
  addTicketMessage,
} from '../controllers/helpdesk.controller.js';
import { authenticate, requireRole, HR_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const ticketSchema = z.object({
  category: z
    .enum(['Payroll', 'Leave', 'Benefits', 'IT / Access', 'Workplace', 'Document Request', 'Other'])
    .optional()
    .default('Other'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
  subject: z.string().min(3).max(200),
  description: z.string().min(5).max(4000),
});

const updateSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Waiting on Employee', 'Resolved', 'Closed']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
});

const messageSchema = z.object({
  body: z.string().min(1).max(3000),
  isInternalNote: z.boolean().optional().default(false),
});

router.get('/tickets', authenticate, requireRole(...INTERNAL_ROLES), getTickets);
router.post('/tickets', authenticate, requireRole(...INTERNAL_ROLES), validateBody(ticketSchema), createTicket);
router.patch('/tickets/:id', authenticate, requireRole(...HR_ROLES), validateBody(updateSchema), updateTicket);
router.get('/tickets/:id/messages', authenticate, requireRole(...INTERNAL_ROLES), getTicketMessages);
router.post('/tickets/:id/messages', authenticate, requireRole(...INTERNAL_ROLES), validateBody(messageSchema), addTicketMessage);

export default router;
