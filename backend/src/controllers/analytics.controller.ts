import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { generateHrExecutiveBrief } from '../services/ai.service.js';

async function computeOverviewMetrics() {
  const [
    empStats,
    deptHeadcount,
    recruitingStats,
    attendanceStats,
    pendingCounts,
    payrollStats,
    policyStats,
  ] = await Promise.all([
    query<{
      total: number;
      active: number;
      probation: number;
      on_leave: number;
      terminated: number;
    }>(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'Probation')::int AS probation,
        COUNT(*) FILTER (WHERE status = 'On Leave')::int AS on_leave,
        COUNT(*) FILTER (WHERE status = 'Terminated')::int AS terminated
      FROM employees
    `),
    query<{ department: string; count: number }>(`
      SELECT COALESCE(d.name, 'Unassigned') AS department, COUNT(e.id)::int AS count
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.status != 'Terminated'
      GROUP BY d.name
      ORDER BY count DESC
    `),
    query<{
      active_jobs: number;
      total_applicants: number;
      interviews_scheduled: number;
      offers_sent: number;
      hired_count: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM jobs WHERE status = 'Active') AS active_jobs,
        (SELECT COUNT(*)::int FROM applicants) AS total_applicants,
        (SELECT COUNT(*)::int FROM interviews WHERE status = 'Scheduled') AS interviews_scheduled,
        (SELECT COUNT(*)::int FROM job_offers WHERE status IN ('Sent', 'Accepted')) AS offers_sent,
        (SELECT COUNT(*)::int FROM applicants WHERE status = 'Hired') AS hired_count
    `),
    query<{ present_count: number; late_count: number; total_logs: number }>(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'Present')::int AS present_count,
        COUNT(*) FILTER (WHERE status = 'Late')::int AS late_count,
        COUNT(*)::int AS total_logs
      FROM attendance_logs
      WHERE work_date >= DATE_TRUNC('month', CURRENT_DATE)
    `),
    query<{ pending_leaves: number; pending_expenses: number; open_tickets: number; pending_tasks: number }>(`
      SELECT
        (SELECT COUNT(*)::int FROM leave_requests WHERE status = 'Pending') AS pending_leaves,
        (SELECT COUNT(*)::int FROM expense_claims WHERE status = 'Pending') AS pending_expenses,
        (SELECT COUNT(*)::int FROM hr_tickets WHERE status IN ('Open', 'In Progress')) AS open_tickets,
        (SELECT COUNT(*)::int FROM employee_checklist_tasks WHERE status != 'Completed') AS pending_tasks
    `),
    query<{ label: string; total_net: string; total_gross: string; status: string }>(`
      SELECT label, total_net::text, total_gross::text, status
      FROM payroll_runs
      ORDER BY period_year DESC, period_month DESC
      LIMIT 6
    `),
    query<{ total_policies: number; total_acks: number }>(`
      SELECT
        (SELECT COUNT(*)::int FROM company_policies WHERE requires_acknowledgement = TRUE) AS total_policies,
        (SELECT COUNT(*)::int FROM policy_acknowledgements) AS total_acks
    `),
  ]);

  const e = empStats.rows[0];
  const r = recruitingStats.rows[0];
  const a = attendanceStats.rows[0];
  const p = pendingCounts.rows[0];
  const pol = policyStats.rows[0];

  const activeWorkforce = (e.active || 0) + (e.probation || 0) + (e.on_leave || 0);
  const turnoverRate = e.total > 0 ? Math.round((e.terminated / e.total) * 1000) / 10 : 0;
  const expectedAcks = pol.total_policies * activeWorkforce;
  const policyCompliancePct =
    expectedAcks > 0 ? Math.min(100, Math.round((pol.total_acks / expectedAcks) * 100)) : 100;

  return {
    workforce: {
      total: e.total,
      activeWorkforce,
      active: e.active,
      probation: e.probation,
      onLeave: e.on_leave,
      terminated: e.terminated,
      turnoverRatePercent: turnoverRate,
      byDepartment: deptHeadcount.rows,
    },
    recruiting: {
      activeJobs: r.active_jobs,
      totalApplicants: r.total_applicants,
      interviewsScheduled: r.interviews_scheduled,
      offersSent: r.offers_sent,
      hiredCount: r.hired_count,
    },
    operations: {
      monthlyAttendanceLogs: a.total_logs,
      monthlyPresent: a.present_count,
      monthlyLate: a.late_count,
      pendingLeaves: p.pending_leaves,
      pendingExpenses: p.pending_expenses,
      openHelpdeskTickets: p.open_tickets,
      pendingOnboardingTasks: p.pending_tasks,
      policyCompliancePercent: policyCompliancePct,
    },
    payrollHistory: payrollStats.rows.map((pr) => ({
      label: pr.label,
      totalNet: Number(pr.total_net),
      totalGross: Number(pr.total_gross),
      status: pr.status,
    })),
  };
}

export async function getHrOverviewAnalytics(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const metrics = await computeOverviewMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
}

export async function getAiExecutiveBrief(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const metrics = await computeOverviewMetrics();
    const brief = await generateHrExecutiveBrief(metrics);
    res.json({ success: true, data: { brief, generatedAt: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}
