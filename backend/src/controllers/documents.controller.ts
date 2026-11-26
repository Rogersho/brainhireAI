import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole } from '../middleware/auth.js';
import {
  buildDocumentKey,
  deleteFileFromS3,
  getPresignedDownloadUrl,
  isStorageConfigured,
  uploadFileToS3,
} from '../services/storage.service.js';
import { logAudit } from '../services/audit.service.js';

const ALLOWED_DOC_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function getExpiringDocuments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const withinDays = Math.min(365, Math.max(7, Number(req.query.days) || 60));
    const result = await query(
      `SELECT doc.*, e.first_name, e.last_name, e.employee_code
       FROM employee_documents doc
       JOIN employees e ON e.id = doc.employee_id
       WHERE doc.expiry_date IS NOT NULL
         AND doc.expiry_date <= CURRENT_DATE + ($1 || ' days')::interval
         AND e.status != 'Terminated'
       ORDER BY doc.expiry_date ASC`,
      [withinDays]
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeCode: r.employee_code,
        employeeName: `${r.first_name} ${r.last_name}`.trim(),
        title: r.title,
        category: r.category,
        fileName: r.file_name,
        expiryDate: r.expiry_date,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getEmployeeDocuments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { employeeId } = req.params;
    if (!isValidUuid(employeeId)) {
      res.status(400).json({ success: false, error: 'Invalid employee ID' });
      return;
    }

    const empRes = await query<{ id: string; user_id: string | null }>(
      'SELECT id, user_id FROM employees WHERE id = $1',
      [employeeId]
    );
    if (empRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    const user = req.user!;
    const hrAccess = isHrRole(user.role);
    const isSelf = empRes.rows[0].user_id === user.id;

    if (!hrAccess && !isSelf) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: confidential employee documents require HR access',
      });
      return;
    }

    const visibilityClause = hrAccess ? '' : 'AND doc.is_visible_to_employee = TRUE';
    const result = await query(
      `SELECT doc.*, u.name AS uploaded_by_name
       FROM employee_documents doc
       LEFT JOIN users u ON u.id = doc.uploaded_by
       WHERE doc.employee_id = $1 ${visibilityClause}
       ORDER BY doc.created_at DESC`,
      [employeeId]
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        title: r.title,
        category: r.category,
        fileName: r.file_name,
        mimeType: r.mime_type,
        fileSizeBytes: r.file_size_bytes,
        expiryDate: r.expiry_date,
        isVisibleToEmployee: r.is_visible_to_employee,
        uploadedByName: r.uploaded_by_name || null,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadEmployeeDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { employeeId } = req.params;
    if (!isValidUuid(employeeId)) {
      res.status(400).json({ success: false, error: 'Invalid employee ID' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No document file uploaded' });
      return;
    }

    if (!ALLOWED_DOC_MIMES.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        error: 'Unsupported file type. Upload PDF, PNG, JPG, WEBP, DOC, DOCX, or TXT.',
      });
      return;
    }

    if (!isStorageConfigured()) {
      res.status(503).json({ success: false, error: 'Cloud document storage is not configured' });
      return;
    }

    const empExists = await query('SELECT id FROM employees WHERE id = $1', [employeeId]);
    if (empExists.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    const title = (req.body.title as string)?.trim() || file.originalname;
    const rawCategory = (req.body.category as string) || 'Other';
    const validCategories = [
      'Contract',
      'ID / Passport',
      'NDA',
      'Tax Form',
      'Certificate',
      'Offer Letter',
      'Resume',
      'Other',
    ];
    const category = validCategories.includes(rawCategory) ? rawCategory : 'Other';
    const expiryDate = (req.body.expiryDate as string)?.trim() || null;
    const isVisibleToEmployee = req.body.isVisibleToEmployee !== 'false';

    const key = buildDocumentKey(employeeId, file.originalname);
    const uploaded = await uploadFileToS3(file.buffer, key, file.mimetype);

    const inserted = await query(
      `INSERT INTO employee_documents
         (employee_id, title, category, s3_key, file_name, mime_type, file_size_bytes, expiry_date, uploaded_by, is_visible_to_employee)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        employeeId,
        title,
        category,
        uploaded.key,
        file.originalname,
        file.mimetype,
        file.size,
        expiryDate,
        req.user!.id,
        isVisibleToEmployee,
      ]
    );

    const doc = inserted.rows[0];
    await logAudit({
      req,
      action: 'EMPLOYEE_DOCUMENT_UPLOADED',
      entityType: 'employee_document',
      entityId: doc.id,
      metadata: { employeeId, title, category, fileName: file.originalname },
    });

    res.status(201).json({
      success: true,
      data: {
        id: doc.id,
        employeeId: doc.employee_id,
        title: doc.title,
        category: doc.category,
        fileName: doc.file_name,
        mimeType: doc.mime_type,
        fileSizeBytes: doc.file_size_bytes,
        expiryDate: doc.expiry_date,
        isVisibleToEmployee: doc.is_visible_to_employee,
        downloadUrl: uploaded.url,
        createdAt: doc.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentDownloadUrl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { docId } = req.params;
    if (!isValidUuid(docId)) {
      res.status(400).json({ success: false, error: 'Invalid document ID' });
      return;
    }

    const docRes = await query<{
      id: string;
      s3_key: string;
      file_name: string;
      is_visible_to_employee: boolean;
      employee_user_id: string | null;
    }>(
      `SELECT doc.id, doc.s3_key, doc.file_name, doc.is_visible_to_employee, e.user_id AS employee_user_id
       FROM employee_documents doc
       JOIN employees e ON e.id = doc.employee_id
       WHERE doc.id = $1`,
      [docId]
    );

    if (docRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    const doc = docRes.rows[0];
    const user = req.user!;
    const hrAccess = isHrRole(user.role);
    const isSelfAllowed = doc.employee_user_id === user.id && doc.is_visible_to_employee;

    if (!hrAccess && !isSelfAllowed) {
      res.status(403).json({ success: false, error: 'Forbidden: cannot access this document' });
      return;
    }

    const url = await getPresignedDownloadUrl(doc.s3_key);
    res.json({ success: true, data: { url, fileName: doc.file_name } });
  } catch (err) {
    next(err);
  }
}

export async function deleteEmployeeDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { docId } = req.params;
    if (!isValidUuid(docId)) {
      res.status(400).json({ success: false, error: 'Invalid document ID' });
      return;
    }

    const docRes = await query<{ id: string; s3_key: string; employee_id: string; title: string }>(
      'DELETE FROM employee_documents WHERE id = $1 RETURNING id, s3_key, employee_id, title',
      [docId]
    );

    if (docRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    const doc = docRes.rows[0];
    // Only delete from S3 if it lives in hr-docs (avoid deleting shared application resumes)
    if (doc.s3_key.startsWith('uploads/hr-docs/')) {
      await deleteFileFromS3(doc.s3_key);
    }

    await logAudit({
      req,
      action: 'EMPLOYEE_DOCUMENT_DELETED',
      entityType: 'employee_document',
      entityId: doc.id,
      metadata: { employeeId: doc.employee_id, title: doc.title },
    });

    res.json({ success: true, data: { id: doc.id, message: 'Document deleted' } });
  } catch (err) {
    next(err);
  }
}
