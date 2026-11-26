import { Router } from 'express';
import { z } from 'zod';
import {
  getAssets,
  createAsset,
  assignAsset,
  returnAsset,
  deleteAsset,
} from '../controllers/assets.controller.js';
import { authenticate, requireRole, HR_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const assetSchema = z.object({
  assetTag: z.string().max(40).optional(),
  name: z.string().min(2).max(200),
  category: z
    .enum(['Laptop', 'Monitor', 'Phone', 'Access Card', 'Furniture', 'Software License', 'Other'])
    .optional()
    .default('Laptop'),
  serialNumber: z.string().max(120).optional().default(''),
  purchaseDate: z.string().nullable().optional(),
  purchaseCost: z.number().nonnegative().nullable().optional(),
  notes: z.string().max(1000).optional().default(''),
});

const assignSchema = z.object({
  employeeId: z.string().uuid(),
  notes: z.string().max(500).optional().default(''),
});

router.get('/', authenticate, requireRole(...INTERNAL_ROLES), getAssets);
router.post('/', authenticate, requireRole(...HR_ROLES), validateBody(assetSchema), createAsset);
router.post('/:id/assign', authenticate, requireRole(...HR_ROLES), validateBody(assignSchema), assignAsset);
router.post('/:id/return', authenticate, requireRole(...HR_ROLES), returnAsset);
router.delete('/:id', authenticate, requireRole(...HR_ROLES), deleteAsset);

export default router;
