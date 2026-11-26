import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.service.js';

async function getEmployeeForUser(userId: string) {
  const res = await query<{ id: string; employee_code: string; first_name: string; last_name: string }>(
    `SELECT id, employee_code, first_name, last_name FROM employees WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return res.rows[0] || null;
}

async function getDefaultSchedule() {
  const res = await query<{
    start_time: string;
    end_time: string;
    grace_period_minutes: number;
    daily_hours: string;
  }>('SELECT start_time, end_time, grace_period_minutes, daily_hours FROM work_schedules ORDER BY is_default DESC, created_at ASC LIMIT 1');
  return (
    res.rows[0] || {
      start_time: '09:00:00',
      end_time: '17:00:00',
      grace_period_minutes: 15,
      daily_hours: '8.00',
    }
  );
}

export async function getTodayAttendance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emp = await getEmployeeForUser(req.user!.id);
    const schedule = await getDefaultSchedule();
    if (!emp) {
      res.json({ success: true, data: { employeeLinked: false, todayLog: null, schedule } });
      return;
    }

    const logRes = await query(
      `SELECT * FROM attendance_logs WHERE employee_id = $1 AND work_date = CURRENT_DATE LIMIT 1`,
      [emp.id]
    );

    res.json({
      success: true,
      data: {
        employeeLinked: true,
        employeeId: emp.id,
        todayLog: logRes.rows[0] ? serializeAttendance(logRes.rows[0]) : null,
        schedule: {
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          gracePeriodMinutes: schedule.grace_period_minutes,
          dailyHours: Number(schedule.daily_hours),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function clockIn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emp = await getEmployeeForUser(req.user!.id);
    if (!emp) {
      res.status(400).json({
        success: false,
        error: 'No employee profile is linked to your account. Ask HR to add you in Employees first.',
      });
      return;
    }

    const existing = await query(
      'SELECT id, clock_in FROM attendance_logs WHERE employee_id = $1 AND work_date = CURRENT_DATE',
      [emp.id]
    );
    if (existing.rows.length > 0 && existing.rows[0].clock_in) {
      res.status(409).json({ success: false, error: 'You have already clocked in today.' });
      return;
    }

    const { workMode, notes } = req.body as { workMode?: string; notes?: string };
    const schedule = await getDefaultSchedule();
    const now = new Date();
    const [sh, sm] = schedule.start_time.split(':').map(Number);
    const scheduledStart = new Date(now);
    scheduledStart.setHours(sh || 9, (sm || 0) + (schedule.grace_period_minutes || 15), 0, 0);
    const status = now > scheduledStart ? 'Late' : 'Present';

    const inserted = await query(
      `INSERT INTO attendance_logs (employee_id, work_date, clock_in, work_mode, status, notes)
       VALUES ($1, CURRENT_DATE, NOW(), $2, $3, $4)
       ON CONFLICT (employee_id, work_date)
       DO UPDATE SET clock_in = NOW(), work_mode = EXCLUDED.work_mode, status = EXCLUDED.status, notes = EXCLUDED.notes
       RETURNING *`,
      [emp.id, workMode || 'Office', status, notes || '']
    );

    res.status(201).json({ success: true, data: serializeAttendance(inserted.rows[0]) });
  } catch (err) {
    next(err);
  }
}

export async function clockOut(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emp = await getEmployeeForUser(req.user!.id);
    if (!emp) {
      res.status(400).json({ success: false, error: 'No employee profile linked to your account.' });
      return;
    }

    const logRes = await query<{ id: string; clock_in: Date | null; clock_out: Date | null }>(
      'SELECT id, clock_in, clock_out FROM attendance_logs WHERE employee_id = $1 AND work_date = CURRENT_DATE',
      [emp.id]
    );

    if (logRes.rows.length === 0 || !logRes.rows[0].clock_in) {
      res.status(400).json({ success: false, error: 'You must clock in before clocking out.' });
      return;
    }
    if (logRes.rows[0].clock_out) {
      res.status(409).json({ success: false, error: 'You have already clocked out today.' });
      return;
    }

    const { breakMinutes, notes } = req.body as { breakMinutes?: number; notes?: string };
    const schedule = await getDefaultSchedule();
    const dailyHours = Number(schedule.daily_hours) || 8;

    const clockInDate = new Date(logRes.rows[0].clock_in);
    const now = new Date();
    const breakMin = Math.max(0, Number(breakMinutes) || 0);
    const rawHours = Math.max(0, (now.getTime() - clockInDate.getTime()) / 3_600_000 - breakMin / 60);
    const totalHours = Math.round(rawHours * 100) / 100;
    const overtimeHours = Math.max(0, Math.round((totalHours - dailyHours) * 100) / 100);

    const updated = await query(
      `UPDATE attendance_logs
       SET clock_out = NOW(),
           break_minutes = $1,
           total_hours = $2,
           overtime_hours = $3,
           notes = CASE WHEN $4 != '' THEN $4 ELSE notes END
       WHERE id = $5
       RETURNING *`,
      [breakMin, totalHours, overtimeHours, notes || '', logRes.rows[0].id]
    );

    res.json({ success: true, data: serializeAttendance(updated.rows[0]) });
  } catch (err) {
    next(err);
  }
}

export async function getAttendanceLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const month = typeof req.query.month === 'string' ? req.query.month : ''; // YYYY-MM
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const onlyMe = req.query.me === 'true';

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (onlyMe || !isHrRole(user.role)) {
      const emp = await getEmployeeForUser(user.id);
      if (!emp) {
        res.json({ success: true, data: [] });
        return;
      }
      if (user.role === 'HiringManager' && !onlyMe) {
        params.push(emp.id);
        conditions.push(`(a.employee_id = $${params.length} OR e.manager_id = $${params.length})`);
      } else {
        params.push(emp.id);
        conditions.push(`a.employee_id = $${params.length}`);
      }
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      params.push(`${month}-01`);
      conditions.push(
        `a.work_date >= $${params.length}::date AND a.work_date < ($${params.length}::date + INTERVAL '1 month')`
      );
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT a.*, e.first_name, e.last_name, e.employee_code, e.job_title, d.name AS department_name
       FROM attendance_logs a
       JOIN employees e ON e.id = a.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       ${where}
       ORDER BY a.work_date DESC, a.clock_in DESC
       LIMIT 200`,
      params
    );

    res.json({ success: true, data: result.rows.map(serializeAttendance) });
  } catch (err) {
    next(err);
  }
}

