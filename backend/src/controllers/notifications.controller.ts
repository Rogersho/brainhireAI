import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { formatRelativeTime, isValidUuid } from '../utils/helpers.js';

interface NotificationRow {
  id: string;
  user_id: string;
  icon: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'default';
  read: boolean;
  link: string | null;
  created_at: Date;
}

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    let result = await query<NotificationRow>(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [user.id]
    );

    if (result.rows.length === 0) {
      const welcomeDesc =
        user.role === 'Recruiter'
          ? 'Start by posting a job or reviewing applicants.'
          : 'Start by uploading your CV or browsing open roles.';
      const roleLabel = user.role === 'Recruiter' ? 'recruiter' : 'candidate';

      await query(
        `INSERT INTO notifications (user_id, icon, title, description, type, read)
         VALUES
           ($1, 'Brain', 'Welcome to Brainhire AI', $2, 'info', FALSE),
           ($1, 'CheckCircle', 'Account Verified', $3, 'success', TRUE)`,
        [user.id, welcomeDesc, `Your ${roleLabel} account has been successfully verified.`]
      );

      result = await query<NotificationRow>(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
        [user.id]
      );
    }

    const formatted = result.rows.map((n) => ({
      id: n.id,
      icon: n.icon,
      title: n.title,
      description: n.description,
      time: formatRelativeTime(new Date(n.created_at)),
      type: n.type,
      read: n.read,
      link: n.link,
    }));

    res.json({
      success: true,
      data: formatted,
      unreadCount: result.rows.filter((n) => !n.read).length,
    });
  } catch (err) {
    next(err);
  }
}

export async function createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { icon, title, description, type, link } = req.body as {
      icon?: string;
      title: string;
      description: string;
      type?: 'info' | 'success' | 'warning' | 'default';
      link?: string;
    };

    const inserted = await query<NotificationRow>(
      `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6)
       RETURNING *`,
      [req.user!.id, icon || 'Bell', title, description, type || 'default', link || null]
    );

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function updateNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid notification ID' });
      return;
    }

    const { read } = req.body as { read: boolean };

    // Strict ownership enforcement in SQL WHERE clause
    const updated = await query<NotificationRow>(
      `UPDATE notifications
       SET read = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [read, id, req.user!.id]
    );

    if (updated.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid notification ID' });
      return;
    }

    const deleted = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.id]
    );

    if (deleted.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
}
