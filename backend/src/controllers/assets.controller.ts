import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.service.js';

async function generateAssetTag(): Promise<string> {
  const res = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM company_assets');
  let seq = Number(res.rows[0]?.count || 0) + 1;
  for (let i = 0; i < 40; i++) {
    const tag = `AST-${String(seq).padStart(4, '0')}`;
    const dup = await query('SELECT 1 FROM company_assets WHERE asset_tag = $1', [tag]);
    if (dup.rows.length === 0) return tag;
    seq += 1;
  }
  return `AST-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function getAssets(
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
      where = 'WHERE a.assigned_employee_id = $1';
    }

    const result = await query(
      `SELECT a.*, e.first_name, e.last_name, e.employee_code
       FROM company_assets a
       LEFT JOIN employees e ON e.id = a.assigned_employee_id
       ${where}
       ORDER BY a.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        assetTag: r.asset_tag,
        name: r.name,
        category: r.category,
        serialNumber: r.serial_number,
        purchaseDate: r.purchase_date,
        purchaseCost: r.purchase_cost !== null ? Number(r.purchase_cost) : null,
        status: r.status,
        assignedEmployeeId: r.assigned_employee_id,
        assignedEmployeeName: r.first_name ? `${r.first_name} ${r.last_name}`.trim() : null,
        assignedEmployeeCode: r.employee_code || null,
        assignedAt: r.assigned_at,
        notes: r.notes,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createAsset(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { assetTag, name, category, serialNumber, purchaseDate, purchaseCost, notes } = req.body;
    const tag = assetTag?.trim() ? assetTag.trim().toUpperCase() : await generateAssetTag();

    const inserted = await query(
      `INSERT INTO company_assets
         (asset_tag, name, category, serial_number, purchase_date, purchase_cost, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Available')
       RETURNING *`,
      [tag, name.trim(), category || 'Laptop', serialNumber || '', purchaseDate || null, purchaseCost ?? null, notes || '']
    );

    await logAudit({
      req,
      action: 'ASSET_CREATED',
      entityType: 'company_asset',
      entityId: inserted.rows[0].id,
      metadata: { assetTag: tag, name },
    });

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ success: false, error: 'Asset tag already exists' });
      return;
    }
    next(err);
  }
}

export async function assignAsset(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { employeeId, notes } = req.body as { employeeId: string; notes?: string };
    if (!isValidUuid(id) || !isValidUuid(employeeId)) {
      res.status(400).json({ success: false, error: 'Invalid asset or employee ID' });
      return;
    }

    await query(
      `UPDATE company_assets
       SET assigned_employee_id = $1, assigned_at = NOW(), status = 'Assigned'
       WHERE id = $2`,
      [employeeId, id]
    );

    await query(
      `INSERT INTO asset_history (asset_id, employee_id, action, performed_by, notes)
       VALUES ($1, $2, 'Assigned', $3, $4)`,
      [id, employeeId, req.user!.id, notes || '']
    );

    res.json({ success: true, message: 'Asset assigned.' });
  } catch (err) {
    next(err);
  }
}

export async function returnAsset(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid asset ID' });
      return;
    }

    const prev = await query<{ assigned_employee_id: string | null }>(
      'SELECT assigned_employee_id FROM company_assets WHERE id = $1',
      [id]
    );
    if (prev.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Asset not found' });
      return;
    }

    await query(
      `UPDATE company_assets SET assigned_employee_id = NULL, assigned_at = NULL, status = 'Available' WHERE id = $1`,
      [id]
    );

    await query(
      `INSERT INTO asset_history (asset_id, employee_id, action, performed_by, notes)
       VALUES ($1, $2, 'Returned', $3, $4)`,
      [id, prev.rows[0].assigned_employee_id, req.user!.id, req.body?.notes || 'Returned to inventory']
    );

    res.json({ success: true, message: 'Asset returned to inventory.' });
  } catch (err) {
    next(err);
  }
}

export async function deleteAsset(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid asset ID' });
      return;
    }
    await query('DELETE FROM company_assets WHERE id = $1', [id]);
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}
