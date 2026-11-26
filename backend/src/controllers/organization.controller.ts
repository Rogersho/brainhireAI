import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { logAudit } from '../services/audit.service.js';

// ============================================================================
// COMPANY SETTINGS
// ============================================================================
export async function getCompanySettings(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query('SELECT * FROM company_settings ORDER BY created_at ASC LIMIT 1');
    if (result.rows.length === 0) {
      const inserted = await query(
        `INSERT INTO company_settings (company_name) VALUES ('Hoobe HR') RETURNING *`
      );
      res.json({ success: true, data: serializeCompany(inserted.rows[0]) });
      return;
    }
    res.json({ success: true, data: serializeCompany(result.rows[0]) });
  } catch (err) {
    next(err);
  }
}

export async function updateCompanySettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      companyName,
      legalName,
      industry,
      companySize,
      website,
      description,
      defaultCurrency,
      timezone,
      workWeekDays,
      fiscalYearStartMonth,
    } = req.body;

    const existing = await query<{ id: string }>(
      'SELECT id FROM company_settings ORDER BY created_at ASC LIMIT 1'
    );

    let row;
    if (existing.rows.length === 0) {
      const ins = await query(
        `INSERT INTO company_settings
           (company_name, legal_name, industry, company_size, website, description,
            default_currency, timezone, work_week_days, fiscal_year_start_month)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          companyName ?? 'Hoobe HR',
          legalName ?? '',
          industry ?? '',
          companySize ?? '',
          website ?? '',
          description ?? '',
          defaultCurrency ?? 'USD',
          timezone ?? 'UTC',
          workWeekDays ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          fiscalYearStartMonth ?? 1,
        ]
      );
      row = ins.rows[0];
    } else {
      const upd = await query(
        `UPDATE company_settings
         SET company_name = COALESCE($1, company_name),
             legal_name = COALESCE($2, legal_name),
             industry = COALESCE($3, industry),
             company_size = COALESCE($4, company_size),
             website = COALESCE($5, website),
             description = COALESCE($6, description),
             default_currency = COALESCE($7, default_currency),
             timezone = COALESCE($8, timezone),
             work_week_days = COALESCE($9, work_week_days),
             fiscal_year_start_month = COALESCE($10, fiscal_year_start_month)
         WHERE id = $11
         RETURNING *`,
        [
          companyName ?? null,
          legalName ?? null,
          industry ?? null,
          companySize ?? null,
          website ?? null,
          description ?? null,
          defaultCurrency ?? null,
          timezone ?? null,
          workWeekDays ?? null,
          fiscalYearStartMonth ?? null,
          existing.rows[0].id,
        ]
      );
      row = upd.rows[0];
    }

    await logAudit({
      req,
      action: 'COMPANY_SETTINGS_UPDATED',
      entityType: 'company_settings',
      entityId: row.id,
      metadata: { companyName: row.company_name },
    });

    res.json({ success: true, data: serializeCompany(row) });
  } catch (err) {
    next(err);
  }
}

function serializeCompany(row: any) {
  return {
    id: row.id,
    companyName: row.company_name,
    legalName: row.legal_name,
    industry: row.industry,
    companySize: row.company_size,
    website: row.website,
    description: row.description,
    defaultCurrency: row.default_currency,
    timezone: row.timezone,
    workWeekDays: row.work_week_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    fiscalYearStartMonth: row.fiscal_year_start_month,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// DEPARTMENTS
// ============================================================================
export async function getDepartments(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query(
      `SELECT d.*,
              u.name AS head_name,
              u.email AS head_email,
              p.name AS parent_name,
              (SELECT COUNT(*)::int FROM employees e WHERE e.department_id = d.id AND e.status != 'Terminated') AS employee_count
       FROM departments d
       LEFT JOIN users u ON u.id = d.head_user_id
       LEFT JOIN departments p ON p.id = d.parent_department_id
       ORDER BY d.name ASC`
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description,
        headUserId: r.head_user_id,
        headName: r.head_name || null,
        headEmail: r.head_email || null,
        parentDepartmentId: r.parent_department_id,
        parentDepartmentName: r.parent_name || null,
        budgetAmount: r.budget_amount !== null ? Number(r.budget_amount) : null,
        employeeCount: r.employee_count || 0,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createDepartment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, code, description, headUserId, parentDepartmentId, budgetAmount } = req.body;
    const inserted = await query(
      `INSERT INTO departments (name, code, description, head_user_id, parent_department_id, budget_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name.trim(),
        (code || '').trim().toUpperCase(),
        description || '',
        headUserId || null,
        parentDepartmentId || null,
        budgetAmount ?? null,
      ]
    );

    const row = inserted.rows[0];
    await logAudit({
      req,
      action: 'DEPARTMENT_CREATED',
      entityType: 'department',
      entityId: row.id,
      metadata: { name: row.name, code: row.code },
    });

    res.status(201).json({ success: true, data: row });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ success: false, error: 'A department with this name already exists' });
      return;
    }
    next(err);
  }
}

