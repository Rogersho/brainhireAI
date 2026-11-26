import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole } from '../middleware/auth.js';
import { summarizePerformanceReview } from '../services/ai.service.js';
import { logAudit } from '../services/audit.service.js';

async function getEmployeeForUser(userId: string) {
  const res = await query<{ id: string }>('SELECT id FROM employees WHERE user_id = $1 LIMIT 1', [
    userId,
  ]);
  return res.rows[0] || null;
}

export async function getCycles(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query(
      `SELECT rc.*,
              (SELECT COUNT(*)::int FROM performance_reviews pr WHERE pr.cycle_id = rc.id) AS total_reviews,
              (SELECT COUNT(*)::int FROM performance_reviews pr WHERE pr.cycle_id = rc.id AND pr.status = 'Completed') AS completed_reviews
       FROM review_cycles rc
       ORDER BY rc.start_date DESC`
    );
    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        startDate: r.start_date,
        endDate: r.end_date,
        status: r.status,
        totalReviews: r.total_reviews || 0,
        completedReviews: r.completed_reviews || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createCycle(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, startDate, endDate } = req.body;
    const ins = await query<{ id: string }>(
      `INSERT INTO review_cycles (name, start_date, end_date, status, created_by)
       VALUES ($1,$2,$3,'Active',$4)
       RETURNING id`,
      [name.trim(), startDate, endDate, req.user!.id]
    );
    const cycleId = ins.rows[0].id;

    // Auto-create performance review forms for all active employees
    const emps = await query<{ id: string; manager_user_id: string | null }>(
      `SELECT e.id, m.user_id AS manager_user_id
       FROM employees e
       LEFT JOIN employees m ON m.id = e.manager_id
       WHERE e.status != 'Terminated'`
    );

    for (const emp of emps.rows) {
      await query(
        `INSERT INTO performance_reviews (cycle_id, employee_id, reviewer_id, status)
         VALUES ($1, $2, $3, 'Pending Self')
         ON CONFLICT (cycle_id, employee_id) DO NOTHING`,
        [cycleId, emp.id, emp.manager_user_id || req.user!.id]
      );
    }

    await logAudit({
      req,
      action: 'REVIEW_CYCLE_LAUNCHED',
      entityType: 'review_cycle',
      entityId: cycleId,
      metadata: { name, reviewCount: emps.rows.length },
    });

    res.status(201).json({
      success: true,
      message: `Launched "${name}" for ${emps.rows.length} active employees.`,
      data: { id: cycleId },
    });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ success: false, error: 'A review cycle with this name already exists' });
      return;
    }
    next(err);
  }
}

