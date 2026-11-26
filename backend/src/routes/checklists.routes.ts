import { Router } from 'express';
import { z } from 'zod';
import {
  getTemplates,
  createTemplate,
  deleteTemplate,
  getChecklistsOverview,
  getEmployeeChecklist,
  addEmployeeTask,
  applyTemplateToEmployee,
  updateTaskStatus,
  deleteTask,
} from '../controllers/checklists.controller.js';
import { authenticate, requireRole, HR_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createTemplateSchema = z.object({
  name: z.string().min(2).max(150),
  type: z.enum(['Onboarding', 'Offboarding']),
  description: z.string().max(1000).optional().default(''),
  tasks: z
    .array(
      z.object({
        title: z.string().min(2).max(200),
        description: z.string().max(1000).optional().default(''),
        category: z
          .enum(['Paperwork', 'IT & Access', 'Training', 'Equipment', 'Exit', 'General'])
          .optional()
          .default('Paperwork'),
        assigneeRole: z.string().max(30).optional().default('HRManager'),
        dueOffsetDays: z.number().int().min(0).max(365).optional().default(7),
      })
    )
    .min(1),
});

const addTaskSchema = z.object({
  type: z.enum(['Onboarding', 'Offboarding']).optional().default('Onboarding'),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional().default(''),
  category: z
    .enum(['Paperwork', 'IT & Access', 'Training', 'Equipment', 'Exit', 'General'])
    .optional()
    .default('General'),
  assignedTo: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['Pending', 'In Progress', 'Completed']),
});

router.get('/templates', authenticate, requireRole(...HR_ROLES), getTemplates);
router.post('/templates', authenticate, requireRole(...HR_ROLES), validateBody(createTemplateSchema), createTemplate);
router.delete('/templates/:id', authenticate, requireRole(...HR_ROLES), deleteTemplate);

router.get('/overview', authenticate, requireRole(...HR_ROLES), getChecklistsOverview);
router.get('/employee/:employeeId', authenticate, requireRole(...INTERNAL_ROLES), getEmployeeChecklist);
router.post(
  '/employee/:employeeId/tasks',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(addTaskSchema),
  addEmployeeTask
);
router.post(
  '/employee/:employeeId/apply-template',
  authenticate,
  requireRole(...HR_ROLES),
  applyTemplateToEmployee
);
router.patch('/tasks/:taskId', authenticate, requireRole(...INTERNAL_ROLES), validateBody(updateStatusSchema), updateTaskStatus);
router.delete('/tasks/:taskId', authenticate, requireRole(...HR_ROLES), deleteTask);

export default router;
