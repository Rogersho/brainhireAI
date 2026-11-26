import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHiringRole, isHrRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.service.js';

interface JobRow {
  id: string;
  title: string;
  department: string;
  location: string;
  description: string;
  skills: string[];
  status: 'Active' | 'Paused' | 'Closed';
  created_by: string;
  creator_name?: string;
  creator_email?: string;
  created_at: Date;
  updated_at: Date;
}

function serializeJob(row: JobRow, applicantCount?: number) {
  return {
    id: row.id,
    _id: row.id,
    title: row.title,
    department: row.department,
    location: row.location,
    description: row.description,
    skills: row.skills || [],
    status: row.status,
    createdBy: row.creator_name
      ? { id: row.created_by, _id: row.created_by, name: row.creator_name, email: row.creator_email }
      : row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(applicantCount !== undefined ? { applicantCount } : {}),
  };
}

export async function getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const myJobsOnly = req.query.myJobs === 'true';

    if (myJobsOnly) {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      if (!isHiringRole(req.user.role)) {
        res.status(403).json({ success: false, error: 'Only HR and hiring managers can query company jobs' });
        return;
      }
    }

    let sql = `
      SELECT j.*, u.name AS creator_name, u.email AS creator_email
      FROM jobs j
      JOIN users u ON u.id = j.created_by
    `;
    const params: unknown[] = [];

    if (isHrRole(req.user?.role)) {
      // Admin & HRManager can manage all internal company jobs
    } else if (req.user?.role === 'HiringManager') {
      sql += ' WHERE j.created_by = $1';
      params.push(req.user.id);
    } else {
      sql += ` WHERE j.status = 'Active'`;
    }

    sql += ' ORDER BY j.created_at DESC';

    const result = await query<JobRow>(sql, params);
    res.json({ success: true, data: result.rows.map((r) => serializeJob(r)) });
  } catch (err) {
    next(err);
  }
}

export async function getJobById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid job ID' });
      return;
    }

    const result = await query<JobRow>(
      `SELECT j.*, u.name AS creator_name, u.email AS creator_email
       FROM jobs j
       JOIN users u ON u.id = j.created_by
       WHERE j.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    const job = result.rows[0];
    const canManage =
      isHrRole(req.user?.role) ||
      (req.user?.role === 'HiringManager' && req.user.id === job.created_by);

    // Non-active jobs are only visible to HR staff or their owning hiring manager
    if (job.status !== 'Active' && !canManage) {
      res.status(403).json({ success: false, error: 'You do not have permission to view this job' });
      return;
    }

    let applicantCount: number | undefined;
    if (canManage) {
      const countRes = await query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM applicants WHERE job_id = $1',
        [id]
      );
      applicantCount = Number(countRes.rows[0]?.count || 0);
    }

    res.json({ success: true, data: serializeJob(job, applicantCount) });
  } catch (err) {
    next(err);
  }
}

export async function createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { title, department, location, description, skills, status } = req.body as {
      title: string;
      department: string;
      location: string;
      description?: string;
      skills?: string[];
      status?: 'Active' | 'Paused' | 'Closed';
    };

    const inserted = await query<JobRow>(
      `INSERT INTO jobs (title, department, location, description, skills, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title.trim(),
        department.trim(),
        location.trim(),
        description || '',
        skills || [],
        status || 'Active',
        user.id,
      ]
    );

    const job = inserted.rows[0];

    await query(
      `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
       VALUES ($1, 'Briefcase', 'Job Successfully Posted', $2, 'success', FALSE, '/jobs')`,
      [user.id, `Your job posting for "${job.title}" is now active.`]
    );

    res.status(201).json({
      success: true,
      data: serializeJob({
        ...job,
        creator_name: user.name,
        creator_email: user.email,
      }),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid job ID' });
      return;
    }

    const existing = await query<{ id: string; created_by: string }>(
      'SELECT id, created_by FROM jobs WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    if (!isHrRole(req.user!.role) && existing.rows[0].created_by !== req.user!.id) {
      res.status(403).json({ success: false, error: 'You do not have permission to edit this job' });
      return;
    }

    const { title, department, location, description, skills, status } = req.body as {
      title: string;
      department: string;
      location: string;
      description?: string;
      skills?: string[];
      status?: 'Active' | 'Paused' | 'Closed';
    };

    const updated = await query<JobRow>(
      `UPDATE jobs
       SET title = $1, department = $2, location = $3, description = $4, skills = $5, status = $6
       WHERE id = $7
       RETURNING *`,
      [
        title.trim(),
        department.trim(),
        location.trim(),
        description ?? '',
        skills ?? [],
        status ?? 'Active',
        id,
      ]
    );

    res.json({
      success: true,
      data: serializeJob({
        ...updated.rows[0],
        creator_name: req.user!.name,
        creator_email: req.user!.email,
      }),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid job ID' });
      return;
    }

    const existing = await query<{ id: string; created_by: string }>(
      'SELECT id, created_by FROM jobs WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    if (!isHrRole(req.user!.role) && existing.rows[0].created_by !== req.user!.id) {
      res.status(403).json({ success: false, error: 'You do not have permission to delete this job' });
      return;
    }

    // Cascade delete handles associated applicants and saved_jobs
    await query('DELETE FROM jobs WHERE id = $1', [id]);
    await logAudit({ req, action: 'JOB_DELETED', entityType: 'job', entityId: id });

    res.json({
      success: true,
      data: { id, _id: id, message: 'Job deleted successfully' },
    });
  } catch (err) {
    next(err);
  }
}
