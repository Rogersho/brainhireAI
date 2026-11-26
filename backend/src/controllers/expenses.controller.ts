import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole } from '../middleware/auth.js';
import {
  buildExpenseReceiptKey,
  getPresignedDownloadUrl,
  isStorageConfigured,
  uploadFileToS3,
} from '../services/storage.service.js';
import { logAudit } from '../services/audit.service.js';

export async function getExpenses(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const params: unknown[] = [];
    let where = '';

    if (!isHrRole(user.role)) {
      const empRes = await query<{ id: string }>(
        'SELECT id FROM employees WHERE user_id = $1 LIMIT 1',
        [user.id]
      );
      if (empRes.rows.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }
      params.push(empRes.rows[0].id);
      where =
        user.role === 'HiringManager'
          ? 'WHERE ec.employee_id = $1 OR e.manager_id = $1'
          : 'WHERE ec.employee_id = $1';
    }

    const result = await query(
      `SELECT ec.*, e.first_name, e.last_name, e.employee_code, d.name AS department_name
       FROM expense_claims ec
       JOIN employees e ON e.id = ec.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       ${where}
       ORDER BY ec.created_at DESC
       LIMIT 150`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeCode: r.employee_code,
        employeeName: `${r.first_name} ${r.last_name}`.trim(),
        departmentName: r.department_name || null,
        title: r.title,
        category: r.category,
        amount: Number(r.amount),
        currency: r.currency,
        expenseDate: r.expense_date,
        description: r.description,
        hasReceipt: Boolean(r.receipt_s3_key),
        status: r.status,
        reviewNote: r.review_note,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createExpense(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empRes = await query<{ id: string }>(
      'SELECT id FROM employees WHERE user_id = $1 LIMIT 1',
      [req.user!.id]
    );
    if (empRes.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No employee profile linked to your account.',
      });
      return;
    }

    const title = String(req.body.title || '').trim();
    const amount = Number(req.body.amount);
    if (!title || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, error: 'Valid title and positive amount are required.' });
      return;
    }

    const validCats = ['Travel', 'Meals', 'Software', 'Equipment', 'Training', 'Other'];
    const category = validCats.includes(req.body.category) ? req.body.category : 'Other';
    const currency = String(req.body.currency || 'USD').toUpperCase().slice(0, 10);
    const expenseDate = req.body.expenseDate || new Date().toISOString().slice(0, 10);
    const description = String(req.body.description || '');

    let receiptKey: string | null = null;
    if (req.file && isStorageConfigured()) {
      const key = buildExpenseReceiptKey(req.user!.id, req.file.originalname);
      const uploaded = await uploadFileToS3(req.file.buffer, key, req.file.mimetype);
      receiptKey = uploaded.key;
    }

    const inserted = await query(
      `INSERT INTO expense_claims
         (employee_id, title, category, amount, currency, expense_date, description, receipt_s3_key, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pending')
       RETURNING *`,
      [empRes.rows[0].id, title, category, amount, currency, expenseDate, description, receiptKey]
    );

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function getExpenseReceiptUrl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid expense ID' });
      return;
    }

    const expRes = await query<{ receipt_s3_key: string | null; user_id: string | null }>(
      `SELECT ec.receipt_s3_key, e.user_id
       FROM expense_claims ec
       JOIN employees e ON e.id = ec.employee_id
       WHERE ec.id = $1`,
      [id]
    );
    if (expRes.rows.length === 0 || !expRes.rows[0].receipt_s3_key) {
      res.status(404).json({ success: false, error: 'Receipt not found' });
      return;
    }

    if (!isHrRole(req.user!.role) && expRes.rows[0].user_id !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const url = await getPresignedDownloadUrl(expRes.rows[0].receipt_s3_key);
    res.json({ success: true, data: { url } });
  } catch (err) {
    next(err);
  }
}

export async function reviewExpense(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid expense ID' });
      return;
    }
    const { decision, reviewNote } = req.body as {
      decision: 'Approved' | 'Rejected';
      reviewNote?: string;
    };

    const updated = await query(
      `UPDATE expense_claims
       SET status = $1, reviewed_by = $2, review_note = $3
       WHERE id = $4 AND status = 'Pending'
       RETURNING *`,
      [decision, req.user!.id, reviewNote || '', id]
    );

    if (updated.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Pending expense claim not found' });
      return;
    }

    await logAudit({
      req,
      action: `EXPENSE_${decision.toUpperCase()}`,
      entityType: 'expense_claim',
      entityId: id,
    });

    res.json({ success: true, message: `Expense ${decision.toLowerCase()}.` });
  } catch (err) {
    next(err);
  }
}
