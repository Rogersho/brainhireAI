import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import {
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
  UserRole,
} from '../middleware/auth.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role: UserRole;
    };

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, error: 'Email is already registered.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userRole: UserRole = role === 'Recruiter' ? 'Recruiter' : 'Candidate';

    const inserted = await query<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
    }>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name.trim(), normalizedEmail, passwordHash, userRole]
    );

    const user = inserted.rows[0];
    const token = signAuthToken(user);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user,
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const normalizedEmail = email.trim().toLowerCase();

    const result = await query<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
      password_hash: string;
    }>(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const row = result.rows[0];
    const isMatch = await bcrypt.compare(password, row.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
    };

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    res.json({
      success: true,
      user,
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out successfully.' });
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    user: req.user,
  });
}
