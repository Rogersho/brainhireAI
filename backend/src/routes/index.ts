import { Router } from 'express';
import authRoutes from './auth.routes.js';
import jobsRoutes from './jobs.routes.js';
import applicantsRoutes from './applicants.routes.js';
import screeningRoutes from './screening.routes.js';
import notificationsRoutes from './notifications.routes.js';
import uploadRoutes from './upload.routes.js';
import userRoutes from './user.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', database: 'postgresql' });
});

router.use('/auth', authRoutes);
router.use('/jobs', jobsRoutes);
router.use('/applicants', applicantsRoutes);
router.use('/screening', screeningRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/upload', uploadRoutes);
router.use('/user', userRoutes);
router.use('/ai', aiRoutes);

export default router;