export async function updateDepartment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid department ID' });
      return;
    }

    const { name, code, description, headUserId, parentDepartmentId, budgetAmount } = req.body;
    if (parentDepartmentId && parentDepartmentId === id) {
      res.status(400).json({ success: false, error: 'Department cannot be its own parent' });
      return;
    }

    const updated = await query(
      `UPDATE departments
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           head_user_id = $4,
           parent_department_id = $5,
           budget_amount = $6
       WHERE id = $7
       RETURNING *`,
      [
        name ? name.trim() : null,
        code !== undefined ? code.trim().toUpperCase() : null,
        description !== undefined ? description : null,
        headUserId ?? null,
        parentDepartmentId ?? null,
        budgetAmount ?? null,
        id,
      ]
    );

    if (updated.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Department not found' });
      return;
    }

    await logAudit({
      req,
      action: 'DEPARTMENT_UPDATED',
      entityType: 'department',
      entityId: id,
      metadata: { name: updated.rows[0].name },
    });

    res.json({ success: true, data: updated.rows[0] });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ success: false, error: 'Department name already exists' });
      return;
    }
    next(err);
  }
}

export async function deleteDepartment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid department ID' });
      return;
    }

    const deleted = await query('DELETE FROM departments WHERE id = $1 RETURNING id, name', [id]);
    if (deleted.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Department not found' });
      return;
    }

    await logAudit({
      req,
      action: 'DEPARTMENT_DELETED',
      entityType: 'department',
      entityId: id,
      metadata: { name: deleted.rows[0].name },
    });

    res.json({ success: true, data: { id, message: 'Department deleted' } });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// LOCATIONS
// ============================================================================
export async function getLocations(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query(
      `SELECT l.*,
              (SELECT COUNT(*)::int FROM employees e WHERE e.location_id = l.id AND e.status != 'Terminated') AS employee_count
       FROM locations l
       ORDER BY l.is_headquarters DESC, l.name ASC`
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        country: r.country,
        timezone: r.timezone,
        address: r.address,
        isHeadquarters: r.is_headquarters,
        employeeCount: r.employee_count || 0,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createLocation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, city, country, timezone, address, isHeadquarters } = req.body;
    if (isHeadquarters) {
      await query('UPDATE locations SET is_headquarters = FALSE WHERE is_headquarters = TRUE');
    }

    const inserted = await query(
      `INSERT INTO locations (name, city, country, timezone, address, is_headquarters)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name.trim(),
        city || '',
        country || '',
        timezone || 'UTC',
        address || '',
        Boolean(isHeadquarters),
      ]
    );

    await logAudit({
      req,
      action: 'LOCATION_CREATED',
      entityType: 'location',
      entityId: inserted.rows[0].id,
      metadata: { name: inserted.rows[0].name },
    });

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ success: false, error: 'A location with this name already exists' });
      return;
    }
    next(err);
  }
}

export async function deleteLocation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid location ID' });
      return;
    }
    const deleted = await query('DELETE FROM locations WHERE id = $1 RETURNING id, name', [id]);
    if (deleted.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Location not found' });
      return;
    }
    await logAudit({
      req,
      action: 'LOCATION_DELETED',
      entityType: 'location',
      entityId: id,
      metadata: { name: deleted.rows[0].name },
    });
    res.json({ success: true, data: { id, message: 'Location deleted' } });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// JOB POSITIONS (INTERNAL ROLE CATALOG)
// ============================================================================
export async function getPositions(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query(
      `SELECT p.*, d.name AS department_name
       FROM job_positions p
       LEFT JOIN departments d ON d.id = p.department_id
       ORDER BY p.title ASC`
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        departmentId: r.department_id,
        departmentName: r.department_name || null,
        grade: r.grade,
        minSalary: r.min_salary !== null ? Number(r.min_salary) : null,
        maxSalary: r.max_salary !== null ? Number(r.max_salary) : null,
        currency: r.currency,
        description: r.description,
        isActive: r.is_active,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createPosition(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, departmentId, grade, minSalary, maxSalary, currency, description } = req.body;
    const inserted = await query(
      `INSERT INTO job_positions (title, department_id, grade, min_salary, max_salary, currency, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title.trim(),
        departmentId || null,
        grade || '',
        minSalary ?? null,
        maxSalary ?? null,
        currency || 'USD',
        description || '',
      ]
    );

    await logAudit({
      req,
      action: 'POSITION_CREATED',
      entityType: 'job_position',
      entityId: inserted.rows[0].id,
      metadata: { title: inserted.rows[0].title, grade: inserted.rows[0].grade },
    });

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deletePosition(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid position ID' });
      return;
    }
    const deleted = await query('DELETE FROM job_positions WHERE id = $1 RETURNING id, title', [id]);
    if (deleted.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Position not found' });
      return;
    }
    await logAudit({
      req,
      action: 'POSITION_DELETED',
      entityType: 'job_position',
      entityId: id,
      metadata: { title: deleted.rows[0].title },
    });
    res.json({ success: true, data: { id, message: 'Position deleted' } });
  } catch (err) {
    next(err);
  }
}
