import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { logAudit } from '../services/audit.service.js';

interface AllowanceOrDeduction {
  name: string;
  amount?: number;
  percent?: number;
}

export async function getCompensationProfiles(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query(
      `SELECT e.id AS employee_id, e.employee_code, e.first_name, e.last_name, e.job_title, e.status,
              d.name AS department_name,
              cp.id AS profile_id, cp.base_salary, cp.currency, cp.pay_frequency,
              cp.allowances, cp.deductions, cp.bank_name, cp.bank_account_last4, cp.payment_method, cp.effective_from
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN compensation_profiles cp ON cp.employee_id = e.id AND cp.effective_to IS NULL
       WHERE e.status != 'Terminated'
       ORDER BY e.first_name ASC`
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        employeeId: r.employee_id,
        employeeCode: r.employee_code,
        fullName: `${r.first_name} ${r.last_name}`.trim(),
        jobTitle: r.job_title,
        departmentName: r.department_name || null,
        profileId: r.profile_id || null,
        baseSalary: r.base_salary !== null ? Number(r.base_salary) : null,
        currency: r.currency || 'USD',
        payFrequency: r.pay_frequency || 'Monthly',
        allowances: r.allowances || [],
        deductions: r.deductions || [],
        bankName: r.bank_name || '',
        bankAccountLast4: r.bank_account_last4 || '',
        paymentMethod: r.payment_method || 'Bank Transfer',
        effectiveFrom: r.effective_from || null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function upsertCompensationProfile(
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

    const {
      baseSalary,
      currency,
      payFrequency,
      allowances,
      deductions,
      bankName,
      bankAccountLast4,
      paymentMethod,
      effectiveFrom,
    } = req.body;

    // Close existing active compensation profile to preserve full revision history
    await query(
      `UPDATE compensation_profiles SET effective_to = CURRENT_DATE WHERE employee_id = $1 AND effective_to IS NULL`,
      [employeeId]
    );

    const inserted = await query(
      `INSERT INTO compensation_profiles
         (employee_id, base_salary, currency, pay_frequency, allowances, deductions,
          bank_name, bank_account_last4, payment_method, effective_from, created_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        employeeId,
        baseSalary,
        currency || 'USD',
        payFrequency || 'Monthly',
        JSON.stringify(allowances || []),
        JSON.stringify(deductions || []),
        bankName || '',
        (bankAccountLast4 || '').slice(-4),
        paymentMethod || 'Bank Transfer',
        effectiveFrom || new Date().toISOString().slice(0, 10),
        req.user!.id,
      ]
    );

    await logAudit({
      req,
      action: 'COMPENSATION_UPDATED',
      entityType: 'compensation_profile',
      entityId: inserted.rows[0].id,
      metadata: { employeeId, baseSalary, currency: currency || 'USD' },
    });

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function getPayrollRuns(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query(
      `SELECT pr.*, u.name AS created_by_name, a.name AS approved_by_name
       FROM payroll_runs pr
       LEFT JOIN users u ON u.id = pr.created_by
       LEFT JOIN users a ON a.id = pr.approved_by
       ORDER BY pr.period_year DESC, pr.period_month DESC`
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        periodYear: r.period_year,
        periodMonth: r.period_month,
        label: r.label,
        status: r.status,
        totalGross: Number(r.total_gross),
        totalDeductions: Number(r.total_deductions),
        totalNet: Number(r.total_net),
        employeeCount: r.employee_count,
        createdByName: r.created_by_name || null,
        approvedByName: r.approved_by_name || null,
        paidAt: r.paid_at,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getPayrollRunDetail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid payroll run ID' });
      return;
    }

    const runRes = await query('SELECT * FROM payroll_runs WHERE id = $1', [id]);
    if (runRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Payroll run not found' });
      return;
    }

    const slipsRes = await query(
      `SELECT ps.*, e.first_name, e.last_name, e.employee_code, e.job_title, d.name AS department_name
       FROM payslips ps
       JOIN employees e ON e.id = ps.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE ps.payroll_run_id = $1
       ORDER BY e.first_name ASC`,
      [id]
    );

    const r = runRes.rows[0];
    res.json({
      success: true,
      data: {
        id: r.id,
        periodYear: r.period_year,
        periodMonth: r.period_month,
        label: r.label,
        status: r.status,
        totalGross: Number(r.total_gross),
        totalDeductions: Number(r.total_deductions),
        totalNet: Number(r.total_net),
        employeeCount: r.employee_count,
        paidAt: r.paid_at,
        payslips: slipsRes.rows.map(serializePayslip),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createPayrollRun(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { periodYear, periodMonth } = req.body as { periodYear: number; periodMonth: number };
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const label = `${monthNames[periodMonth - 1]} ${periodYear}`;

    const profilesRes = await query<{
      employee_id: string;
      base_salary: string;
      currency: string;
      allowances: AllowanceOrDeduction[];
      deductions: AllowanceOrDeduction[];
    }>(
      `SELECT cp.employee_id, cp.base_salary, cp.currency, cp.allowances, cp.deductions
       FROM compensation_profiles cp
       JOIN employees e ON e.id = cp.employee_id
       WHERE cp.effective_to IS NULL AND e.status != 'Terminated'`
    );

    if (profilesRes.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No active employees have a compensation profile configured yet. Set salaries in Compensation first.',
      });
      return;
    }

    const runIns = await query<{ id: string }>(
      `INSERT INTO payroll_runs (period_year, period_month, label, status, created_by)
       VALUES ($1, $2, $3, 'Draft', $4)
       RETURNING id`,
      [periodYear, periodMonth, label, req.user!.id]
    );
    const runId = runIns.rows[0].id;

    const periodStart = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const p of profilesRes.rows) {
      const base = Number(p.base_salary);
      const allowancesList = Array.isArray(p.allowances) ? p.allowances : [];
      const deductionsList = Array.isArray(p.deductions) ? p.deductions : [];

      const allowancesTotal = allowancesList.reduce(
        (sum, a) => sum + (Number(a.amount) || (base * (Number(a.percent) || 0)) / 100),
        0
      );

      // Overtime hours from attendance_logs for this period
      const otRes = await query<{ ot: string }>(
        `SELECT COALESCE(SUM(overtime_hours), 0)::text AS ot
         FROM attendance_logs
         WHERE employee_id = $1
           AND work_date >= $2::date
           AND work_date < ($2::date + INTERVAL '1 month')`,
        [p.employee_id, periodStart]
      );
      const otHours = Number(otRes.rows[0]?.ot || 0);
      const hourlyRate = base / 160;
      const overtimePay = Math.round(otHours * hourlyRate * 1.5 * 100) / 100;

      // Approved, un-reimbursed expenses
      const expRes = await query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS total
         FROM expense_claims
         WHERE employee_id = $1 AND status = 'Approved' AND payroll_run_id IS NULL`,
        [p.employee_id]
      );
      const expenseReimbursement = Math.round(Number(expRes.rows[0]?.total || 0) * 100) / 100;

      // Approved unpaid leave days during this month
      const ulRes = await query<{ days: string }>(
        `SELECT COALESCE(SUM(lr.total_days), 0)::text AS days
         FROM leave_requests lr
         JOIN leave_types lt ON lt.id = lr.leave_type_id
         WHERE lr.employee_id = $1
           AND lr.status = 'Approved'
           AND lt.is_paid = FALSE
           AND lr.start_date >= $2::date
           AND lr.start_date < ($2::date + INTERVAL '1 month')`,
        [p.employee_id, periodStart]
      );
      const unpaidDays = Number(ulRes.rows[0]?.days || 0);
      const unpaidLeaveDeduction = Math.round((base / 22) * unpaidDays * 100) / 100;

      const grossPay =
        Math.round((base + allowancesTotal + overtimePay + expenseReimbursement) * 100) / 100;

      let taxDeduction = 0;
      let otherDeductionsTotal = 0;
      for (const d of deductionsList) {
        const val = Number(d.amount) || (grossPay * (Number(d.percent) || 0)) / 100;
        if (d.name.toLowerCase().includes('tax')) {
          taxDeduction += val;
        } else {
          otherDeductionsTotal += val;
        }
      }
      taxDeduction = Math.round(taxDeduction * 100) / 100;
      otherDeductionsTotal = Math.round(otherDeductionsTotal * 100) / 100;

      const empDeductions =
        Math.round((unpaidLeaveDeduction + taxDeduction + otherDeductionsTotal) * 100) / 100;
      const netPay = Math.max(0, Math.round((grossPay - empDeductions) * 100) / 100);

      await query(
        `INSERT INTO payslips
           (payroll_run_id, employee_id, base_salary, allowances_total, overtime_pay, bonus_amount,
            expense_reimbursement, gross_pay, unpaid_leave_deduction, tax_deduction,
            other_deductions_total, net_pay, currency, breakdown, status)
         VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,'Draft')`,
        [
          runId,
          p.employee_id,
          base,
          allowancesTotal,
          overtimePay,
          expenseReimbursement,
          grossPay,
          unpaidLeaveDeduction,
          taxDeduction,
          otherDeductionsTotal,
          netPay,
          p.currency,
          JSON.stringify({ allowances: allowancesList, deductions: deductionsList, otHours, unpaidDays }),
        ]
      );

      // Link approved expenses to this draft run
      if (expenseReimbursement > 0) {
        await query(
          `UPDATE expense_claims SET payroll_run_id = $1
           WHERE employee_id = $2 AND status = 'Approved' AND payroll_run_id IS NULL`,
          [runId, p.employee_id]
        );
      }

      totalGross += grossPay;
      totalDeductions += empDeductions;
      totalNet += netPay;
    }

    await query(
      `UPDATE payroll_runs
       SET total_gross = $1, total_deductions = $2, total_net = $3, employee_count = $4
       WHERE id = $5`,
      [
        Math.round(totalGross * 100) / 100,
        Math.round(totalDeductions * 100) / 100,
        Math.round(totalNet * 100) / 100,
        profilesRes.rows.length,
        runId,
      ]
    );

    await logAudit({
      req,
      action: 'PAYROLL_RUN_CREATED',
      entityType: 'payroll_run',
      entityId: runId,
      metadata: { label, employeeCount: profilesRes.rows.length, totalNet },
    });

    res.status(201).json({ success: true, data: { id: runId, label } });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ success: false, error: 'A payroll run already exists for this month.' });
      return;
    }
    next(err);
  }
}

