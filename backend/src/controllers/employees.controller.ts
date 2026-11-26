import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole, UserRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.service.js';

interface EmployeeRow {
  id: string;
  user_id: string | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  work_email: string;
  personal_email: string | null;
  phone: string | null;
  department_id: string | null;
  location_id: string | null;
  position_id: string | null;
  job_title: string;
  manager_id: string | null;
  employment_type: string;
  work_mode: string;
  status: string;
  hire_date: string;
  probation_end_date: string | null;
  termination_date: string | null;
  termination_reason: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  source_applicant_id: string | null;
  created_at: Date;
  updated_at: Date;
  department_name?: string | null;
  location_name?: string | null;
  position_title?: string | null;
  manager_first_name?: string | null;
  manager_last_name?: string | null;
  user_role?: string | null;
  pending_tasks_count?: number;
  total_tasks_count?: number;
}

const EMPLOYEE_BASE_SELECT = `
  SELECT e.*,
         d.name AS department_name,
         l.name AS location_name,
         p.title AS position_title,
         m.first_name AS manager_first_name,
         m.last_name AS manager_last_name,
         u.role AS user_role,
         (SELECT COUNT(*)::int FROM employee_checklist_tasks t WHERE t.employee_id = e.id AND t.status != 'Completed') AS pending_tasks_count,
         (SELECT COUNT(*)::int FROM employee_checklist_tasks t WHERE t.employee_id = e.id) AS total_tasks_count
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN locations l ON l.id = e.location_id
  LEFT JOIN job_positions p ON p.id = e.position_id
  LEFT JOIN employees m ON m.id = e.manager_id
  LEFT JOIN users u ON u.id = e.user_id
`;

function serializeEmployee(row: EmployeeRow, includeSensitive: boolean) {
  const base = {
    id: row.id,
    userId: row.user_id,
    userRole: row.user_role || null,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    workEmail: row.work_email,
    phone: row.phone,
    departmentId: row.department_id,
    departmentName: row.department_name || null,
    locationId: row.location_id,
    locationName: row.location_name || null,
    positionId: row.position_id,
    positionTitle: row.position_title || null,
    jobTitle: row.job_title,
    managerId: row.manager_id,
    managerName:
      row.manager_first_name || row.manager_last_name
        ? `${row.manager_first_name || ''} ${row.manager_last_name || ''}`.trim()
        : null,
    employmentType: row.employment_type,
    workMode: row.work_mode,
    status: row.status,
    hireDate: row.hire_date,
    pendingTasksCount: row.pending_tasks_count ?? 0,
    totalTasksCount: row.total_tasks_count ?? 0,
    createdAt: row.created_at,
  };

  if (!includeSensitive) return base;

  return {
    ...base,
    personalEmail: row.personal_email,
    probationEndDate: row.probation_end_date,
    terminationDate: row.termination_date,
    terminationReason: row.termination_reason,
    dateOfBirth: row.date_of_birth,
    nationality: row.nationality,
    address: row.address,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    sourceApplicantId: row.source_applicant_id,
    updatedAt: row.updated_at,
  };
}

