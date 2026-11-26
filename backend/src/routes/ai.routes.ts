import { Router } from 'express';
import { z } from 'zod';
import {
  getRecommendations,
  aiGenerateJd,
  aiInterviewQuestions,
  aiDraftOffer,
} from '../controllers/ai.controller.js';
import { authenticate, requireRole, HIRING_ROLES, HR_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

const jdSchema = z.object({
  title: z.string().min(2).max(200),
  department: z.string().min(2).max(120),
  location: z.string().max(150).optional(),
  employmentType: z.string().max(40).optional(),
  skills: z.array(z.string().max(80)).optional(),
});

const questionsSchema = z.object({
  jobTitle: z.string().min(2).max(200),
  jobDescription: z.string().max(10000).optional(),
  resumeText: z.string().max(15000).optional(),
  roundType: z.string().max(100).optional(),
});

const offerDraftSchema = z.object({
  candidateName: z.string().min(1).max(150),
  jobTitle: z.string().min(2).max(200),
  salary: z.number().positive(),
  currency: z.string().max(10).optional().default('USD'),
  startDate: z.string().min(4),
  employmentType: z.string().max(40).optional().default('Full-Time'),
  benefits: z.string().max(2000).optional(),
});

router.get('/recommendations', authenticate, requireRole('Candidate'), aiLimiter, getRecommendations);
router.post('/recommendations', authenticate, requireRole('Candidate'), aiLimiter, getRecommendations);

router.post('/generate-jd', authenticate, requireRole(...HIRING_ROLES), aiLimiter, validateBody(jdSchema), aiGenerateJd);
router.post('/interview-questions', authenticate, requireRole(...HIRING_ROLES), aiLimiter, validateBody(questionsSchema), aiInterviewQuestions);
router.post('/draft-offer', authenticate, requireRole(...HR_ROLES), aiLimiter, validateBody(offerDraftSchema), aiDraftOffer);

export default router;
