import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  // Handle Multer file upload errors
  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ success: false, error: 'File too large. Maximum size is 5MB.' });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[API Error]', err);
  res.status(500).json({ success: false, error: message });
}
