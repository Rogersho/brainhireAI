import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import {
  generateJobRecommendations,
  generateJobDescription,
  generateInterviewQuestions,
  draftOfferLetter,
} from '../services/ai.service.js';

export async function getRecommendations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userRes = await query<{
      resume_text: string | null;
      skills: string[];
      ai_strengths: string[];
    }>('SELECT resume_text, skills, ai_strengths FROM users WHERE id = $1', [req.user!.id]);

    const user = userRes.rows[0];
    if (!user || !user.resume_text) {
      res.status(400).json({
        success: false,
        error: 'No CV found. Please upload your resume first.',
      });
      return;
    }

    const jobsRes = await query<{
      id: string;
      title: string;
      department: string;
      location: string;
      description: string;
      skills: string[];
    }>(`SELECT id, title, department, location, description, skills FROM jobs WHERE status = 'Active'`);

    if (jobsRes.rows.length === 0) {
      res.json({
        success: true,
        recommendations: [],
        message: 'No active jobs available at this time.',
      });
      return;
    }

    const recommendations = await generateJobRecommendations(
      {
        skills: user.skills || [],
        strengths: user.ai_strengths || [],
        resumeText: user.resume_text,
      },
      jobsRes.rows
    );

    const jobMap = new Map(jobsRes.rows.map((j) => [j.id, j]));
    const enriched = recommendations
      .filter((rec) => jobMap.has(rec.jobId))
      .map((rec) => {
        const job = jobMap.get(rec.jobId)!;
        return {
          ...rec,
          job: {
            id: job.id,
            _id: job.id,
            title: job.title,
            department: job.department,
            location: job.location,
            description: job.description,
            skills: job.skills,
          },
        };
      });

    res.json({ success: true, recommendations: enriched });
  } catch (err) {
    const msg = (err as Error)?.message || '';
    if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
      res.status(429).json({
        success: false,
        error: 'API quota exceeded. Please try again in a few moments.',
      });
      return;
    }
    next(err);
  }
}

export async function aiGenerateJd(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, department, location, employmentType, skills } = req.body;
    const result = await generateJobDescription({
      title,
      department,
      location,
      employmentType,
      skills,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function aiInterviewQuestions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { jobTitle, jobDescription, resumeText, roundType } = req.body;
    const questions = await generateInterviewQuestions({
      jobTitle,
      jobDescription: jobDescription || '',
      resumeText: resumeText || '',
      roundType: roundType || 'Technical & Role Fit',
    });
    res.json({ success: true, data: questions });
  } catch (err) {
    next(err);
  }
}

export async function aiDraftOffer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { candidateName, jobTitle, salary, currency, startDate, employmentType, benefits } =
      req.body;
    const compRes = await query<{ company_name: string }>(
      'SELECT company_name FROM company_settings ORDER BY created_at ASC LIMIT 1'
    );
    const companyName = compRes.rows[0]?.company_name || 'Hoobe HR';
    const letter = await draftOfferLetter({
      companyName,
      candidateName,
      jobTitle,
      salary: Number(salary),
      currency: currency || 'USD',
      startDate,
      employmentType: employmentType || 'Full-Time',
      benefits,
    });
    res.json({ success: true, data: { offerLetterText: letter } });
  } catch (err) {
    next(err);
  }
}