export async function requestCorrection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emp = await getEmployeeForUser(req.user!.id);
    if (!emp) {
      res.status(400).json({ success: false, error: 'No employee profile linked to your account.' });
      return;
    }

    const { workDate, requestedClockIn, requestedClockOut, reason } = req.body;
    const existingLog = await query<{ id: string }>(
      'SELECT id FROM attendance_logs WHERE employee_id = $1 AND work_date = $2',
      [emp.id, workDate]
    );

    const inserted = await query(
      `INSERT INTO attendance_corrections
         (attendance_log_id, employee_id, work_date, requested_clock_in, requested_clock_out, reason)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        existingLog.rows[0]?.id || null,
        emp.id,
        workDate,
        requestedClockIn || null,
        requestedClockOut || null,
        reason.trim(),
      ]
    );

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function getCorrections(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const params: unknown[] = [];
    let where = '';

    if (!isHrRole(user.role)) {
      const emp = await getEmployeeForUser(user.id);
      if (!emp) {
        res.json({ success: true, data: [] });
        return;
      }
      params.push(emp.id);
      where =
        user.role === 'HiringManager'
          ? 'WHERE c.employee_id = $1 OR e.manager_id = $1'
          : 'WHERE c.employee_id = $1';
    }

    const result = await query(
      `SELECT c.*, e.first_name, e.last_name, e.employee_code
       FROM attendance_corrections c
       JOIN employees e ON e.id = c.employee_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT 100`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeCode: r.employee_code,
        employeeName: `${r.first_name} ${r.last_name}`.trim(),
        workDate: r.work_date,
        requestedClockIn: r.requested_clock_in,
        requestedClockOut: r.requested_clock_out,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function reviewCorrection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid correction ID' });
      return;
    }

    const { decision } = req.body as { decision: 'Approved' | 'Rejected' };
    const cRes = await query<any>('SELECT * FROM attendance_corrections WHERE id = $1', [id]);
    if (cRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Correction request not found' });
      return;
    }

    const corr = cRes.rows[0];
    await query(
      `UPDATE attendance_corrections SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3`,
      [decision, req.user!.id, id]
    );

    if (decision === 'Approved') {
      let totalHours = 0;
      if (corr.requested_clock_in && corr.requested_clock_out) {
        totalHours = Math.max(
          0,
          Math.round(
            ((new Date(corr.requested_clock_out).getTime() -
              new Date(corr.requested_clock_in).getTime()) /
              3_600_000) *
              100
          ) / 100
        );
      }

      await query(
        `INSERT INTO attendance_logs (employee_id, work_date, clock_in, clock_out, total_hours, status, approved_by, notes)
         VALUES ($1, $2, $3, $4, $5, 'Present', $6, 'Corrected via HR approval')
         ON CONFLICT (employee_id, work_date)
         DO UPDATE SET
           clock_in = COALESCE(EXCLUDED.clock_in, attendance_logs.clock_in),
           clock_out = COALESCE(EXCLUDED.clock_out, attendance_logs.clock_out),
           total_hours = CASE WHEN EXCLUDED.total_hours > 0 THEN EXCLUDED.total_hours ELSE attendance_logs.total_hours END,
           approved_by = EXCLUDED.approved_by`,
        [
          corr.employee_id,
          corr.work_date,
          corr.requested_clock_in,
          corr.requested_clock_out,
          totalHours,
          req.user!.id,
        ]
      );
    }

    await logAudit({
      req,
      action: `ATTENDANCE_CORRECTION_${decision.toUpperCase()}`,
      entityType: 'attendance_correction',
      entityId: id,
    });

    res.json({ success: true, message: `Correction ${decision.toLowerCase()}.` });
  } catch (err) {
    next(err);
  }
}

function serializeAttendance(r: any) {
  return {
    id: r.id,
    employeeId: r.employee_id,
    employeeCode: r.employee_code || null,
    employeeName: r.first_name ? `${r.first_name} ${r.last_name}`.trim() : null,
    jobTitle: r.job_title || null,
    departmentName: r.department_name || null,
    workDate: r.work_date,
    clockIn: r.clock_in,
    clockOut: r.clock_out,
    breakMinutes: r.break_minutes,
    totalHours: Number(r.total_hours || 0),
    overtimeHours: Number(r.overtime_hours || 0),
    workMode: r.work_mode,
    status: r.status,
    notes: r.notes,
  };
}
