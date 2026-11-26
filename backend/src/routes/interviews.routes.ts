import { Router } from 'express';
import { z } from 'zod';
import {
  getInterviews,
  createInterview,
  updateInterview,
  getScorecards,
  submitScorecard,
} from '../controllers/interviews.controller.js';
import { authenticate, requireRole, HIRING_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createInterviewSchema = z.object({
  applicantId: z.string().uuid(),
  title: z.string().min(2).max(200),
  roundNumber: z.number().int().min(1).max(10).optional().default(1),
  scheduledAt: z.string().min(8),
  durationMinutes: z.number().int().min(15).max(240).optional().default(45),
  mode: z.enum(['Video', 'In-Person', 'Phone']).optional().default('Video'),
  meetingLink: z.string().max(500).optional().default(''),
  interviewerIds: z.array(z.string().uuid()).optional(),
  notes: z.string().max(2000).optional().default(''),
});

const updateInterviewSchema = z.object({
  status: z.enum(['Scheduled', 'Completed', 'Cancelled', 'No-Show']).optional(),
  scheduledAt: z.string().optional(),
  meetingLink: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

const scorecardSchema = z.object({
  technicalScore: z.number().int().min(1).max(5),
  communicationScore: z.number().int().min(1).max(5),
  problemSolvingScore: z.number().int().min(1).max(5),
  cultureFitScore: z.number().int().min(1).max(5),
  overallRecommendation: z.enum(['Strong Hire', 'Hire', 'Neutral', 'No Hire']),
  strengthsNotes: z.string().max(3000).optional().default(''),
  concernsNotes: z.string().max(3000).optional().default(''),
});

router.get('/', authenticate, getInterviews);
router.post('/', authenticate, requireRole(...HIRING_ROLES), validateBody(createInterviewSchema), createInterview);
router.patch('/:id', authenticate, requireRole(...HIRING_ROLES), validateBody(updateInterviewSchema), updateInterview);
router.get('/:id/scorecards', authenticate, requireRole(...HIRING_ROLES), getScorecards);
router.post('/:id/scorecard', authenticate, requireRole(...HIRING_ROLES), validateBody(scorecardSchema), submitScorecard);

export default router;
