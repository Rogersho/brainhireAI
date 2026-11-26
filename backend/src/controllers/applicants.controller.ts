import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole, isHiringRole } from '../middleware/auth.js';
import {
  deleteFileFromS3,
  getPresignedDownloadUrl,
  isStorageConfigured,
} from '../services/storage.service.js';

interface ApplicantJoinedRow {
  id: string;
  name: string;
  job_id: string;
  user_id: string | null;
  role: string;
  score: number;
  ai_strengths: string;
  ai_gaps: string;
  ai_recommendation: string;
  status: 'Shortlisted' | 'In Review' | 'Pending' | 'Rejected' | 'Hired';
  source: string;
  skills: string[];
  experience: string;
  resume_url: string | null;
  resume_key: string | null;
  created_at: Date;
  updated_at: Date;
  job_title?: string;
  job_department?: string;
  job_location?: string;
  job_created_by?: string;
  candidate_name?: string;
  candidate_email?: string;
  converted_employee_id?: string | null;
}

async function resolveResumeUrl(row: ApplicantJoinedRow): Promise<string | null> {
  if (row.resume_key && isStorageConfigured()) {
    try {
      return await getPresignedDownloadUrl(row.resume_key);
    } catch (err) {
      console.warn('[Applicants] Failed to sign resume URL:', (err as Error).message);
    }
  }
  return row.resume_url;
}

async function serializeApplicant(row: ApplicantJoinedRow) {
  const resumeUrl = await resolveResumeUrl(row);
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    jobId: row.job_title
      ? {
          id: row.job_id,
          _id: row.job_id,
          title: row.job_title,
          department: row.job_department,
          location: row.job_location,
        }
      : row.job_id,
    userId: row.user_id
      ? row.candidate_email
        ? {
            id: row.user_id,
            _id: row.user_id,
            name: row.candidate_name,
            email: row.candidate_email,
          }
        : row.user_id
      : null,
    role: row.role,
    score: row.score,
    aiStrengths: row.ai_strengths,
    aiGaps: row.ai_gaps,
    aiRecommendation: row.ai_recommendation,
    status: row.status,
    source: row.source,
    skills: row.skills || [],
    experience: row.experience,
    resumeKey: row.resume_key,
    resumeUrl,
    convertedEmployeeId: row.converted_employee_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getApplicants(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const jobIdParam = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;

    if (jobIdParam && !isValidUuid(jobIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid jobId filter' });
      return;
    }

    const baseSelect = `
      SELECT a.*,
             j.title AS job_title,
             j.department AS job_department,
             j.location AS job_location,
             j.created_by AS job_created_by,
             u.name AS candidate_name,
             u.email AS candidate_email,
             e.id AS converted_employee_id
      FROM applicants a
      JOIN jobs j ON j.id = a.job_id
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN employees e ON e.source_applicant_id = a.id
    `;

    let sql = baseSelect;
    const params: unknown[] = [];

    if (isHrRole(user.role)) {
      if (jobIdParam) {
        sql += ' WHERE a.job_id = $1';
        params.push(jobIdParam);
      }
    } else if (user.role === 'HiringManager') {
      sql += ' WHERE j.created_by = $1';
      params.push(user.id);
      if (jobIdParam) {
        sql += ' AND a.job_id = $2';
        params.push(jobIdParam);
      }
    } else {
      // Candidates & Employees can ONLY ever read their own applications
      sql += ' WHERE a.user_id = $1';
      params.push(user.id);
      if (jobIdParam) {
        sql += ' AND a.job_id = $2';
        params.push(jobIdParam);
      }
    }

    sql += ' ORDER BY a.score DESC, a.created_at DESC';

    const result = await query<ApplicantJoinedRow>(sql, params);
    const data = await Promise.all(result.rows.map(serializeApplicant));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getApplicantById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid applicant ID' });
      return;
    }

    const result = await query<ApplicantJoinedRow>(
      `SELECT a.*,
              j.title AS job_title,
              j.department AS job_department,
              j.location AS job_location,
              j.created_by AS job_created_by,
              u.name AS candidate_name,
              u.email AS candidate_email,
              e.id AS converted_employee_id
       FROM applicants a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN employees e ON e.source_applicant_id = a.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Applicant not found' });
      return;
    }

    const applicant = result.rows[0];
    const user = req.user!;
    const canViewAsHr = isHrRole(user.role);
    const isOwningManager = user.role === 'HiringManager' && applicant.job_created_by === user.id;
    const isSelfCandidate = applicant.user_id === user.id;

    if (!canViewAsHr && !isOwningManager && !isSelfCandidate) {
      res.status(403).json({ success: false, error: 'Forbidden: you cannot view this application' });
      return;
    }

    res.json({ success: true, data: await serializeApplicant(applicant) });
  } catch (err) {
    next(err);
  }
}

export async function getApplicantResumeUrl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid applicant ID' });
      return;
    }

    const result = await query<{
      id: string;
      user_id: string | null;
      resume_key: string | null;
      resume_url: string | null;
      job_created_by: string;
    }>(
      `SELECT a.id, a.user_id, a.resume_key, a.resume_url, j.created_by AS job_created_by
       FROM applicants a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Applicant not found' });
      return;
    }

    const row = result.rows[0];
    const user = req.user!;
    const isAuthorized =
      isHrRole(user.role) ||
      (user.role === 'HiringManager' && row.job_created_by === user.id) ||
      row.user_id === user.id;

    if (!isAuthorized) {
      res.status(403).json({ success: false, error: 'Forbidden: you cannot access this resume' });
      return;
    }

    if (row.resume_key && isStorageConfigured()) {
      const url = await getPresignedDownloadUrl(row.resume_key);
      res.json({ success: true, data: { url, key: row.resume_key } });
      return;
    }

    if (row.resume_url) {
      res.json({ success: true, data: { url: row.resume_url, key: null } });
      return;
    }

    res.status(404).json({ success: false, error: 'No stored resume file for this applicant' });
  } catch (err) {
    next(err);
  }
}

