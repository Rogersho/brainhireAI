import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import {
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
  UserRole,
} from '../middleware/auth.js';
import { logAudit } from '../services/audit.service.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role?: string;
    };

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, error: 'Email is already registered.' });
      return;
    }

    // Public self-registration allows Candidate or HR/Recruiter; first internal HR becomes Admin
    let userRole: UserRole = 'Candidate';
    if (role === 'Recruiter' || role === 'HRManager' || role === 'Admin') {
      const adminCheck = await query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM users WHERE role = 'Admin'"
      );
      const hasAdmin = Number(adminCheck.rows[0]?.count || 0) > 0;
      userRole = hasAdmin ? 'HRManager' : 'Admin';
    } else if (role === 'HiringManager') {
      userRole = 'HiringManager';
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const inserted = await query<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
      is_active: boolean;
    }>(
      `INSERT INTO users (name, email, password_hash, role, last_login_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, name, email, role, is_active`,
      [name.trim(), normalizedEmail, passwordHash, userRole]
    );

    const row = inserted.rows[0];
    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
    };

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    await logAudit({
      req,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

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
      is_active: boolean;
      password_hash: string;
    }>(
      'SELECT id, name, email, role, is_active, password_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const row = result.rows[0];
    if (!row.is_active) {
      res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Contact your HR administrator.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, row.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [row.id]);

    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
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

export async function updateMyAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name } = req.body as { name: string };
    const updated = await query<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
      is_active: boolean;
    }>(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, role, is_active',
      [name.trim(), req.user!.id]
    );
    const row = updated.rows[0];
    res.json({
      success: true,
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
      },
    });
  } catch (err) {
    next(err);
  }
}
