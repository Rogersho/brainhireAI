import { Router } from 'express';
import { z } from 'zod';
import {
  getCompensationProfiles,
  upsertCompensationProfile,
  getPayrollRuns,
  getPayrollRunDetail,
  createPayrollRun,
  updateDraftPayslip,
  finalizePayrollRun,
  getMyPayslips,
} from '../controllers/payroll.controller.js';
import { authenticate, requireRole, HR_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const compensationSchema = z.object({
  baseSalary: z.number().positive(),
  currency: z.string().min(3).max(10).optional().default('USD'),
  payFrequency: z.enum(['Monthly', 'Bi-Weekly']).optional().default('Monthly'),
  allowances: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        amount: z.number().nonnegative().optional(),
        percent: z.number().min(0).max(100).optional(),
      })
    )
    .optional()
    .default([]),
  deductions: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        amount: z.number().nonnegative().optional(),
        percent: z.number().min(0).max(100).optional(),
      })
    )
    .optional()
    .default([]),
  bankName: z.string().max(120).optional().default(''),
  bankAccountLast4: z.string().max(10).optional().default(''),
  paymentMethod: z.enum(['Bank Transfer', 'Direct Deposit', 'Check']).optional().default('Bank Transfer'),
  effectiveFrom: z.string().optional(),
});

const createRunSchema = z.object({
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12),
});

const finalizeSchema = z.object({
  action: z.enum(['approve', 'mark-paid']),
});

router.get('/compensation', authenticate, requireRole(...HR_ROLES), getCompensationProfiles);
router.post(
  '/compensation/:employeeId',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(compensationSchema),
  upsertCompensationProfile
);

router.get('/runs', authenticate, requireRole(...HR_ROLES), getPayrollRuns);
router.post('/runs', authenticate, requireRole(...HR_ROLES), validateBody(createRunSchema), createPayrollRun);
router.get('/runs/:id', authenticate, requireRole(...HR_ROLES), getPayrollRunDetail);
router.post('/runs/:id/finalize', authenticate, requireRole(...HR_ROLES), validateBody(finalizeSchema), finalizePayrollRun);
router.patch('/payslips/:id', authenticate, requireRole(...HR_ROLES), updateDraftPayslip);

router.get('/payslips/me', authenticate, requireRole(...INTERNAL_ROLES), getMyPayslips);

export default router;
