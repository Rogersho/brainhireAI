import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole } from '../middleware/auth.js';

async function nextTicketNumber(): Promise<string> {
  const res = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM hr_tickets');
  const num = Number(res.rows[0]?.count || 0) + 1001;
  const candidate = `HR-${num}`;
  const dup = await query('SELECT 1 FROM hr_tickets WHERE ticket_number = $1', [candidate]);
  if (dup.rows.length === 0) return candidate;
  return `HR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function getTickets(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const params: unknown[] = [];
    let where = '';

    if (!isHrRole(user.role)) {
      const empRes = await query<{ id: string }>('SELECT id FROM employees WHERE user_id = $1 LIMIT 1', [
        user.id,
      ]);
      if (empRes.rows.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }
      params.push(empRes.rows[0].id);
      where = 'WHERE t.employee_id = $1';
    }

    const result = await query(
      `SELECT t.*, e.first_name, e.last_name, e.employee_code, u.name AS assigned_to_name,
              (SELECT COUNT(*)::int FROM hr_ticket_messages m WHERE m.ticket_id = t.id AND ($2::boolean OR m.is_internal_note = FALSE)) AS message_count
       FROM hr_tickets t
       JOIN employees e ON e.id = t.employee_id
       LEFT JOIN users u ON u.id = t.assigned_to
       ${where}
       ORDER BY t.created_at DESC
       LIMIT 100`,
      where ? [...params, isHrRole(user.role)] : [isHrRole(user.role)]
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        ticketNumber: r.ticket_number,
        employeeId: r.employee_id,
        employeeCode: r.employee_code,
        employeeName: `${r.first_name} ${r.last_name}`.trim(),
        category: r.category,
        priority: r.priority,
        subject: r.subject,
        description: r.description,
        status: r.status,
        assignedToName: r.assigned_to_name || null,
        messageCount: r.message_count || 0,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empRes = await query<{ id: string }>('SELECT id FROM employees WHERE user_id = $1 LIMIT 1', [
      req.user!.id,
    ]);
    if (empRes.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: 'An employee profile is required to open HR helpdesk tickets.',
      });
      return;
    }

    const { category, priority, subject, description } = req.body;
    const ticketNumber = await nextTicketNumber();

    const inserted = await query(
      `INSERT INTO hr_tickets (ticket_number, employee_id, category, priority, subject, description, status)
       VALUES ($1,$2,$3,$4,$5,$6,'Open')
       RETURNING *`,
      [ticketNumber, empRes.rows[0].id, category || 'Other', priority || 'Medium', subject.trim(), description.trim()]
    );

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function updateTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid ticket ID' });
      return;
    }
    const { status, priority } = req.body;
    const resolvedAt = status === 'Resolved' || status === 'Closed' ? new Date() : null;

    await query(
      `UPDATE hr_tickets
       SET status = COALESCE($1, status),
           priority = COALESCE($2, priority),
           assigned_to = COALESCE(assigned_to, $3),
           resolved_at = COALESCE($4, resolved_at)
       WHERE id = $5`,
      [status ?? null, priority ?? null, req.user!.id, resolvedAt, id]
    );
    res.json({ success: true, message: 'Ticket updated.' });
  } catch (err) {
    next(err);
  }
}

export async function getTicketMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid ticket ID' });
      return;
    }

    const tRes = await query<{ user_id: string | null }>(
      `SELECT e.user_id FROM hr_tickets t JOIN employees e ON e.id = t.employee_id WHERE t.id = $1`,
      [id]
    );
    if (tRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }

    const hrAccess = isHrRole(req.user!.role);
    if (!hrAccess && tRes.rows[0].user_id !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const filterClause = hrAccess ? '' : 'AND m.is_internal_note = FALSE';
    const msgs = await query(
      `SELECT m.*, u.name AS sender_name, u.role AS sender_role
       FROM hr_ticket_messages m
       LEFT JOIN users u ON u.id = m.sender_id
       WHERE m.ticket_id = $1 ${filterClause}
       ORDER BY m.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: msgs.rows.map((m: any) => ({
        id: m.id,
        senderName: m.sender_name || 'User',
        senderRole: m.sender_role || '',
        body: m.body,
        isInternalNote: m.is_internal_note,
        createdAt: m.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function addTicketMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid ticket ID' });
      return;
    }

    const tRes = await query<{ user_id: string | null }>(
      `SELECT e.user_id FROM hr_tickets t JOIN employees e ON e.id = t.employee_id WHERE t.id = $1`,
      [id]
    );
    if (tRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }

    const hrAccess = isHrRole(req.user!.role);
    if (!hrAccess && tRes.rows[0].user_id !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const isInternal = hrAccess ? Boolean(req.body.isInternalNote) : false;
    const inserted = await query(
      `INSERT INTO hr_ticket_messages (ticket_id, sender_id, body, is_internal_note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.user!.id, req.body.body.trim(), isInternal]
    );

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}
