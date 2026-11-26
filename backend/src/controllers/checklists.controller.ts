import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.service.js';

export async function getTemplates(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const templatesRes = await query(
      'SELECT * FROM onboarding_templates ORDER BY type ASC, name ASC'
    );
    const tasksRes = await query(
      'SELECT * FROM onboarding_template_tasks ORDER BY sort_order ASC, id ASC'
    );

    const tasksByTemplate = new Map<string, any[]>();
    for (const t of tasksRes.rows as any[]) {
      const list = tasksByTemplate.get(t.template_id) || [];
      list.push({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        assigneeRole: t.assignee_role,
        dueOffsetDays: t.due_offset_days,
        sortOrder: t.sort_order,
      });
      tasksByTemplate.set(t.template_id, list);
    }

    res.json({
      success: true,
      data: templatesRes.rows.map((tpl: any) => ({
        id: tpl.id,
        name: tpl.name,
        type: tpl.type,
        description: tpl.description,
        tasks: tasksByTemplate.get(tpl.id) || [],
        createdAt: tpl.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createTemplate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, type, description, tasks } = req.body as {
      name: string;
      type: 'Onboarding' | 'Offboarding';
      description?: string;
      tasks: Array<{
        title: string;
        description?: string;
        category?: string;
        assigneeRole?: string;
        dueOffsetDays?: number;
      }>;
    };

    const ins = await query<{ id: string }>(
      `INSERT INTO onboarding_templates (name, type, description)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [name.trim(), type, description || '']
    );
    const templateId = ins.rows[0].id;

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      await query(
        `INSERT INTO onboarding_template_tasks
           (template_id, title, description, category, assignee_role, due_offset_days, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          templateId,
          t.title.trim(),
          t.description || '',
          t.category || 'Paperwork',
          t.assigneeRole || 'HRManager',
          t.dueOffsetDays ?? 7,
          i + 1,
        ]
      );
    }

    await logAudit({
      req,
      action: 'CHECKLIST_TEMPLATE_CREATED',
      entityType: 'onboarding_template',
      entityId: templateId,
      metadata: { name, type, taskCount: tasks.length },
    });

    res.status(201).json({ success: true, data: { id: templateId, name, type } });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ success: false, error: 'A template with this name already exists' });
      return;
    }
    next(err);
  }
}

export async function deleteTemplate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid template ID' });
      return;
    }
    const del = await query('DELETE FROM onboarding_templates WHERE id = $1 RETURNING id', [id]);
    if (del.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }
    res.json({ success: true, data: { id, message: 'Template deleted' } });
  } catch (err) {
    next(err);
  }
}

