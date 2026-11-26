import { Router } from 'express';
import { z } from 'zod';
import { register, login, logout, me, updateMyAccount } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  role: z
    .enum(['Recruiter', 'HRManager', 'HiringManager', 'Admin', 'Candidate'])
    .optional()
    .default('Candidate'),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const updateMeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
});

router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, validateBody(updateMeSchema), updateMyAccount);

export default router;
