import { Request, Response, NextFunction } from 'express';
import { extractTextFromPdf } from '../services/gemini.service.js';

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

    const parsedText = await extractTextFromPdf(file.buffer);

    res.json({
      success: true,
      data: {
        filename: file.originalname,
        parsedText,
      },
    });
  } catch (err) {
    next(err);
  }
}