async function generateNextEmployeeCode(): Promise<string> {
  const res = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM employees');
  let seq = Number(res.rows[0]?.count || 0) + 1;
  for (let attempts = 0; attempts < 50; attempts++) {
    const code = `EMP-${String(seq).padStart(4, '0')}`;
    const exists = await query('SELECT 1 FROM employees WHERE employee_code = $1', [code]);
    if (exists.rows.length === 0) return code;
    seq += 1;
  }
  return `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function applyChecklistTemplateToEmployee(
  employeeId: string,
  templateType: 'Onboarding' | 'Offboarding',
  templateId?: string | null,
  employeeUserId?: string | null,
  actorUserId?: string | null
): Promise<number> {
  let resolvedTemplateId = templateId || null;
  if (!resolvedTemplateId) {
    const tpl = await query<{ id: string }>(
      'SELECT id FROM onboarding_templates WHERE type = $1 ORDER BY created_at ASC LIMIT 1',
      [templateType]
    );
    resolvedTemplateId = tpl.rows[0]?.id || null;
  }
  if (!resolvedTemplateId) return 0;

  const tasksRes = await query<{
    title: string;
    description: string;
    category: string;
    assignee_role: string;
    due_offset_days: number;
  }>(
    `SELECT title, description, category, assignee_role, due_offset_days
     FROM onboarding_template_tasks
     WHERE template_id = $1
     ORDER BY sort_order ASC`,
    [resolvedTemplateId]
  );

  for (const t of tasksRes.rows) {
    const assignedTo = t.assignee_role === 'Employee' ? employeeUserId || null : actorUserId || null;
    await query(
      `INSERT INTO employee_checklist_tasks
         (employee_id, type, title, description, category, assigned_to, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE + ($7 || ' days')::interval, 'Pending')`,
      [employeeId, templateType, t.title, t.description, t.category, assignedTo, t.due_offset_days]
    );
  }

  return tasksRes.rows.length;
}

export async function getEmployees(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId : '';
    const locationId = typeof req.query.locationId === 'string' ? req.query.locationId : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(e.first_name ILIKE $${params.length} OR e.last_name ILIKE $${params.length} OR e.work_email ILIKE $${params.length} OR e.job_title ILIKE $${params.length} OR e.employee_code ILIKE $${params.length})`
      );
    }
    if (departmentId && departmentId !== 'all' && isValidUuid(departmentId)) {
      params.push(departmentId);
      conditions.push(`e.department_id = $${params.length}`);
    }
    if (locationId && locationId !== 'all' && isValidUuid(locationId)) {
      params.push(locationId);
      conditions.push(`e.location_id = $${params.length}`);
    }
    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    } else if (!isHrRole(user.role)) {
      // Non-HR staff only see non-terminated colleagues in the directory
      conditions.push(`e.status != 'Terminated'`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query<EmployeeRow>(
      `${EMPLOYEE_BASE_SELECT} ${where} ORDER BY e.created_at DESC`,
      params
    );

    const includeSensitive = isHrRole(user.role);
    res.json({
      success: true,
      data: result.rows.map((row) => serializeEmployee(row, includeSensitive)),
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrgChart(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query<EmployeeRow>(
      `${EMPLOYEE_BASE_SELECT}
       WHERE e.status != 'Terminated'
       ORDER BY e.manager_id NULLS FIRST, e.first_name ASC`
    );

    res.json({
      success: true,
      data: result.rows.map((row) => serializeEmployee(row, false)),
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyEmployeeProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query<EmployeeRow>(
      `${EMPLOYEE_BASE_SELECT} WHERE e.user_id = $1`,
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'No employee profile linked to your account' });
      return;
    }
    res.json({ success: true, data: serializeEmployee(result.rows[0], true) });
  } catch (err) {
    next(err);
  }
}

export async function getEmployeeById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid employee ID' });
      return;
    }

    const result = await query<EmployeeRow>(`${EMPLOYEE_BASE_SELECT} WHERE e.id = $1`, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    const emp = result.rows[0];
    const user = req.user!;
    const isSelf = emp.user_id === user.id;

    // Check if logged-in user is this employee's manager
    let isDirectManager = false;
    if (emp.manager_id) {
      const mgrCheck = await query<{ user_id: string | null }>(
        'SELECT user_id FROM employees WHERE id = $1',
        [emp.manager_id]
      );
      isDirectManager = mgrCheck.rows[0]?.user_id === user.id;
    }

    const includeSensitive = isHrRole(user.role) || isSelf || isDirectManager;
    res.json({ success: true, data: serializeEmployee(emp, includeSensitive) });
  } catch (err) {
    next(err);
  }
}

export async function createEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      firstName,
      lastName,
      workEmail,
      personalEmail,
      phone,
      departmentId,
      locationId,
      positionId,
      jobTitle,
      managerId,
      employmentType,
      workMode,
      status,
      hireDate,
      probationEndDate,
      dateOfBirth,
      nationality,
      address,
      emergencyContactName,
      emergencyContactPhone,
      createUserAccount,
      accountRole,
      initialPassword,
      applyOnboardingTemplate,
      onboardingTemplateId,
    } = req.body;

    const normalizedEmail = workEmail.trim().toLowerCase();
    const dupEmp = await query('SELECT id FROM employees WHERE work_email = $1', [normalizedEmail]);
    if (dupEmp.rows.length > 0) {
      res.status(409).json({ success: false, error: 'An employee with this work email already exists' });
      return;
    }

    let linkedUserId: string | null = null;
    let tempPassword: string | null = null;

    if (createUserAccount) {
      const existingUser = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [
        normalizedEmail,
      ]);
      if (existingUser.rows.length > 0) {
        linkedUserId = existingUser.rows[0].id;
      } else {
        const generatedPass: string =
          (typeof initialPassword === 'string' && initialPassword.trim()) ||
          `Hoobe-${crypto.randomBytes(4).toString('hex')}`;
        tempPassword = generatedPass;
        const passwordHash = await bcrypt.hash(generatedPass, 12);
        const safeRole: UserRole =
          accountRole && ['HRManager', 'HiringManager', 'Employee'].includes(accountRole)
            ? accountRole
            : 'Employee';
        const insUser = await query<{ id: string }>(
          `INSERT INTO users (name, email, password_hash, role)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [`${firstName.trim()} ${lastName.trim()}`, normalizedEmail, passwordHash, safeRole]
        );
        linkedUserId = insUser.rows[0].id;
      }
    }

    const employeeCode = await generateNextEmployeeCode();

    const inserted = await query<{ id: string }>(
      `INSERT INTO employees (
         user_id, employee_code, first_name, last_name, work_email, personal_email, phone,
         department_id, location_id, position_id, job_title, manager_id,
         employment_type, work_mode, status, hire_date, probation_end_date,
         date_of_birth, nationality, address, emergency_contact_name, emergency_contact_phone
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING id`,
      [
        linkedUserId,
        employeeCode,
        firstName.trim(),
        lastName.trim(),
        normalizedEmail,
        personalEmail || null,
        phone || null,
        departmentId || null,
        locationId || null,
        positionId || null,
        jobTitle.trim(),
        managerId || null,
        employmentType || 'Full-Time',
        workMode || 'On-Site',
        status || 'Active',
        hireDate || new Date().toISOString().slice(0, 10),
        probationEndDate || null,
        dateOfBirth || null,
        nationality || null,
        address || null,
        emergencyContactName || null,
        emergencyContactPhone || null,
      ]
    );

    const employeeId = inserted.rows[0].id;

    let spawnedTasks = 0;
    if (applyOnboardingTemplate !== false) {
      spawnedTasks = await applyChecklistTemplateToEmployee(
        employeeId,
        'Onboarding',
        onboardingTemplateId,
        linkedUserId,
        req.user!.id
      );
    }

    await logAudit({
      req,
      action: 'EMPLOYEE_CREATED',
      entityType: 'employee',
      entityId: employeeId,
      metadata: { employeeCode, workEmail: normalizedEmail, jobTitle, spawnedTasks },
    });

    const fullRes = await query<EmployeeRow>(`${EMPLOYEE_BASE_SELECT} WHERE e.id = $1`, [employeeId]);
    res.status(201).json({
      success: true,
      data: serializeEmployee(fullRes.rows[0], true),
      ...(tempPassword ? { temporaryPassword: tempPassword } : {}),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid employee ID' });
      return;
    }

    const existing = await query<{ id: string; user_id: string | null }>(
      'SELECT id, user_id FROM employees WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    const user = req.user!;
    const isSelf = existing.rows[0].user_id === user.id;
    const hrAccess = isHrRole(user.role);

    if (!hrAccess && !isSelf) {
      res.status(403).json({ success: false, error: 'Forbidden: cannot update this employee record' });
      return;
    }

    if (!hrAccess && isSelf) {
      // Employees may only self-update personal contact details
      const { phone, personalEmail, address, emergencyContactName, emergencyContactPhone } = req.body;
      await query(
        `UPDATE employees
         SET phone = COALESCE($1, phone),
             personal_email = COALESCE($2, personal_email),
             address = COALESCE($3, address),
             emergency_contact_name = COALESCE($4, emergency_contact_name),
             emergency_contact_phone = COALESCE($5, emergency_contact_phone)
         WHERE id = $6`,
        [
          phone ?? null,
          personalEmail ?? null,
          address ?? null,
          emergencyContactName ?? null,
          emergencyContactPhone ?? null,
          id,
        ]
      );
    } else {
      const {
        firstName,
        lastName,
        workEmail,
        personalEmail,
        phone,
        departmentId,
        locationId,
        positionId,
        jobTitle,
        managerId,
        employmentType,
        workMode,
        status,
        hireDate,
        probationEndDate,
        dateOfBirth,
        nationality,
        address,
        emergencyContactName,
        emergencyContactPhone,
      } = req.body;

      if (managerId && managerId === id) {
        res.status(400).json({ success: false, error: 'An employee cannot be their own manager' });
        return;
      }

      await query(
        `UPDATE employees
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             work_email = COALESCE($3, work_email),
             personal_email = COALESCE($4, personal_email),
             phone = COALESCE($5, phone),
             department_id = $6,
             location_id = $7,
             position_id = $8,
             job_title = COALESCE($9, job_title),
             manager_id = $10,
             employment_type = COALESCE($11, employment_type),
             work_mode = COALESCE($12, work_mode),
             status = COALESCE($13, status),
             hire_date = COALESCE($14, hire_date),
             probation_end_date = $15,
             date_of_birth = $16,
             nationality = $17,
             address = $18,
             emergency_contact_name = $19,
             emergency_contact_phone = $20
         WHERE id = $21`,
        [
          firstName ? firstName.trim() : null,
          lastName ? lastName.trim() : null,
          workEmail ? workEmail.trim().toLowerCase() : null,
          personalEmail ?? null,
          phone ?? null,
          departmentId ?? null,
          locationId ?? null,
          positionId ?? null,
          jobTitle ? jobTitle.trim() : null,
          managerId ?? null,
          employmentType ?? null,
          workMode ?? null,
          status ?? null,
          hireDate ?? null,
          probationEndDate ?? null,
          dateOfBirth ?? null,
          nationality ?? null,
          address ?? null,
          emergencyContactName ?? null,
          emergencyContactPhone ?? null,
          id,
        ]
      );
    }

    await logAudit({
      req,
      action: 'EMPLOYEE_UPDATED',
      entityType: 'employee',
      entityId: id,
    });

    const fullRes = await query<EmployeeRow>(`${EMPLOYEE_BASE_SELECT} WHERE e.id = $1`, [id]);
    res.json({ success: true, data: serializeEmployee(fullRes.rows[0], true) });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ success: false, error: 'Work email is already in use by another employee' });
      return;
    }
    next(err);
  }
}

export async function convertApplicantToEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { applicantId } = req.params;
    if (!isValidUuid(applicantId)) {
      res.status(400).json({ success: false, error: 'Invalid applicant ID' });
      return;
    }

    const appRes = await query<{
      id: string;
      name: string;
      role: string;
      status: string;
      user_id: string | null;
      resume_key: string | null;
      job_title: string;
      job_department: string;
      job_department_id: string | null;
      job_location_id: string | null;
      job_position_id: string | null;
      candidate_email: string | null;
    }>(
      `SELECT a.id, a.name, a.role, a.status, a.user_id, a.resume_key,
              j.title AS job_title, j.department AS job_department,
              j.department_id AS job_department_id, j.location_id AS job_location_id,
              j.position_id AS job_position_id,
              u.email AS candidate_email
       FROM applicants a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [applicantId]
    );

    if (appRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Applicant not found' });
      return;
    }

    const app = appRes.rows[0];
    if (app.status !== 'Hired') {
      res.status(400).json({
        success: false,
        error: 'Applicant must have status "Hired" before converting to an employee.',
      });
      return;
    }

    const alreadyConverted = await query<{ id: string }>(
      'SELECT id FROM employees WHERE source_applicant_id = $1',
      [applicantId]
    );
    if (alreadyConverted.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'This applicant has already been converted to an employee.',
        employeeId: alreadyConverted.rows[0].id,
      });
      return;
    }

    const {
      workEmail,
      departmentId,
      locationId,
      managerId,
      employmentType,
      workMode,
      hireDate,
      onboardingTemplateId,
    } = req.body as {
      workEmail?: string;
      departmentId?: string | null;
      locationId?: string | null;
      managerId?: string | null;
      employmentType?: string;
      workMode?: string;
      hireDate?: string;
      onboardingTemplateId?: string | null;
    };

    const nameParts = app.name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'New';
    const lastName = nameParts.slice(1).join(' ') || 'Hire';
    const resolvedEmail = (
      workEmail?.trim() ||
      app.candidate_email ||
      `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}@company.local`
    ).toLowerCase();

    const employeeCode = await generateNextEmployeeCode();

    // Try matching department by name if no explicit departmentId passed
    let resolvedDeptId = departmentId || app.job_department_id || null;
    if (!resolvedDeptId && app.job_department) {
      const deptMatch = await query<{ id: string }>(
        'SELECT id FROM departments WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [app.job_department]
      );
      resolvedDeptId = deptMatch.rows[0]?.id || null;
    }

    const inserted = await query<{ id: string }>(
      `INSERT INTO employees (
         user_id, employee_code, first_name, last_name, work_email, personal_email,
         department_id, location_id, position_id, job_title, manager_id,
         employment_type, work_mode, status, hire_date, source_applicant_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Probation',$14,$15)
       RETURNING id`,
      [
        app.user_id,
        employeeCode,
        firstName,
        lastName,
        resolvedEmail,
        app.candidate_email || null,
        resolvedDeptId,
        locationId || app.job_location_id || null,
        app.job_position_id || null,
        app.job_title || app.role,
        managerId || null,
        employmentType || 'Full-Time',
        workMode || 'On-Site',
        hireDate || new Date().toISOString().slice(0, 10),
        applicantId,
      ]
    );

    const employeeId = inserted.rows[0].id;

    // Upgrade linked Candidate user account to Employee role
    if (app.user_id) {
      await query(
        `UPDATE users SET role = 'Employee' WHERE id = $1 AND role = 'Candidate'`,
        [app.user_id]
      );

      await query(
        `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
         VALUES ($1, 'UserCheck', 'Welcome to the Team!', $2, 'success', FALSE, '/employees/' || $3)`,
        [
          app.user_id,
          `Your employee profile (${employeeCode}) for ${app.job_title} is now active. Check your onboarding checklist.`,
          employeeId,
        ]
      );
    }

    // Carry over candidate's S3 resume into Employee Document Vault automatically
    if (app.resume_key) {
      await query(
        `INSERT INTO employee_documents
           (employee_id, title, category, s3_key, file_name, mime_type, uploaded_by, is_visible_to_employee)
         VALUES ($1, $2, 'Resume', $3, $4, 'application/pdf', $5, TRUE)`,
        [
          employeeId,
          `${app.name} - Application Resume`,
          app.resume_key,
          app.resume_key.split('/').pop() || 'resume.pdf',
          req.user!.id,
        ]
      );
    }

    const spawnedTasks = await applyChecklistTemplateToEmployee(
      employeeId,
      'Onboarding',
      onboardingTemplateId,
      app.user_id,
      req.user!.id
    );

    await logAudit({
      req,
      action: 'APPLICANT_CONVERTED_TO_EMPLOYEE',
      entityType: 'employee',
      entityId: employeeId,
      metadata: { applicantId, employeeCode, workEmail: resolvedEmail, spawnedTasks },
    });

    const fullRes = await query<EmployeeRow>(`${EMPLOYEE_BASE_SELECT} WHERE e.id = $1`, [employeeId]);
    res.status(201).json({
      success: true,
      message: `${app.name} converted to employee ${employeeCode} with ${spawnedTasks} onboarding tasks.`,
      data: serializeEmployee(fullRes.rows[0], true),
    });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({
        success: false,
        error: 'Work email or linked user account already belongs to an existing employee.',
      });
      return;
    }
    next(err);
  }
}