export async function createApplicant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { jobId, name, role, experience, source, skills, resumeUrl, resumeKey } = req.body as {
      jobId: string;
      name?: string;
      role?: string;
      experience: string;
      source?: string;
      skills?: string[];
      resumeUrl?: string;
      resumeKey?: string;
    };

    if (!isValidUuid(jobId)) {
      res.status(400).json({ success: false, error: 'Invalid job ID' });
      return;
    }

    const jobRes = await query<{ id: string; title: string; status: string; created_by: string }>(
      'SELECT id, title, status, created_by FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    const job = jobRes.rows[0];

    if (user.role === 'HiringManager' && job.created_by !== user.id) {
      res.status(403).json({ success: false, error: 'You can only add applicants to your own jobs' });
      return;
    }

    // Prevent attaching another user's S3 object key (IDOR protection)
    let resolvedResumeKey: string | null = null;
    if (resumeKey && resumeKey.trim()) {
      const trimmedKey = resumeKey.trim();
      const allowedPrefixA = `uploads/applications/${user.id}/`;
      const allowedPrefixB = `uploads/profiles/${user.id}/`;
      if (!trimmedKey.startsWith(allowedPrefixA) && !trimmedKey.startsWith(allowedPrefixB)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: invalid resume storage key',
        });
        return;
      }
      resolvedResumeKey = trimmedKey;
    }

    if (user.role === 'Candidate') {
      if (job.status !== 'Active') {
        res.status(400).json({ success: false, error: 'This job is no longer accepting applications' });
        return;
      }

      const duplicate = await query(
        'SELECT id FROM applicants WHERE job_id = $1 AND user_id = $2',
        [jobId, user.id]
      );
      if (duplicate.rows.length > 0) {
        res.status(409).json({ success: false, error: 'You have already applied for this job' });
        return;
      }

      // Fall back to the candidate's profile CV in S3 if no application-specific upload was provided
      if (!resolvedResumeKey) {
        const userCvRes = await query<{ resume_key: string | null }>(
          'SELECT resume_key FROM users WHERE id = $1',
          [user.id]
        );
        resolvedResumeKey = userCvRes.rows[0]?.resume_key || null;
      }
    }

    const applicantName = user.role === 'Candidate' ? user.name : (name?.trim() || 'Candidate');
    const applicantUserId = user.role === 'Candidate' ? user.id : null;
    const applicantRole = role?.trim() || job.title;
    const applicantSource = source?.trim() || 'Job Board';
    // Only persist external resumeUrl when no S3 resumeKey is stored (presigned URLs expire)
    const storedResumeUrl = resolvedResumeKey ? null : (resumeUrl || null);

    // Always enforce initial score=0 and status='Pending' (prevents mass-assignment)
    const inserted = await query<ApplicantJoinedRow>(
      `INSERT INTO applicants (name, job_id, user_id, role, score, status, source, skills, experience, resume_url, resume_key)
       VALUES ($1, $2, $3, $4, 0, 'Pending', $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        applicantName,
        job.id,
        applicantUserId,
        applicantRole,
        applicantSource,
        skills || [],
        experience,
        storedResumeUrl,
        resolvedResumeKey,
      ]
    );

    const created = inserted.rows[0];

    // Notify the job's recruiter
    await query(
      `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
       VALUES ($1, 'UserPlus', 'New Application', $2, 'info', FALSE, $3)`,
      [
        job.created_by,
        `${applicantName} has applied for ${job.title}.`,
        `/applicants/${created.id}`,
      ]
    );

    res.status(201).json({ success: true, data: await serializeApplicant(created) });
  } catch (err) {
    next(err);
  }
}

export async function updateApplicant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid applicant ID' });
      return;
    }

    const existingRes = await query<{
      id: string;
      status: string;
      user_id: string | null;
      job_created_by: string;
      job_title: string;
    }>(
      `SELECT a.id, a.status, a.user_id, j.created_by AS job_created_by, j.title AS job_title
       FROM applicants a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1`,
      [id]
    );

    if (existingRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Applicant not found' });
      return;
    }

    const existing = existingRes.rows[0];
    if (!isHrRole(req.user!.role) && existing.job_created_by !== req.user!.id) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: only HR or the job owner can update this applicant',
      });
      return;
    }

    const { status, score, skills, experience, resumeUrl, source, name, role } = req.body as {
      status?: 'Shortlisted' | 'In Review' | 'Pending' | 'Rejected' | 'Hired';
      score?: number;
      skills?: string[];
      experience?: string;
      resumeUrl?: string | null;
      source?: string;
      name?: string;
      role?: string;
    };

    const isStatusChanging = status && status !== existing.status;

    await query(
      `UPDATE applicants
       SET status = COALESCE($1, status),
           score = COALESCE($2, score),
           skills = COALESCE($3, skills),
           experience = COALESCE($4, experience),
           resume_url = COALESCE($5, resume_url),
           source = COALESCE($6, source),
           name = COALESCE($7, name),
           role = COALESCE($8, role)
       WHERE id = $9`,
      [
        status ?? null,
        score ?? null,
        skills ?? null,
        experience ?? null,
        resumeUrl ?? null,
        source ?? null,
        name ?? null,
        role ?? null,
        id,
      ]
    );

    const updatedRes = await query<ApplicantJoinedRow>(
      `SELECT a.*,
              j.title AS job_title,
              j.department AS job_department,
              j.location AS job_location,
              j.created_by AS job_created_by,
              u.name AS candidate_name,
              u.email AS candidate_email
       FROM applicants a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [id]
    );

    if (isStatusChanging && existing.user_id) {
      let icon = 'Info';
      let type: 'info' | 'success' | 'warning' = 'info';

      if (status === 'Shortlisted' || status === 'Hired') {
        icon = 'CheckCircle';
        type = 'success';
      } else if (status === 'Rejected') {
        icon = 'AlertCircle';
        type = 'warning';
      }

      const title =
        status === 'Hired' ? 'Congratulations! You are Hired' : 'Application Status Update';
      const description =
        status === 'Hired'
          ? `Great news! You have been hired for the ${existing.job_title} position.`
          : `Your application status for ${existing.job_title} has been updated to: ${status}.`;

      await query(
        `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
         VALUES ($1, $2, $3, $4, $5, FALSE, '/candidate-dashboard/applications')`,
        [existing.user_id, icon, title, description, type]
      );
    }

    res.json({ success: true, data: await serializeApplicant(updatedRes.rows[0]) });
  } catch (err) {
    next(err);
  }
}

export async function deleteApplicant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid applicant ID' });
      return;
    }

    const existingRes = await query<{
      id: string;
      user_id: string | null;
      resume_key: string | null;
      job_created_by: string;
    }>(
      `SELECT a.id, a.user_id, a.resume_key, j.created_by AS job_created_by
       FROM applicants a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1`,
      [id]
    );

    if (existingRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Applicant not found' });
      return;
    }

    const row = existingRes.rows[0];
    const user = req.user!;
    const canDelete =
      isHrRole(user.role) ||
      (isHiringRole(user.role) && row.job_created_by === user.id) ||
      row.user_id === user.id;

    if (!canDelete) {
      res.status(403).json({ success: false, error: 'Forbidden: cannot delete this application' });
      return;
    }

    await query('DELETE FROM applicants WHERE id = $1', [id]);

    if (row.resume_key && row.resume_key.startsWith('uploads/applications/')) {
      await deleteFileFromS3(row.resume_key);
    }

    res.json({
      success: true,
      data: { id, _id: id, message: 'Applicant deleted successfully' },
    });
  } catch (err) {
    next(err);
  }
}
