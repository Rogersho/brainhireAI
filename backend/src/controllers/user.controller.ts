import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { analyzeResumeText, extractTextFromPdf } from '../services/ai.service.js';
import {
  buildResumeKey,
  deleteFileFromS3,
  getPresignedDownloadUrl,
  isStorageConfigured,
  uploadFileToS3,
} from '../services/storage.service.js';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userRes = await query<{
      id: string;
      name: string;
      email: string;
      role: string;
      resume_text: string | null;
      resume_hash: string | null;
      resume_key: string | null;
      resume_cached_at: Date | null;
      skills: string[];
      ai_strengths: string[];
      ai_weaknesses: string[];
      created_at: Date;
    }>(
      `SELECT id, name, email, role, resume_text, resume_hash, resume_key, resume_cached_at,
              skills, ai_strengths, ai_weaknesses, created_at
       FROM users
       WHERE id = $1`,
      [req.user!.id]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const savedRes = await query<{ job_id: string }>(
      'SELECT job_id FROM saved_jobs WHERE user_id = $1',
      [req.user!.id]
    );

    const row = userRes.rows[0];
    let resumeUrl: string | null = null;
    if (row.resume_key && isStorageConfigured()) {
      try {
        resumeUrl = await getPresignedDownloadUrl(row.resume_key);
      } catch (err) {
        console.warn('[Profile] Could not sign resume URL:', (err as Error).message);
      }
    }

    res.json({
      success: true,
      data: {
        id: row.id,
        _id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        resumeText: row.resume_text,
        resumeHash: row.resume_hash,
        resumeKey: row.resume_key,
        resumeUrl,
        resumeCachedAt: row.resume_cached_at,
        skills: row.skills || [],
        aiAnalysis:
          row.ai_strengths.length > 0 || row.ai_weaknesses.length > 0
            ? { strengths: row.ai_strengths, weaknesses: row.ai_weaknesses }
            : null,
        savedJobs: savedRes.rows.map((r) => r.job_id),
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadProfileResume(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        error: 'Please upload a PDF, TXT, DOC, DOCX, or CSV file.',
      });
      return;
    }

    const prevRes = await query<{ resume_key: string | null }>(
      'SELECT resume_key FROM users WHERE id = $1',
      [req.user!.id]
    );
    const previousKey = prevRes.rows[0]?.resume_key || null;

    let resumeKey: string | null = previousKey;
    let resumeUrl: string | null = null;

    if (isStorageConfigured()) {
      const key = buildResumeKey(req.user!.id, 'profiles', file.originalname);
      const uploaded = await uploadFileToS3(file.buffer, key, file.mimetype);
      resumeKey = uploaded.key;
      resumeUrl = uploaded.url;
    }

    const resumeHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    let extractedText = '';
    if (file.mimetype === 'application/pdf') {
      try {
        extractedText = await extractTextFromPdf(file.buffer);
      } catch (err) {
        console.warn('[Profile] PDF Gemini OCR fallback to filename:', (err as Error).message);
        extractedText = `Uploaded resume file: ${file.originalname}`;
      }
    } else {
      extractedText = file.buffer.toString('utf8').slice(0, 12000) || file.originalname;
    }

    let skills: string[] = [];
    let strengths: string[] = [];
    let weaknesses: string[] = [];

    if (extractedText.length > 40) {
      try {
        const analysis = await analyzeResumeText(extractedText);
        skills = analysis.skills;
        strengths = analysis.strengths;
        weaknesses = analysis.weaknesses;
      } catch (err) {
        console.warn('[Profile] Resume AI analysis skipped:', (err as Error).message);
      }
    }

    await query(
      `UPDATE users
       SET resume_text = $1,
           resume_hash = $2,
           resume_key = $3,
           resume_cached_at = NOW(),
           skills = $4,
           ai_strengths = $5,
           ai_weaknesses = $6
       WHERE id = $7`,
      [extractedText, resumeHash, resumeKey, skills, strengths, weaknesses, req.user!.id]
    );

    if (previousKey && resumeKey && previousKey !== resumeKey) {
      await deleteFileFromS3(previousKey);
    }

    res.json({
      success: true,
      message: `${file.originalname} uploaded and analyzed successfully!`,
      profile: {
        fileName: file.originalname,
        resumeKey,
        resumeUrl,
        skills,
        aiAnalysis: { strengths, weaknesses },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleSavedJob(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { jobId } = req.body as { jobId: string };
    if (!isValidUuid(jobId)) {
      res.status(400).json({ success: false, error: 'Invalid job ID' });
      return;
    }

    const jobExists = await query('SELECT id FROM jobs WHERE id = $1', [jobId]);
    if (jobExists.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    const existing = await query(
      'SELECT 1 FROM saved_jobs WHERE user_id = $1 AND job_id = $2',
      [req.user!.id, jobId]
    );

    let action: 'saved' | 'removed';
    if (existing.rows.length === 0) {
      await query('INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2)', [
        req.user!.id,
        jobId,
      ]);
      action = 'saved';
    } else {
      await query('DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2', [
        req.user!.id,
        jobId,
      ]);
      action = 'removed';
    }

    const allSaved = await query<{ job_id: string }>(
      'SELECT job_id FROM saved_jobs WHERE user_id = $1',
      [req.user!.id]
    );

    res.json({
      success: true,
      action,
      savedJobs: allSaved.rows.map((r) => r.job_id),
    });
  } catch (err) {
    next(err);
  }
}