export async function offboardEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid employee ID' });
      return;
    }

    const { terminationDate, terminationReason, deactivateAccount, offboardingTemplateId } =
      req.body as {
        terminationDate?: string;
        terminationReason?: string;
        deactivateAccount?: boolean;
        offboardingTemplateId?: string | null;
      };

    const existing = await query<{ id: string; user_id: string | null; employee_code: string }>(
      'SELECT id, user_id, employee_code FROM employees WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    const emp = existing.rows[0];

    await query(
      `UPDATE employees
       SET status = 'Terminated',
           termination_date = $1,
           termination_reason = $2
       WHERE id = $3`,
      [
        terminationDate || new Date().toISOString().slice(0, 10),
        terminationReason || '',
        id,
      ]
    );

    if (deactivateAccount && emp.user_id && emp.user_id !== req.user!.id) {
      await query('UPDATE users SET is_active = FALSE WHERE id = $1', [emp.user_id]);
    }

    const spawnedTasks = await applyChecklistTemplateToEmployee(
      id,
      'Offboarding',
      offboardingTemplateId,
      emp.user_id,
      req.user!.id
    );

    await logAudit({
      req,
      action: 'EMPLOYEE_OFFBOARDED',
      entityType: 'employee',
      entityId: id,
      metadata: {
        employeeCode: emp.employee_code,
        terminationDate,
        deactivateAccount: Boolean(deactivateAccount),
        spawnedTasks,
      },
    });

    const fullRes = await query<EmployeeRow>(`${EMPLOYEE_BASE_SELECT} WHERE e.id = $1`, [id]);
    res.json({
      success: true,
      message: `Offboarding initiated with ${spawnedTasks} tasks.`,
      data: serializeEmployee(fullRes.rows[0], true),
    });
  } catch (err) {
    next(err);
  }
}
