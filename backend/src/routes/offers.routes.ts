import { Router } from 'express';
import { z } from 'zod';
import {
  getOffers,
  createOffer,
  sendOffer,
  respondToOffer,
  deleteOffer,
} from '../controllers/offers.controller.js';
import { authenticate, requireRole, HR_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createOfferSchema = z.object({
  applicantId: z.string().uuid(),
  proposedSalary: z.number().positive(),
  currency: z.string().max(10).optional().default('USD'),
  startDate: z.string().min(4),
  employmentType: z.enum(['Full-Time', 'Part-Time', 'Contract', 'Intern']).optional().default('Full-Time'),
  benefitsSummary: z.string().max(2000).optional().default(''),
  customTerms: z.string().max(2000).optional().default(''),
  offerLetterText: z.string().max(15000).optional().default(''),
  expiresAt: z.string().optional().nullable(),
  sendImmediately: z.boolean().optional().default(false),
});

const respondSchema = z.object({
  decision: z.enum(['Accepted', 'Declined']),
});

router.get('/', authenticate, getOffers);
router.post('/', authenticate, requireRole(...HR_ROLES), validateBody(createOfferSchema), createOffer);
router.post('/:id/send', authenticate, requireRole(...HR_ROLES), sendOffer);
router.post('/:id/respond', authenticate, validateBody(respondSchema), respondToOffer);
router.delete('/:id', authenticate, requireRole(...HR_ROLES), deleteOffer);

export default router;
