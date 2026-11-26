import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';

export type UserRole = 'Admin' | 'HRManager' | 'HiringManager' | 'Employee' | 'Candidate';

export const HR_ROLES: UserRole[] = ['Admin', 'HRManager'];
export const HIRING_ROLES: UserRole[] = ['Admin', 'HRManager', 'HiringManager'];
export const INTERNAL_ROLES: UserRole[] = ['Admin', 'HRManager', 'HiringManager', 'Employee'];

export function isHrRole(role?: string | null): boolean {
  return role === 'Admin' || role === 'HRManager';
}

export function isHiringRole(role?: string | null): boolean {
  return role === 'Admin' || role === 'HRManager' || role === 'HiringManager';
}

export function isInternalRole(role?: string | null): boolean {
  return role === 'Admin' || role === 'HRManager' || role === 'HiringManager' || role === 'Employee';
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const AUTH_COOKIE_NAME = 'brainhire_token';

interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
  name: string;
}

export function signAuthToken(user: Pick<AuthUser, 'id' | 'name' | 'email' | 'role'>): string {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
  });
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies && typeof req.cookies[AUTH_COOKIE_NAME] === 'string') {
    return req.cookies[AUTH_COOKIE_NAME];
  }
  return null;
}

async function resolveUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    if (!decoded?.sub) return null;

    // Verify user still exists and is active in PostgreSQL
    const result = await query<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
      is_active: boolean;
    }>('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [decoded.sub]);

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!row.is_active) return null;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
    };
  } catch {
    return null;
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const user = await resolveUserFromToken(token);
  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid, expired, or deactivated account token' });
    return;
  }

  req.user = user;
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (token) {
    const user = await resolveUserFromToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: requires ${roles.join(' or ')} role`,
      });
      return;
    }
    next();
  };
}
