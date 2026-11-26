import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.service.js';

export async function getInterviews(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const params: unknown[] = [];
    let where = '';

    if (isHrRole(user.role)) {
      // HR & Admin see all interviews
    } else if (user.role === 'HiringManager') {
      params.push(user.id);
      where = `WHERE j.created_by = $1 OR $1 = ANY(i.interviewer_ids) OR i.created_by = $1`;
    } else {
      // Candidates see only their own scheduled interviews
      params.push(user.id);
      where = `WHERE a.user_id = $1`;
    }

    const result = await query(
      `SELECT i.*,
              a.name AS applicant_name,
              a.role AS applicant_role,
              a.experience AS applicant_experience,
              j.title AS job_title,
              j.description AS job_description,
              (SELECT COUNT(*)::int FROM interview_scorecards s WHERE s.interview_id = i.id) AS scorecard_count,
              (SELECT ROUND(AVG((s.technical_score + s.communication_score + s.problem_solving_score + s.culture_fit_score) / 4.0), 1)
               FROM interview_scorecards s WHERE s.interview_id = i.id) AS avg_rating
       FROM interviews i
       JOIN applicants a ON a.id = i.applicant_id
       JOIN jobs j ON j.id = i.job_id
       ${where}
       ORDER BY i.scheduled_at DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        applicantId: r.applicant_id,
        applicantName: r.applicant_name,
        applicantRole: r.applicant_role,
        applicantExperience: isHrRole(user.role) || user.role === 'HiringManager' ? r.applicant_experience : undefined,
        jobId: r.job_id,
        jobTitle: r.job_title,
        jobDescription: isHrRole(user.role) || user.role === 'HiringManager' ? r.job_description : undefined,
        title: r.title,
        roundNumber: r.round_number,
        scheduledAt: r.scheduled_at,
        durationMinutes: r.duration_minutes,
        mode: r.mode,
        meetingLink: r.meeting_link,
        interviewerIds: r.interviewer_ids || [],
        status: r.status,
        notes: r.notes,
        scorecardCount: r.scorecard_count || 0,
        avgRating: r.avg_rating !== null ? Number(r.avg_rating) : null,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createInterview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      applicantId,
      title,
      roundNumber,
      scheduledAt,
      durationMinutes,
      mode,
      meetingLink,
      interviewerIds,
      notes,
    } = req.body;

    const appRes = await query<{ id: string; job_id: string; user_id: string | null; name: string; job_title: string }>(
      `SELECT a.id, a.job_id, a.user_id, a.name, j.title AS job_title
       FROM applicants a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1`,
      [applicantId]
    );

    if (appRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Applicant not found' });
      return;
    }

    const app = appRes.rows[0];
    const interviewers = Array.isArray(interviewerIds) && interviewerIds.length > 0
      ? interviewerIds
      : [req.user!.id];

    const inserted = await query(
      `INSERT INTO interviews
         (applicant_id, job_id, title, round_number, scheduled_at, duration_minutes, mode, meeting_link, interviewer_ids, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        applicantId,
        app.job_id,
        title.trim(),
        roundNumber ?? 1,
        scheduledAt,
        durationMinutes ?? 45,
        mode || 'Video',
        meetingLink || '',
        interviewers,
        notes || '',
        req.user!.id,
      ]
    );

    // Move applicant stage to Interview automatically if earlier in pipeline
    await query(
      `UPDATE applicants SET status = 'Interview', pipeline_stage = 'Interview'
       WHERE id = $1 AND status IN ('Applied', 'Pending', 'Screening', 'In Review', 'Shortlisted')`,
      [applicantId]
    );

    if (app.user_id) {
      await query(
        `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
         VALUES ($1, 'Calendar', 'Interview Scheduled', $2, 'info', FALSE, '/candidate-dashboard/applications')`,
        [
          app.user_id,
          `Your "${title}" interview for ${app.job_title} is scheduled for ${new Date(scheduledAt).toLocaleString()}.`,
        ]
      );
    }

    await logAudit({
      req,
      action: 'INTERVIEW_SCHEDULED',
      entityType: 'interview',
      entityId: inserted.rows[0].id,
      metadata: { applicantId, title, scheduledAt },
    });

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function updateInterview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid interview ID' });
      return;
    }

    const { status, scheduledAt, meetingLink, notes } = req.body;
    const updated = await query(
      `UPDATE interviews
       SET status = COALESCE($1, status),
           scheduled_at = COALESCE($2, scheduled_at),
           meeting_link = COALESCE($3, meeting_link),
           notes = COALESCE($4, notes)
       WHERE id = $5
       RETURNING *`,
      [status ?? null, scheduledAt ?? null, meetingLink ?? null, notes ?? null, id]
    );

    if (updated.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Interview not found' });
      return;
    }

    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function getScorecards(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid interview ID' });
      return;
    }

    const result = await query(
      `SELECT s.*, u.name AS interviewer_name, u.email AS interviewer_email
       FROM interview_scorecards s
       JOIN users u ON u.id = s.interviewer_id
       WHERE s.interview_id = $1
       ORDER BY s.submitted_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        interviewId: r.interview_id,
        interviewerId: r.interviewer_id,
        interviewerName: r.interviewer_name,
        technicalScore: r.technical_score,
        communicationScore: r.communication_score,
        problemSolvingScore: r.problem_solving_score,
        cultureFitScore: r.culture_fit_score,
        overallRecommendation: r.overall_recommendation,
        strengthsNotes: r.strengths_notes,
        concernsNotes: r.concerns_notes,
        submittedAt: r.submitted_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function submitScorecard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid interview ID' });
      return;
    }

    const {
      technicalScore,
      communicationScore,
      problemSolvingScore,
      cultureFitScore,
      overallRecommendation,
      strengthsNotes,
      concernsNotes,
    } = req.body;

    const upserted = await query(
      `INSERT INTO interview_scorecards
         (interview_id, interviewer_id, technical_score, communication_score, problem_solving_score,
          culture_fit_score, overall_recommendation, strengths_notes, concerns_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (interview_id, interviewer_id)
       DO UPDATE SET
         technical_score = EXCLUDED.technical_score,
         communication_score = EXCLUDED.communication_score,
         problem_solving_score = EXCLUDED.problem_solving_score,
         culture_fit_score = EXCLUDED.culture_fit_score,
         overall_recommendation = EXCLUDED.overall_recommendation,
         strengths_notes = EXCLUDED.strengths_notes,
         concerns_notes = EXCLUDED.concerns_notes,
         submitted_at = NOW()
       RETURNING *`,
      [
        id,
        req.user!.id,
        technicalScore,
        communicationScore,
        problemSolvingScore,
        cultureFitScore,
        overallRecommendation,
        strengthsNotes || '',
        concernsNotes || '',
      ]
    );

    await query(`UPDATE interviews SET status = 'Completed' WHERE id = $1 AND status = 'Scheduled'`, [id]);

    res.status(201).json({ success: true, data: upserted.rows[0] });
  } catch (err) {
    next(err);
  }
}