export async function getReviews(
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
      params.push(emp.id, user.id);
      where = `WHERE pr.employee_id = $1 OR pr.reviewer_id = $2`;
    }

    const result = await query(
      `SELECT pr.*, rc.name AS cycle_name,
              e.first_name, e.last_name, e.job_title, e.user_id AS employee_user_id,
              d.name AS department_name,
              u.name AS reviewer_name
       FROM performance_reviews pr
       JOIN review_cycles rc ON rc.id = pr.cycle_id
       JOIN employees e ON e.id = pr.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN users u ON u.id = pr.reviewer_id
       ${where}
       ORDER BY pr.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        cycleId: r.cycle_id,
        cycleName: r.cycle_name,
        employeeId: r.employee_id,
        employeeUserId: r.employee_user_id,
        employeeName: `${r.first_name} ${r.last_name}`.trim(),
        jobTitle: r.job_title,
        departmentName: r.department_name || null,
        reviewerId: r.reviewer_id,
        reviewerName: r.reviewer_name || null,
        selfRating: r.self_rating,
        selfComments: r.self_comments,
        managerRating: r.manager_rating,
        managerComments: r.manager_comments,
        finalRating: r.final_rating,
        aiSummary: r.ai_summary,
        status: r.status,
        completedAt: r.completed_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function submitSelfReview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid review ID' });
      return;
    }

    const revRes = await query<{ employee_user_id: string | null }>(
      `SELECT e.user_id AS employee_user_id
       FROM performance_reviews pr
       JOIN employees e ON e.id = pr.employee_id
       WHERE pr.id = $1`,
      [id]
    );
    if (revRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Review not found' });
      return;
    }
    if (revRes.rows[0].employee_user_id !== req.user!.id && !isHrRole(req.user!.role)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const { selfRating, selfComments } = req.body;
    await query(
      `UPDATE performance_reviews
       SET self_rating = $1, self_comments = $2,
           status = CASE WHEN status = 'Pending Self' THEN 'Pending Manager' ELSE status END
       WHERE id = $3`,
      [selfRating, selfComments || '', id]
    );

    res.json({ success: true, message: 'Self-review submitted.' });
  } catch (err) {
    next(err);
  }
}

export async function submitManagerReview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid review ID' });
      return;
    }

    const revRes = await query<any>(
      `SELECT pr.*, e.first_name, e.last_name, e.job_title
       FROM performance_reviews pr
       JOIN employees e ON e.id = pr.employee_id
       WHERE pr.id = $1`,
      [id]
    );
    if (revRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Review not found' });
      return;
    }

    const rev = revRes.rows[0];
    if (!isHrRole(req.user!.role) && rev.reviewer_id !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Forbidden: not assigned reviewer' });
      return;
    }

    const { managerRating, managerComments, finalRating, generateAiSummary } = req.body;

    let aiSummary = rev.ai_summary || '';
    if (generateAiSummary) {
      try {
        aiSummary = await summarizePerformanceReview({
          employeeName: `${rev.first_name} ${rev.last_name}`.trim(),
          jobTitle: rev.job_title,
          selfRating: rev.self_rating,
          selfComments: rev.self_comments,
          managerRating,
          managerComments,
        });
      } catch (err) {
        console.warn('[Performance] AI review summary skipped:', (err as Error).message);
      }
    }

    await query(
      `UPDATE performance_reviews
       SET manager_rating = $1,
           manager_comments = $2,
           final_rating = $3,
           ai_summary = $4,
           status = 'Completed',
           completed_at = NOW()
       WHERE id = $5`,
      [managerRating, managerComments || '', finalRating || managerRating, aiSummary, id]
    );

    res.json({ success: true, message: 'Manager review completed.', aiSummary });
  } catch (err) {
    next(err);
  }
}

export async function getGoals(
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
          ? 'WHERE g.employee_id = $1 OR e.manager_id = $1'
          : 'WHERE g.employee_id = $1';
    }

    const result = await query(
      `SELECT g.*, e.first_name, e.last_name, e.job_title
       FROM employee_goals g
       JOIN employees e ON e.id = g.employee_id
       ${where}
       ORDER BY g.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeName: `${r.first_name} ${r.last_name}`.trim(),
        jobTitle: r.job_title,
        title: r.title,
        description: r.description,
        metricTarget: r.metric_target,
        progressPercent: r.progress_percent,
        dueDate: r.due_date,
        status: r.status,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let targetEmployeeId = req.body.employeeId;
    if (!targetEmployeeId) {
      const emp = await getEmployeeForUser(req.user!.id);
      if (!emp) {
        res.status(400).json({ success: false, error: 'Select an employee or link your employee profile.' });
        return;
      }
      targetEmployeeId = emp.id;
    }

    const { title, description, metricTarget, dueDate } = req.body;
    const inserted = await query(
      `INSERT INTO employee_goals (employee_id, title, description, metric_target, due_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [targetEmployeeId, title.trim(), description || '', metricTarget || '', dueDate || null, req.user!.id]
    );
    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function updateGoalProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid goal ID' });
      return;
    }
    const { progressPercent, status } = req.body;
    const resolvedStatus =
      status || (progressPercent === 100 ? 'Completed' : 'On Track');

    await query(
      `UPDATE employee_goals
       SET progress_percent = COALESCE($1, progress_percent),
           status = COALESCE($2, status)
       WHERE id = $3`,
      [progressPercent ?? null, resolvedStatus, id]
    );
    res.json({ success: true, message: 'Goal updated.' });
  } catch (err) {
    next(err);
  }
}
