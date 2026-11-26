import { Request } from 'express';
import { query } from '../db/pool.js';

export interface AuditInput {
  req?: Request;
  actorId?: string | null;
  actorName?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const actorId = input.actorId ?? input.req?.user?.id ?? null;
    const actorName = input.actorName ?? input.req?.user?.name ?? 'System';
    const actorRole = input.actorRole ?? input.req?.user?.role ?? 'System';
    const ipAddress =
      (input.req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      input.req?.ip ||
      null;

    await query(
      `INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, entity_type, entity_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        actorId,
        actorName,
        actorRole,
        input.action,
        input.entityType,
        input.entityId ?? null,
        JSON.stringify(input.metadata ?? {}),
        ipAddress,
      ]
    );
  } catch (err) {
    console.warn('[Audit] Failed to record audit entry:', (err as Error).message);
  }
}
