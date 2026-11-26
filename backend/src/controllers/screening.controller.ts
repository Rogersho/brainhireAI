import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole } from '../middleware/auth.js';
import { screenCandidate } from '../services/ai.service.js';

export async function runScreening(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { jobId } = req.body as { jobId: string };
    if (!isValidUuid(jobId)) {
      res.status(400).json({ success: false, error: 'Invalid Job ID' });
      return;
    }

    const jobRes = await query<{
      id: string;
      title: string;
      description: string;
      created_by: string;
    }>('SELECT id, title, description, created_by FROM jobs WHERE id = $1', [jobId]);

    if (jobRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    const job = jobRes.rows[0];
    if (!isHrRole(req.user!.role) && job.created_by !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Access denied - You did not create this job' });
      return;
    }

    const applicantsRes = await query<{
      id: string;
      name: string;
      role: string;
      skills: string[];
      experience: string;
    }>('SELECT id, name, role, skills, experience FROM applicants WHERE job_id = $1', [job.id]);

    if (applicantsRes.rows.length === 0) {
      res.status(400).json({ success: false, error: 'No applicants to screen' });
      return;
    }

    const screeningResults: Array<{
      id: string;
      score: number;
      strengths: string;
      gaps: string;
      recommendation: string;
    }> = [];

    for (const applicant of applicantsRes.rows) {
      try {
        const result = await screenCandidate(job.description, {
          name: applicant.name,
          role: applicant.role,
          skills: applicant.skills || [],
          experience: applicant.experience,
        });

        await query(
          `UPDATE applicants
           SET score = $1, ai_strengths = $2, ai_gaps = $3, ai_recommendation = $4, skills = $5
           WHERE id = $6`,
          [
            result.score,
            result.strengths,
            result.gaps,
            result.recommendation,
            result.skills,
            applicant.id,
          ]
        );

        screeningResults.push({
          id: applicant.id,
          score: result.score,
          strengths: result.strengths,
          gaps: result.gaps,
          recommendation: result.recommendation,
        });
      } catch (err) {
        console.error(`[Screening] Failed for applicant ${applicant.id}:`, err);
      }
    }

    await query(
      `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
       VALUES ($1, 'Brain', 'AI Screening Complete', $2, 'success', FALSE, '/applicants')`,
      [
        req.user!.id,
        `Successfully screened ${screeningResults.length} candidates for "${job.title}". Check the results now.`,
      ]
    );

    const updatedRes = await query(
      'SELECT * FROM applicants WHERE job_id = $1 ORDER BY score DESC, created_at DESC',
      [job.id]
    );

    res.json({
      success: true,
      data: screeningResults,
      applicants: updatedRes.rows,
    });
  } catch (err) {
    next(err);
  }
}
