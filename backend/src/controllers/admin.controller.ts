import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { UserRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.service.js';

export async function getAdminUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const roleFilter = typeof req.query.role === 'string' ? req.query.role : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (roleFilter && roleFilter !== 'all') {
      params.push(roleFilter);
      conditions.push(`u.role = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login_at, u.created_at,
              e.id AS employee_id, e.employee_code
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        isActive: r.is_active,
        lastLoginAt: r.last_login_at,
        createdAt: r.created_at,
        employeeId: r.employee_id || null,
        employeeCode: r.employee_code || null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid user ID' });
      return;
    }

    const { role, isActive } = req.body as { role?: UserRole; isActive?: boolean };

    if (id === req.user!.id) {
      if (isActive === false) {
        res.status(400).json({ success: false, error: 'You cannot deactivate your own account' });
        return;
      }
      if (role && role !== 'Admin') {
        res.status(400).json({ success: false, error: 'You cannot remove your own Admin role' });
        return;
      }
    }

    const existing = await query<{ id: string; name: string; email: string; role: string; is_active: boolean }>(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const updated = await query(
      `UPDATE users
       SET role = COALESCE($1, role),
           is_active = COALESCE($2, is_active)
       WHERE id = $3
       RETURNING id, name, email, role, is_active, last_login_at, created_at`,
      [role ?? null, isActive ?? null, id]
    );

    const row = updated.rows[0];
    await logAudit({
      req,
      action: 'USER_ACCESS_UPDATED',
      entityType: 'user',
      entityId: id,
      metadata: {
        email: row.email,
        previousRole: existing.rows[0].role,
        newRole: row.role,
        isActive: row.is_active,
      },
    });

    res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 50));
    const entityType = typeof req.query.entityType === 'string' ? req.query.entityType : undefined;

    const params: unknown[] = [];
    let where = '';
    if (entityType && entityType !== 'all') {
      params.push(entityType);
      where = `WHERE entity_type = $${params.length}`;
    }
    params.push(limit);

    const result = await query(
      `SELECT id, actor_id, actor_name, actor_role, action, entity_type, entity_id, metadata, ip_address, created_at
       FROM audit_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        actorId: r.actor_id,
        actorName: r.actor_name,
        actorRole: r.actor_role,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        metadata: r.metadata,
        ipAddress: r.ip_address,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}