export async function updateDraftPayslip(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid payslip ID' });
      return;
    }

    const psRes = await query<any>(
      `SELECT ps.*, pr.status AS run_status
       FROM payslips ps
       JOIN payroll_runs pr ON pr.id = ps.payroll_run_id
       WHERE ps.id = $1`,
      [id]
    );
    if (psRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Payslip not found' });
      return;
    }
    if (psRes.rows[0].run_status !== 'Draft') {
      res.status(409).json({ success: false, error: 'Cannot edit payslips after payroll run is approved.' });
      return;
    }

    const ps = psRes.rows[0];
    const bonusAmount =
      req.body.bonusAmount !== undefined ? Number(req.body.bonusAmount) : Number(ps.bonus_amount);
    const otherDeductions =
      req.body.otherDeductionsTotal !== undefined
        ? Number(req.body.otherDeductionsTotal)
        : Number(ps.other_deductions_total);

    const grossPay =
      Math.round(
        (Number(ps.base_salary) +
          Number(ps.allowances_total) +
          Number(ps.overtime_pay) +
          bonusAmount +
          Number(ps.expense_reimbursement)) *
          100
      ) / 100;
    const totalDed =
      Math.round(
        (Number(ps.unpaid_leave_deduction) + Number(ps.tax_deduction) + otherDeductions) * 100
      ) / 100;
    const netPay = Math.max(0, Math.round((grossPay - totalDed) * 100) / 100);

    await query(
      `UPDATE payslips
       SET bonus_amount = $1, other_deductions_total = $2, gross_pay = $3, net_pay = $4
       WHERE id = $5`,
      [bonusAmount, otherDeductions, grossPay, netPay, id]
    );

    // Recompute run totals
    await query(
      `UPDATE payroll_runs
       SET total_gross = (SELECT COALESCE(SUM(gross_pay), 0) FROM payslips WHERE payroll_run_id = $1),
           total_deductions = (SELECT COALESCE(SUM(unpaid_leave_deduction + tax_deduction + other_deductions_total), 0) FROM payslips WHERE payroll_run_id = $1),
           total_net = (SELECT COALESCE(SUM(net_pay), 0) FROM payslips WHERE payroll_run_id = $1)
       WHERE id = $1`,
      [ps.payroll_run_id]
    );

    res.json({ success: true, message: 'Payslip updated' });
  } catch (err) {
    next(err);
  }
}

