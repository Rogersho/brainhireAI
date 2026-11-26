import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.service.js';

async function getEmployeeForUser(userId: string) {
  const res = await query<{
    id: string;
    first_name: string;
    last_name: string;
    manager_id: string | null;
    location_id: string | null;
  }>(
    'SELECT id, first_name, last_name, manager_id, location_id FROM employees WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  return res.rows[0] || null;
}

async function ensureBalancesForEmployee(employeeId: string, year: number): Promise<void> {
  await query(
    `INSERT INTO leave_balances (employee_id, leave_type_id, year, allocated_days)
     SELECT $1, lt.id, $2, lt.annual_allowance_days
     FROM leave_types lt
     WHERE lt.is_active = TRUE
     ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING`,
    [employeeId, year]
  );
}

async function computeWorkingDays(startStr: string, endStr: string, isHalfDay: boolean): Promise<number> {
  if (isHalfDay) return 0.5;
  const start = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(`${endStr}T00:00:00Z`);
  if (end < start) return 0;

  const holidayRes = await query<{ holiday_date: string }>(
    'SELECT holiday_date::text FROM company_holidays WHERE holiday_date BETWEEN $1 AND $2',
    [startStr, endStr]
  );
  const holidaySet = new Set(holidayRes.rows.map((h) => h.holiday_date.slice(0, 10)));

  let days = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dow = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !holidaySet.has(iso)) {
      days += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export async function getLeaveTypes(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query('SELECT * FROM leave_types ORDER BY is_paid DESC, name ASC');
    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        annualAllowanceDays: Number(r.annual_allowance_days),
        isPaid: r.is_paid,
        requiresDocument: r.requires_document,
        maxCarryoverDays: Number(r.max_carryover_days),
        colorHex: r.color_hex,
        isActive: r.is_active,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createLeaveType(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, code, annualAllowanceDays, isPaid, requiresDocument, maxCarryoverDays, colorHex } =
      req.body;
    const inserted = await query(
      `INSERT INTO leave_types (name, code, annual_allowance_days, is_paid, requires_document, max_carryover_days, color_hex)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        name.trim(),
        code.trim().toUpperCase(),
        annualAllowanceDays,
        isPaid ?? true,
        requiresDocument ?? false,
        maxCarryoverDays ?? 0,
        colorHex || '#0EA5E9',
      ]
    );
    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ success: false, error: 'Leave type name or code already exists' });
      return;
    }
    next(err);
  }
}

export async function getHolidays(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query(
      `SELECT h.*, l.name AS location_name
       FROM company_holidays h
       LEFT JOIN locations l ON l.id = h.location_id
       ORDER BY h.holiday_date ASC`
    );
    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        holidayDate: r.holiday_date,
        locationId: r.location_id,
        locationName: r.location_name || 'Company-Wide',
        isPaid: r.is_paid,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createHoliday(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, holidayDate, locationId, isPaid } = req.body;
    const inserted = await query(
      `INSERT INTO company_holidays (name, holiday_date, location_id, is_paid)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [name.trim(), holidayDate, locationId || null, isPaid ?? true]
    );
    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteHoliday(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid holiday ID' });
      return;
    }
    await query('DELETE FROM company_holidays WHERE id = $1', [id]);
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}

export async function getMyLeaveBalances(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emp = await getEmployeeForUser(req.user!.id);
    if (!emp) {
      res.json({ success: true, data: [], employeeLinked: false });
      return;
    }

    const year = Number(req.query.year) || new Date().getFullYear();
    await ensureBalancesForEmployee(emp.id, year);

    const result = await query(
      `SELECT lb.*, lt.name AS leave_type_name, lt.code, lt.is_paid, lt.color_hex
       FROM leave_balances lb
       JOIN leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.employee_id = $1 AND lb.year = $2
       ORDER BY lt.is_paid DESC, lt.name ASC`,
      [emp.id, year]
    );

    res.json({
      success: true,
      employeeLinked: true,
      data: result.rows.map((r: any) => {
        const allocated = Number(r.allocated_days) + Number(r.carried_over_days);
        const used = Number(r.used_days);
        const pending = Number(r.pending_days);
        return {
          id: r.id,
          leaveTypeId: r.leave_type_id,
          leaveTypeName: r.leave_type_name,
          code: r.code,
          isPaid: r.is_paid,
          colorHex: r.color_hex,
          year: r.year,
          allocatedDays: allocated,
          usedDays: used,
          pendingDays: pending,
          remainingDays: Math.max(0, Math.round((allocated - used - pending) * 10) / 10),
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}

export async function getLeaveRequests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const scope = typeof req.query.scope === 'string' ? req.query.scope : '';
    const params: unknown[] = [];
    let where = '';

    if (scope === 'me' || (!isHrRole(user.role) && user.role !== 'HiringManager')) {
      const emp = await getEmployeeForUser(user.id);
      if (!emp) {
        res.json({ success: true, data: [] });
        return;
      }
      params.push(emp.id);
      where = 'WHERE lr.employee_id = $1';
    } else if (user.role === 'HiringManager') {
      const emp = await getEmployeeForUser(user.id);
      if (!emp) {
        res.json({ success: true, data: [] });
        return;
      }
      params.push(emp.id);
      where = 'WHERE lr.employee_id = $1 OR e.manager_id = $1';
    }

    const result = await query(
      `SELECT lr.*,
              e.first_name, e.last_name, e.employee_code, e.job_title,
              d.name AS department_name,
              lt.name AS leave_type_name, lt.code AS leave_type_code, lt.color_hex, lt.is_paid,
              u.name AS reviewer_name
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       LEFT JOIN users u ON u.id = lr.reviewed_by
       ${where}
       ORDER BY lr.created_at DESC
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
        jobTitle: r.job_title,
        departmentName: r.department_name || null,
        leaveTypeId: r.leave_type_id,
        leaveTypeName: r.leave_type_name,
        leaveTypeCode: r.leave_type_code,
        colorHex: r.color_hex,
        isPaid: r.is_paid,
        startDate: r.start_date,
        endDate: r.end_date,
        totalDays: Number(r.total_days),
        isHalfDay: r.is_half_day,
        reason: r.reason,
        status: r.status,
        reviewerName: r.reviewer_name || null,
        reviewNote: r.review_note,
        reviewedAt: r.reviewed_at,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createLeaveRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emp = await getEmployeeForUser(req.user!.id);
    if (!emp) {
      res.status(400).json({
        success: false,
        error: 'No employee profile linked to your account. Ask HR to create your employee record first.',
      });
      return;
    }

    const { leaveTypeId, startDate, endDate, isHalfDay, reason } = req.body as {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      isHalfDay?: boolean;
      reason?: string;
    };

    if (new Date(endDate) < new Date(startDate)) {
      res.status(400).json({ success: false, error: 'End date cannot be earlier than start date.' });
      return;
    }

    const totalDays = await computeWorkingDays(startDate, endDate, Boolean(isHalfDay));
    if (totalDays <= 0) {
      res.status(400).json({
        success: false,
        error: 'Selected dates contain 0 working days (weekends/holidays only).',
      });
      return;
    }

    // Check overlapping pending/approved requests
    const overlap = await query(
      `SELECT id FROM leave_requests
       WHERE employee_id = $1
         AND status IN ('Pending', 'Approved')
         AND start_date <= $3::date
         AND end_date >= $2::date`,
      [emp.id, startDate, endDate]
    );
    if (overlap.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'You already have a pending or approved leave request overlapping these dates.',
      });
      return;
    }

    const year = new Date(`${startDate}T00:00:00Z`).getUTCFullYear();
    await ensureBalancesForEmployee(emp.id, year);

    const balRes = await query<{
      id: string;
      allocated_days: string;
      carried_over_days: string;
      used_days: string;
      pending_days: string;
      is_paid: boolean;
      lt_name: string;
    }>(
      `SELECT lb.*, lt.is_paid, lt.name AS lt_name
       FROM leave_balances lb
       JOIN leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.employee_id = $1 AND lb.leave_type_id = $2 AND lb.year = $3`,
      [emp.id, leaveTypeId, year]
    );

    if (balRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Leave type not found' });
      return;
    }

    const bal = balRes.rows[0];
    const remaining =
      Number(bal.allocated_days) +
      Number(bal.carried_over_days) -
      Number(bal.used_days) -
      Number(bal.pending_days);

    if (bal.is_paid && totalDays > remaining) {
      res.status(400).json({
        success: false,
        error: `Insufficient ${bal.lt_name} balance (${remaining} days remaining, requested ${totalDays}).`,
      });
      return;
    }

    const inserted = await query(
      `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, is_half_day, reason, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Pending')
       RETURNING *`,
      [emp.id, leaveTypeId, startDate, endDate, totalDays, Boolean(isHalfDay), reason || '']
    );

    await query(
      `UPDATE leave_balances SET pending_days = pending_days + $1 WHERE id = $2`,
      [totalDays, bal.id]
    );

    // Notify HR admins
    const hrUsers = await query<{ id: string }>(
      `SELECT id FROM users WHERE role IN ('Admin', 'HRManager') AND is_active = TRUE AND id != $1 LIMIT 5`,
      [req.user!.id]
    );
    for (const hr of hrUsers.rows) {
      await query(
        `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
         VALUES ($1, 'Calendar', 'New Leave Request', $2, 'info', FALSE, '/leave')`,
        [
          hr.id,
          `${emp.first_name} ${emp.last_name} requested ${totalDays} day(s) of ${bal.lt_name} (${startDate} to ${endDate}).`,
        ]
      );
    }

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function reviewLeaveRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid leave request ID' });
      return;
    }

    const { decision, reviewNote } = req.body as {
      decision: 'Approved' | 'Rejected';
      reviewNote?: string;
    };

    const reqRes = await query<{
      id: string;
      employee_id: string;
      leave_type_id: string;
      start_date: string;
      end_date: string;
      total_days: string;
      status: string;
      emp_user_id: string | null;
      manager_id: string | null;
      lt_name: string;
    }>(
      `SELECT lr.*, e.user_id AS emp_user_id, e.manager_id, lt.name AS lt_name
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.id = $1`,
      [id]
    );

    if (reqRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Leave request not found' });
      return;
    }

    const lr = reqRes.rows[0];
    if (lr.status !== 'Pending') {
      res.status(400).json({ success: false, error: 'Only Pending requests can be reviewed' });
      return;
    }

    if (!isHrRole(req.user!.role)) {
      const myEmp = await getEmployeeForUser(req.user!.id);
      if (!myEmp || lr.manager_id !== myEmp.id) {
        res.status(403).json({ success: false, error: 'Forbidden: only HR or direct manager can review' });
        return;
      }
    }

    const days = Number(lr.total_days);
    const year = new Date(lr.start_date).getUTCFullYear();

    await query(
      `UPDATE leave_requests
       SET status = $1, reviewed_by = $2, review_note = $3, reviewed_at = NOW()
       WHERE id = $4`,
      [decision, req.user!.id, reviewNote || '', id]
    );

    if (decision === 'Approved') {
      await query(
        `UPDATE leave_balances
         SET pending_days = GREATEST(0, pending_days - $1),
             used_days = used_days + $1
         WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [days, lr.employee_id, lr.leave_type_id, year]
      );

      // Mark approved working days in attendance_logs as On Leave
      const cursor = new Date(lr.start_date);
      const end = new Date(lr.end_date);
      while (cursor <= end) {
        const dow = cursor.getUTCDay();
        if (dow !== 0 && dow !== 6) {
          const iso = cursor.toISOString().slice(0, 10);
          await query(
            `INSERT INTO attendance_logs (employee_id, work_date, status, notes, approved_by)
             VALUES ($1, $2::date, 'On Leave', $3, $4)
             ON CONFLICT (employee_id, work_date)
             DO UPDATE SET status = 'On Leave', notes = EXCLUDED.notes`,
            [lr.employee_id, iso, `${lr.lt_name} (Approved)`, req.user!.id]
          );
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    } else {
      await query(
        `UPDATE leave_balances
         SET pending_days = GREATEST(0, pending_days - $1)
         WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [days, lr.employee_id, lr.leave_type_id, year]
      );
    }

    if (lr.emp_user_id) {
      await query(
        `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
         VALUES ($1, $2, $3, $4, $5, FALSE, '/leave')`,
        [
          lr.emp_user_id,
          decision === 'Approved' ? 'CheckCircle' : 'AlertCircle',
          `Leave Request ${decision}`,
          `Your ${lr.lt_name} request (${days} days) has been ${decision.toLowerCase()}.`,
          decision === 'Approved' ? 'success' : 'warning',
        ]
      );
    }

    await logAudit({
      req,
      action: `LEAVE_REQUEST_${decision.toUpperCase()}`,
      entityType: 'leave_request',
      entityId: id,
      metadata: { employeeId: lr.employee_id, totalDays: days },
    });

    res.json({ success: true, message: `Leave request ${decision.toLowerCase()}.` });
  } catch (err) {
    next(err);
  }
}

export async function cancelLeaveRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid leave request ID' });
      return;
    }

    const emp = await getEmployeeForUser(req.user!.id);
    if (!emp) {
      res.status(403).json({ success: false, error: 'Employee profile required' });
      return;
    }

    const lrRes = await query<any>(
      'SELECT * FROM leave_requests WHERE id = $1 AND employee_id = $2',
      [id, emp.id]
    );
    if (lrRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Leave request not found' });
      return;
    }

    const lr = lrRes.rows[0];
    if (lr.status !== 'Pending') {
      res.status(400).json({ success: false, error: 'Only pending requests can be cancelled' });
      return;
    }

    await query(`UPDATE leave_requests SET status = 'Cancelled' WHERE id = $1`, [id]);
    const year = new Date(lr.start_date).getUTCFullYear();
    await query(
      `UPDATE leave_balances SET pending_days = GREATEST(0, pending_days - $1)
       WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
      [Number(lr.total_days), emp.id, lr.leave_type_id, year]
    );

    res.json({ success: true, message: 'Leave request cancelled.' });
  } catch (err) {
    next(err);
  }
}

export async function getOutOfOfficeCalendar(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query(
      `SELECT lr.id, lr.start_date, lr.end_date, lr.total_days,
              e.first_name, e.last_name, e.job_title, d.name AS department_name,
              lt.name AS leave_type_name, lt.color_hex
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.status = 'Approved'
         AND lr.end_date >= CURRENT_DATE - INTERVAL '14 days'
       ORDER BY lr.start_date ASC
       LIMIT 100`
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        employeeName: `${r.first_name} ${r.last_name}`.trim(),
        jobTitle: r.job_title,
        departmentName: r.department_name || null,
        leaveTypeName: r.leave_type_name,
        colorHex: r.color_hex,
        startDate: r.start_date,
        endDate: r.end_date,
        totalDays: Number(r.total_days),
      })),
    });
  } catch (err) {
    next(err);
  }
}
