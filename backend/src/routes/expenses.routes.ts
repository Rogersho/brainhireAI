import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  getExpenses,
  createExpense,
  getExpenseReceiptUrl,
  reviewExpense,
} from '../controllers/expenses.controller.js';
import { authenticate, requireRole, HIRING_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const reviewSchema = z.object({
  decision: z.enum(['Approved', 'Rejected']),
  reviewNote: z.string().max(500).optional().default(''),
});

router.get('/', authenticate, requireRole(...INTERNAL_ROLES), getExpenses);
router.post('/', authenticate, requireRole(...INTERNAL_ROLES), upload.single('receipt'), createExpense);
router.get('/:id/receipt', authenticate, requireRole(...INTERNAL_ROLES), getExpenseReceiptUrl);
router.patch('/:id/review', authenticate, requireRole(...HIRING_ROLES), validateBody(reviewSchema), reviewExpense);

export default router;
