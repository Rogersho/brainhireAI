import { Router } from 'express';
import multer from 'multer';
import {
  getExpiringDocuments,
  getEmployeeDocuments,
  uploadEmployeeDocument,
  getDocumentDownloadUrl,
  deleteEmployeeDocument,
} from '../controllers/documents.controller.js';
import { authenticate, requireRole, HR_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

router.get('/expiring', authenticate, requireRole(...HR_ROLES), getExpiringDocuments);
router.get('/employee/:employeeId', authenticate, requireRole(...INTERNAL_ROLES), getEmployeeDocuments);
router.post(
  '/employee/:employeeId',
  authenticate,
  requireRole(...HR_ROLES),
  upload.single('file'),
  uploadEmployeeDocument
);
router.get('/:docId/download', authenticate, requireRole(...INTERNAL_ROLES), getDocumentDownloadUrl);
router.delete('/:docId', authenticate, requireRole(...HR_ROLES), deleteEmployeeDocument);

export default router;
