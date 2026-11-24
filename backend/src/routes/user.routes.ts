import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  getProfile,
  uploadProfileResume,
  toggleSavedJob,
} from '../controllers/user.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const savedJobSchema = z.object({
  jobId: z.string().uuid('Valid jobId is required'),
});

router.get('/profile', authenticate, getProfile);
router.post(
  '/profile',
  authenticate,
  requireRole('Candidate'),
  aiLimiter,
  upload.single('file'),
  uploadProfileResume
);
router.post(
  '/saved-jobs',
  authenticate,
  requireRole('Candidate'),
  validateBody(savedJobSchema),
  toggleSavedJob
);

export default router;