export async function getChecklistsOverview(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query(
      `SELECT e.id AS employee_id,
              e.employee_code,
              e.first_name,
              e.last_name,
              e.job_title,
              e.status AS employee_status,
              e.hire_date,
              d.name AS department_name,
              t.type AS checklist_type,
              COUNT(t.id)::int AS total_tasks,
              COUNT(t.id) FILTER (WHERE t.status = 'Completed')::int AS completed_tasks,
              MIN(t.due_date) FILTER (WHERE t.status != 'Completed') AS next_due_date
       FROM employee_checklist_tasks t
       JOIN employees e ON e.id = t.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       GROUP BY e.id, d.name, t.type
       ORDER BY (COUNT(t.id) - COUNT(t.id) FILTER (WHERE t.status = 'Completed')) DESC, e.hire_date DESC`
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        employeeId: r.employee_id,
        employeeCode: r.employee_code,
        fullName: `${r.first_name} ${r.last_name}`.trim(),
        jobTitle: r.job_title,
        employeeStatus: r.employee_status,
        hireDate: r.hire_date,
        departmentName: r.department_name || null,
        checklistType: r.checklist_type,
        totalTasks: r.total_tasks,
        completedTasks: r.completed_tasks,
        progressPercent: r.total_tasks > 0 ? Math.round((r.completed_tasks / r.total_tasks) * 100) : 0,
        nextDueDate: r.next_due_date,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getEmployeeChecklist(
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

    const empRes = await query<{ id: string; user_id: string | null; manager_id: string | null }>(
      'SELECT id, user_id, manager_id FROM employees WHERE id = $1',
      [employeeId]
    );
    if (empRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    const emp = empRes.rows[0];
    const user = req.user!;
    let isDirectManager = false;
    if (emp.manager_id) {
      const m = await query<{ user_id: string | null }>('SELECT user_id FROM employees WHERE id = $1', [
        emp.manager_id,
      ]);
      isDirectManager = m.rows[0]?.user_id === user.id;
    }

    if (!isHrRole(user.role) && emp.user_id !== user.id && !isDirectManager) {
      res.status(403).json({ success: false, error: 'Forbidden: cannot view this checklist' });
      return;
    }

    const tasksRes = await query(
      `SELECT t.*, u.name AS assignee_name, c.name AS completed_by_name
       FROM employee_checklist_tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN users c ON c.id = t.completed_by
       WHERE t.employee_id = $1
       ORDER BY t.type ASC, t.due_date ASC NULLS LAST, t.created_at ASC`,
      [employeeId]
    );

    res.json({
      success: true,
      data: tasksRes.rows.map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        type: r.type,
        title: r.title,
        description: r.description,
        category: r.category,
        assignedTo: r.assigned_to,
        assigneeName: r.assignee_name || null,
        dueDate: r.due_date,
        status: r.status,
        completedAt: r.completed_at,
        completedByName: r.completed_by_name || null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function addEmployeeTask(
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

    const { type, title, description, category, assignedTo, dueDate } = req.body;
    const inserted = await query(
      `INSERT INTO employee_checklist_tasks
         (employee_id, type, title, description, category, assigned_to, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
       RETURNING *`,
      [
        employeeId,
        type || 'Onboarding',
        title.trim(),
        description || '',
        category || 'General',
        assignedTo || null,
        dueDate || null,
      ]
    );

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function applyTemplateToEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { employeeId } = req.params;
    const { templateId } = req.body as { templateId: string };
    if (!isValidUuid(employeeId) || !isValidUuid(templateId)) {
      res.status(400).json({ success: false, error: 'Invalid employeeId or templateId' });
      return;
    }

    const empRes = await query<{ user_id: string | null }>(
      'SELECT user_id FROM employees WHERE id = $1',
      [employeeId]
    );
    if (empRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    const tplRes = await query<{ id: string; type: string }>(
      'SELECT id, type FROM onboarding_templates WHERE id = $1',
      [templateId]
    );
    if (tplRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }

    const tasksRes = await query<{
      title: string;
      description: string;
      category: string;
      assignee_role: string;
      due_offset_days: number;
    }>(
      'SELECT title, description, category, assignee_role, due_offset_days FROM onboarding_template_tasks WHERE template_id = $1 ORDER BY sort_order ASC',
      [templateId]
    );

    for (const t of tasksRes.rows) {
      const assignedTo =
        t.assignee_role === 'Employee' ? empRes.rows[0].user_id : req.user!.id;
      await query(
        `INSERT INTO employee_checklist_tasks
           (employee_id, type, title, description, category, assigned_to, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE + ($7 || ' days')::interval, 'Pending')`,
        [employeeId, tplRes.rows[0].type, t.title, t.description, t.category, assignedTo, t.due_offset_days]
      );
    }

    res.status(201).json({
      success: true,
      message: `Added ${tasksRes.rows.length} tasks from template.`,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTaskStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { taskId } = req.params;
    if (!isValidUuid(taskId)) {
      res.status(400).json({ success: false, error: 'Invalid task ID' });
      return;
    }

    const taskRes = await query<{
      id: string;
      assigned_to: string | null;
      employee_user_id: string | null;
    }>(
      `SELECT t.id, t.assigned_to, e.user_id AS employee_user_id
       FROM employee_checklist_tasks t
       JOIN employees e ON e.id = t.employee_id
       WHERE t.id = $1`,
      [taskId]
    );
    if (taskRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = taskRes.rows[0];
    const user = req.user!;
    const allowed =
      isHrRole(user.role) || task.assigned_to === user.id || task.employee_user_id === user.id;

    if (!allowed) {
      res.status(403).json({ success: false, error: 'Forbidden: cannot update this task' });
      return;
    }

    const { status } = req.body as { status: 'Pending' | 'In Progress' | 'Completed' };
    const completedAt = status === 'Completed' ? new Date() : null;
    const completedBy = status === 'Completed' ? user.id : null;

    const updated = await query(
      `UPDATE employee_checklist_tasks
       SET status = $1, completed_at = $2, completed_by = $3
       WHERE id = $4
       RETURNING *`,
      [status, completedAt, completedBy, taskId]
    );

    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { taskId } = req.params;
    if (!isValidUuid(taskId)) {
      res.status(400).json({ success: false, error: 'Invalid task ID' });
      return;
    }
    const del = await query('DELETE FROM employee_checklist_tasks WHERE id = $1 RETURNING id', [
      taskId,
    ]);
    if (del.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }
    res.json({ success: true, data: { id: taskId } });
  } catch (err) {
    next(err);
  }
}
