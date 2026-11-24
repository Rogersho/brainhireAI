import { Router } from 'express';
import multer from 'multer';
import { uploadPdf } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

router.post('/', authenticate, aiLimiter, upload.single('file'), uploadPdf);

export default router;
