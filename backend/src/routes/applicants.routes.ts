import { Router } from 'express';
import { z } from 'zod';
import {
  getApplicants,
  getApplicantById,
  getApplicantResumeUrl,
  createApplicant,
  updateApplicant,
  deleteApplicant,
} from '../controllers/applicants.controller.js';
import { authenticate, requireRole, HIRING_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createApplicantSchema = z.object({
  jobId: z.string().uuid('Valid jobId is required'),
  name: z.string().min(1).max(150).optional(),
  role: z.string().min(1).max(200).optional(),
  experience: z.string().min(1, 'Resume/experience content is required').max(20000),
  source: z.string().max(100).optional(),
  skills: z.array(z.string().max(80)).optional(),
  resumeUrl: z.string().url().optional().or(z.literal('')).nullable(),
  resumeKey: z.string().max(500).optional().nullable(),
});

const updateApplicantSchema = z.object({
  status: z
    .enum([
      'Applied',
      'Pending',
      'Screening',
      'In Review',
      'Shortlisted',
      'Interview',
      'Assessment',
      'Offer',
      'Hired',
      'Rejected',
      'Withdrawn',
    ])
    .optional(),
  score: z.number().min(0).max(100).optional(),
  skills: z.array(z.string().max(80)).optional(),
  experience: z.string().max(20000).optional(),
  resumeUrl: z.string().nullable().optional(),
  resumeKey: z.string().max(500).nullable().optional(),
  source: z.string().max(100).optional(),
  name: z.string().min(1).max(150).optional(),
  role: z.string().min(1).max(200).optional(),
});

// Every applicant endpoint requires authentication + role/ownership authorization
router.get('/', authenticate, getApplicants);
router.post('/', authenticate, validateBody(createApplicantSchema), createApplicant);
router.get('/:id/resume', authenticate, getApplicantResumeUrl);
router.get('/:id', authenticate, getApplicantById);
router.put(
  '/:id',
  authenticate,
  requireRole(...HIRING_ROLES),
  validateBody(updateApplicantSchema),
  updateApplicant
);
router.delete('/:id', authenticate, deleteApplicant);

export default router;