export async function finalizePayrollRun(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { action } = req.body as { action: 'approve' | 'mark-paid' };
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid payroll run ID' });
      return;
    }

    const runRes = await query<{ id: string; label: string; status: string }>(
      'SELECT id, label, status FROM payroll_runs WHERE id = $1',
      [id]
    );
    if (runRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Payroll run not found' });
      return;
    }

    const run = runRes.rows[0];

    if (action === 'approve') {
      if (run.status !== 'Draft') {
        res.status(409).json({ success: false, error: 'Only Draft runs can be approved.' });
        return;
      }
      await query(
        `UPDATE payroll_runs SET status = 'Approved', approved_by = $1 WHERE id = $2`,
        [req.user!.id, id]
      );
      await query(
        `UPDATE payslips SET status = 'Issued', issued_at = NOW() WHERE payroll_run_id = $1`,
        [id]
      );
      await logAudit({ req, action: 'PAYROLL_RUN_APPROVED', entityType: 'payroll_run', entityId: id });
      res.json({ success: true, message: `Payroll run ${run.label} approved and payslips issued.` });
      return;
    }

    // mark-paid
    if (run.status === 'Paid') {
      res.status(409).json({ success: false, error: 'Payroll run is already paid.' });
      return;
    }
    await query(
      `UPDATE payroll_runs SET status = 'Paid', approved_by = COALESCE(approved_by, $1), paid_at = NOW() WHERE id = $2`,
      [req.user!.id, id]
    );
    await query(
      `UPDATE payslips SET status = 'Paid', issued_at = COALESCE(issued_at, NOW()) WHERE payroll_run_id = $1`,
      [id]
    );
    await query(
      `UPDATE expense_claims SET status = 'Reimbursed' WHERE payroll_run_id = $1`,
      [id]
    );

    const paidUsers = await query<{ user_id: string; net_pay: string; currency: string }>(
      `SELECT e.user_id, ps.net_pay, ps.currency
       FROM payslips ps
       JOIN employees e ON e.id = ps.employee_id
       WHERE ps.payroll_run_id = $1 AND e.user_id IS NOT NULL`,
      [id]
    );

    for (const u of paidUsers.rows) {
      await query(
        `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
         VALUES ($1, 'CheckCircle', 'Payslip Available', $2, 'success', FALSE, '/payroll')`,
        [
          u.user_id,
          `Your ${run.label} payslip (${u.currency} ${Number(u.net_pay).toLocaleString()}) has been paid.`,
        ]
      );
    }

    await logAudit({ req, action: 'PAYROLL_RUN_PAID', entityType: 'payroll_run', entityId: id });
    res.json({ success: true, message: `Payroll run ${run.label} marked as Paid.` });
  } catch (err) {
    next(err);
  }
}

