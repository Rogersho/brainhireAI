import { Router } from 'express';
import { z } from 'zod';
import {
  getCompanySettings,
  updateCompanySettings,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getLocations,
  createLocation,
  deleteLocation,
  getPositions,
  createPosition,
  deletePosition,
} from '../controllers/organization.controller.js';
import { authenticate, requireRole, HR_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const companySchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  legalName: z.string().max(200).optional(),
  industry: z.string().max(120).optional(),
  companySize: z.string().max(60).optional(),
  website: z.string().max(255).optional(),
  description: z.string().max(4000).optional(),
  defaultCurrency: z.string().min(3).max(10).optional(),
  timezone: z.string().max(80).optional(),
  workWeekDays: z.array(z.string().max(10)).optional(),
  fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
});

const departmentSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().max(30).optional().default(''),
  description: z.string().max(1000).optional().default(''),
  headUserId: z.string().uuid().nullable().optional(),
  parentDepartmentId: z.string().uuid().nullable().optional(),
  budgetAmount: z.number().nonnegative().nullable().optional(),
});

const locationSchema = z.object({
  name: z.string().min(2).max(150),
  city: z.string().max(120).optional().default(''),
  country: z.string().max(120).optional().default(''),
  timezone: z.string().max(80).optional().default('UTC'),
  address: z.string().max(500).optional().default(''),
  isHeadquarters: z.boolean().optional().default(false),
});

const positionSchema = z.object({
  title: z.string().min(2).max(200),
  departmentId: z.string().uuid().nullable().optional(),
  grade: z.string().max(50).optional().default(''),
  minSalary: z.number().nonnegative().nullable().optional(),
  maxSalary: z.number().nonnegative().nullable().optional(),
  currency: z.string().max(10).optional().default('USD'),
  description: z.string().max(2000).optional().default(''),
});

// Company profile
router.get('/company', authenticate, getCompanySettings);
router.put('/company', authenticate, requireRole(...HR_ROLES), validateBody(companySchema), updateCompanySettings);

// Departments
router.get('/departments', authenticate, requireRole(...INTERNAL_ROLES), getDepartments);
router.post('/departments', authenticate, requireRole(...HR_ROLES), validateBody(departmentSchema), createDepartment);
router.put('/departments/:id', authenticate, requireRole(...HR_ROLES), validateBody(departmentSchema.partial()), updateDepartment);
router.delete('/departments/:id', authenticate, requireRole(...HR_ROLES), deleteDepartment);

// Locations
router.get('/locations', authenticate, requireRole(...INTERNAL_ROLES), getLocations);
router.post('/locations', authenticate, requireRole(...HR_ROLES), validateBody(locationSchema), createLocation);
router.delete('/locations/:id', authenticate, requireRole(...HR_ROLES), deleteLocation);

// Job Positions
router.get('/positions', authenticate, requireRole(...INTERNAL_ROLES), getPositions);
router.post('/positions', authenticate, requireRole(...HR_ROLES), validateBody(positionSchema), createPosition);
router.delete('/positions/:id', authenticate, requireRole(...HR_ROLES), deletePosition);

export default router;
