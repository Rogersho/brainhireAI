import { Router } from 'express';
import { z } from 'zod';
import {
  getEmployees,
  getOrgChart,
  getMyEmployeeProfile,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  convertApplicantToEmployee,
  offboardEmployee,
} from '../controllers/employees.controller.js';
import { authenticate, requireRole, HR_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  workEmail: z.string().email(),
  personalEmail: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().max(50).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  jobTitle: z.string().min(2).max(200),
  managerId: z.string().uuid().optional().nullable(),
  employmentType: z.enum(['Full-Time', 'Part-Time', 'Contract', 'Intern']).optional(),
  workMode: z.enum(['On-Site', 'Remote', 'Hybrid']).optional(),
  status: z.enum(['Active', 'Probation', 'On Leave', 'Suspended', 'Terminated']).optional(),
  hireDate: z.string().optional(),
  probationEndDate: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  emergencyContactName: z.string().max(150).optional().nullable(),
  emergencyContactPhone: z.string().max(50).optional().nullable(),
  createUserAccount: z.boolean().optional().default(true),
  accountRole: z.enum(['HRManager', 'HiringManager', 'Employee']).optional().default('Employee'),
  initialPassword: z.string().min(6).max(128).optional().or(z.literal('')),
  applyOnboardingTemplate: z.boolean().optional().default(true),
  onboardingTemplateId: z.string().uuid().optional().nullable(),
});

const convertApplicantSchema = z.object({
  workEmail: z.string().email().optional().or(z.literal('')),
  departmentId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  employmentType: z.enum(['Full-Time', 'Part-Time', 'Contract', 'Intern']).optional(),
  workMode: z.enum(['On-Site', 'Remote', 'Hybrid']).optional(),
  hireDate: z.string().optional(),
  onboardingTemplateId: z.string().uuid().optional().nullable(),
});

const offboardSchema = z.object({
  terminationDate: z.string().optional(),
  terminationReason: z.string().max(1000).optional(),
  deactivateAccount: z.boolean().optional().default(true),
  offboardingTemplateId: z.string().uuid().optional().nullable(),
});

router.get('/', authenticate, requireRole(...INTERNAL_ROLES), getEmployees);
router.get('/org-chart', authenticate, requireRole(...INTERNAL_ROLES), getOrgChart);
router.get('/me', authenticate, requireRole(...INTERNAL_ROLES), getMyEmployeeProfile);
router.post('/', authenticate, requireRole(...HR_ROLES), validateBody(createEmployeeSchema), createEmployee);
router.post(
  '/convert-applicant/:applicantId',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(convertApplicantSchema),
  convertApplicantToEmployee
);
router.get('/:id', authenticate, requireRole(...INTERNAL_ROLES), getEmployeeById);
router.put('/:id', authenticate, requireRole(...INTERNAL_ROLES), updateEmployee);
router.post(
  '/:id/offboard',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(offboardSchema),
  offboardEmployee
);

export default router;
