import { Request, Response, NextFunction } from 'express';
import { extractTextFromPdf } from '../services/ai.service.js';
import {
  buildResumeKey,
  isStorageConfigured,
  uploadFileToS3,
} from '../services/storage.service.js';

export async function uploadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    if (file.mimetype !== 'application/pdf') {
      res.status(400).json({ success: false, error: 'Please upload a valid PDF file.' });
      return;
    }

    let resumeKey: string | null = null;
    let resumeUrl: string | null = null;

    if (isStorageConfigured()) {
      const key = buildResumeKey(req.user!.id, 'applications', file.originalname);
      const uploaded = await uploadFileToS3(file.buffer, key, file.mimetype);
      resumeKey = uploaded.key;
      resumeUrl = uploaded.url;
    }

    let parsedText = '';
    try {
      parsedText = await extractTextFromPdf(file.buffer);
    } catch (err) {
      console.warn('[Upload] Gemini PDF extraction fallback:', (err as Error).message);
      parsedText = `Uploaded resume PDF: ${file.originalname}`;
    }

    res.json({
      success: true,
      data: {
        filename: file.originalname,
        parsedText,
        resumeKey,
        resumeUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}
