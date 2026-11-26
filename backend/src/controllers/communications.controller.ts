import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { logAudit } from '../services/audit.service.js';

export async function getAnnouncements(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query(
      `SELECT a.*, u.name AS author_name
       FROM announcements a
       LEFT JOIN users u ON u.id = a.author_id
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT 50`
    );
    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        category: r.category,
        isPinned: r.is_pinned,
        authorName: r.author_name || 'HR Team',
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, body, category, isPinned } = req.body;
    const inserted = await query(
      `INSERT INTO announcements (title, body, category, is_pinned, author_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [title.trim(), body.trim(), category || 'General', Boolean(isPinned), req.user!.id]
    );
    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid ID' });
      return;
    }
    await query('DELETE FROM announcements WHERE id = $1', [id]);
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}

export async function getPolicies(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empRes = await query<{ id: string }>('SELECT id FROM employees WHERE user_id = $1 LIMIT 1', [
      req.user!.id,
    ]);
    const myEmployeeId = empRes.rows[0]?.id || null;

    const totalActiveRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM employees WHERE status != 'Terminated'`
    );
    const totalActiveEmployees = Number(totalActiveRes.rows[0]?.count || 0);

    const result = await query(
      `SELECT cp.*, u.name AS published_by_name,
              (SELECT COUNT(*)::int FROM policy_acknowledgements pa WHERE pa.policy_id = cp.id) AS ack_count,
              EXISTS(
                SELECT 1 FROM policy_acknowledgements pa
                WHERE pa.policy_id = cp.id AND pa.employee_id = $1
              ) AS acknowledged_by_me
       FROM company_policies cp
       LEFT JOIN users u ON u.id = cp.published_by
       ORDER BY cp.published_at DESC`,
      [myEmployeeId]
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        version: r.version,
        category: r.category,
        contentMarkdown: r.content_markdown,
        requiresAcknowledgement: r.requires_acknowledgement,
        publishedByName: r.published_by_name || 'HR Team',
        publishedAt: r.published_at,
        ackCount: r.ack_count || 0,
        totalActiveEmployees,
        acknowledgedByMe: Boolean(r.acknowledged_by_me),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createPolicy(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, version, category, contentMarkdown, requiresAcknowledgement } = req.body;
    const inserted = await query(
      `INSERT INTO company_policies (title, version, category, content_markdown, requires_acknowledgement, published_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        title.trim(),
        version || '1.0',
        category || 'Handbook',
        contentMarkdown.trim(),
        requiresAcknowledgement !== false,
        req.user!.id,
      ]
    );

    await logAudit({
      req,
      action: 'POLICY_PUBLISHED',
      entityType: 'company_policy',
      entityId: inserted.rows[0].id,
      metadata: { title, version },
    });

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function acknowledgePolicy(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid policy ID' });
      return;
    }

    const empRes = await query<{ id: string }>('SELECT id FROM employees WHERE user_id = $1 LIMIT 1', [
      req.user!.id,
    ]);
    if (empRes.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: 'An employee profile is required to sign off on policies.',
      });
      return;
    }

    await query(
      `INSERT INTO policy_acknowledgements (policy_id, employee_id)
       VALUES ($1, $2)
       ON CONFLICT (policy_id, employee_id) DO NOTHING`,
      [id, empRes.rows[0].id]
    );

    res.json({ success: true, message: 'Policy acknowledged.' });
  } catch (err) {
    next(err);
  }
}

export async function deletePolicy(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid policy ID' });
      return;
    }
    await query('DELETE FROM company_policies WHERE id = $1', [id]);
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}