export async function getMyPayslips(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empRes = await query<{ id: string }>('SELECT id FROM employees WHERE user_id = $1 LIMIT 1', [
      req.user!.id,
    ]);
    if (empRes.rows.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const slipsRes = await query(
      `SELECT ps.*, pr.label AS period_label, pr.period_year, pr.period_month,
              e.first_name, e.last_name, e.employee_code, e.job_title
       FROM payslips ps
       JOIN payroll_runs pr ON pr.id = ps.payroll_run_id
       JOIN employees e ON e.id = ps.employee_id
       WHERE ps.employee_id = $1 AND ps.status IN ('Issued', 'Paid')
       ORDER BY pr.period_year DESC, pr.period_month DESC`,
      [empRes.rows[0].id]
    );

    res.json({
      success: true,
      data: slipsRes.rows.map((r: any) => ({
        ...serializePayslip(r),
        periodLabel: r.period_label,
        periodYear: r.period_year,
        periodMonth: r.period_month,
      })),
    });
  } catch (err) {
    next(err);
  }
}

function serializePayslip(r: any) {
  return {
    id: r.id,
    payrollRunId: r.payroll_run_id,
    employeeId: r.employee_id,
    employeeCode: r.employee_code,
    employeeName: r.first_name ? `${r.first_name} ${r.last_name}`.trim() : null,
    jobTitle: r.job_title || null,
    departmentName: r.department_name || null,
    baseSalary: Number(r.base_salary),
    allowancesTotal: Number(r.allowances_total),
    overtimePay: Number(r.overtime_pay),
    bonusAmount: Number(r.bonus_amount),
    expenseReimbursement: Number(r.expense_reimbursement),
    grossPay: Number(r.gross_pay),
    unpaidLeaveDeduction: Number(r.unpaid_leave_deduction),
    taxDeduction: Number(r.tax_deduction),
    otherDeductionsTotal: Number(r.other_deductions_total),
    netPay: Number(r.net_pay),
    currency: r.currency || 'USD',
    breakdown: r.breakdown || {},
    status: r.status,
    issuedAt: r.issued_at,
  };
}
