import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { isValidUuid } from '../utils/helpers.js';
import { isHrRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.service.js';

export async function getOffers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const params: unknown[] = [];
    let where = '';

    if (!isHrRole(user.role)) {
      params.push(user.id);
      where = `WHERE a.user_id = $1 AND o.status != 'Draft'`;
    }

    const result = await query(
      `SELECT o.*,
              a.name AS applicant_name,
              a.user_id AS applicant_user_id,
              j.title AS job_title,
              j.department AS job_department,
              u.name AS created_by_name
       FROM job_offers o
       JOIN applicants a ON a.id = o.applicant_id
       JOIN jobs j ON j.id = o.job_id
       LEFT JOIN users u ON u.id = o.created_by
       ${where}
       ORDER BY o.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        id: r.id,
        applicantId: r.applicant_id,
        applicantName: r.applicant_name,
        jobId: r.job_id,
        jobTitle: r.job_title,
        jobDepartment: r.job_department,
        proposedSalary: Number(r.proposed_salary),
        currency: r.currency,
        startDate: r.start_date,
        employmentType: r.employment_type,
        benefitsSummary: r.benefits_summary,
        customTerms: r.custom_terms,
        offerLetterText: r.offer_letter_text,
        status: r.status,
        sentAt: r.sent_at,
        respondedAt: r.responded_at,
        expiresAt: r.expires_at,
        createdByName: r.created_by_name || null,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createOffer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      applicantId,
      proposedSalary,
      currency,
      startDate,
      employmentType,
      benefitsSummary,
      customTerms,
      offerLetterText,
      expiresAt,
      sendImmediately,
    } = req.body;

    const appRes = await query<{ id: string; job_id: string; user_id: string | null; name: string; job_title: string }>(
      `SELECT a.id, a.job_id, a.user_id, a.name, j.title AS job_title
       FROM applicants a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1`,
      [applicantId]
    );

    if (appRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Applicant not found' });
      return;
    }

    const app = appRes.rows[0];
    const status = sendImmediately ? 'Sent' : 'Draft';
    const sentAt = sendImmediately ? new Date() : null;

    const inserted = await query(
      `INSERT INTO job_offers
         (applicant_id, job_id, created_by, proposed_salary, currency, start_date, employment_type,
          benefits_summary, custom_terms, offer_letter_text, status, sent_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        applicantId,
        app.job_id,
        req.user!.id,
        proposedSalary,
        currency || 'USD',
        startDate,
        employmentType || 'Full-Time',
        benefitsSummary || '',
        customTerms || '',
        offerLetterText || '',
        status,
        sentAt,
        expiresAt || null,
      ]
    );

    if (sendImmediately) {
      await query(`UPDATE applicants SET status = 'Offer', pipeline_stage = 'Offer' WHERE id = $1`, [
        applicantId,
      ]);
      if (app.user_id) {
        await query(
          `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
           VALUES ($1, 'CheckCircle', 'You Have a Job Offer!', $2, 'success', FALSE, '/candidate-dashboard/applications')`,
          [app.user_id, `Hoobe HR sent you an official job offer for ${app.job_title}.`]
        );
      }
    }

    await logAudit({
      req,
      action: sendImmediately ? 'JOB_OFFER_SENT' : 'JOB_OFFER_CREATED',
      entityType: 'job_offer',
      entityId: inserted.rows[0].id,
      metadata: { applicantId, proposedSalary, currency },
    });

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function sendOffer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid offer ID' });
      return;
    }

    const offerRes = await query<{
      id: string;
      applicant_id: string;
      status: string;
      user_id: string | null;
      job_title: string;
    }>(
      `SELECT o.id, o.applicant_id, o.status, a.user_id, j.title AS job_title
       FROM job_offers o
       JOIN applicants a ON a.id = o.applicant_id
       JOIN jobs j ON j.id = o.job_id
       WHERE o.id = $1`,
      [id]
    );

    if (offerRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Offer not found' });
      return;
    }

    const offer = offerRes.rows[0];
    await query(`UPDATE job_offers SET status = 'Sent', sent_at = NOW() WHERE id = $1`, [id]);
    await query(`UPDATE applicants SET status = 'Offer', pipeline_stage = 'Offer' WHERE id = $1`, [
      offer.applicant_id,
    ]);

    if (offer.user_id) {
      await query(
        `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
         VALUES ($1, 'CheckCircle', 'You Have a Job Offer!', $2, 'success', FALSE, '/candidate-dashboard/applications')`,
        [offer.user_id, `You have received an offer for ${offer.job_title}. Review and respond now.`]
      );
    }

    await logAudit({ req, action: 'JOB_OFFER_SENT', entityType: 'job_offer', entityId: id });
    res.json({ success: true, message: 'Offer sent to candidate' });
  } catch (err) {
    next(err);
  }
}

export async function respondToOffer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid offer ID' });
      return;
    }

    const { decision } = req.body as { decision: 'Accepted' | 'Declined' };

    const offerRes = await query<{
      id: string;
      applicant_id: string;
      status: string;
      created_by: string | null;
      applicant_user_id: string | null;
      applicant_name: string;
      job_title: string;
    }>(
      `SELECT o.id, o.applicant_id, o.status, o.created_by, a.user_id AS applicant_user_id,
              a.name AS applicant_name, j.title AS job_title
       FROM job_offers o
       JOIN applicants a ON a.id = o.applicant_id
       JOIN jobs j ON j.id = o.job_id
       WHERE o.id = $1`,
      [id]
    );

    if (offerRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Offer not found' });
      return;
    }

    const offer = offerRes.rows[0];
    if (offer.applicant_user_id !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Forbidden: only the offered candidate can respond' });
      return;
    }

    if (offer.status !== 'Sent') {
      res.status(400).json({ success: false, error: 'This offer is no longer open for response' });
      return;
    }

    await query(
      `UPDATE job_offers SET status = $1, responded_at = NOW() WHERE id = $2`,
      [decision, id]
    );

    if (decision === 'Accepted') {
      await query(
        `UPDATE applicants SET status = 'Hired', pipeline_stage = 'Hired' WHERE id = $1`,
        [offer.applicant_id]
      );
    }

    if (offer.created_by) {
      await query(
        `INSERT INTO notifications (user_id, icon, title, description, type, read, link)
         VALUES ($1, $2, $3, $4, $5, FALSE, '/applicants/' || $6)`,
        [
          offer.created_by,
          decision === 'Accepted' ? 'CheckCircle' : 'AlertCircle',
          `Offer ${decision}`,
          `${offer.applicant_name} has ${decision.toLowerCase()} the offer for ${offer.job_title}.`,
          decision === 'Accepted' ? 'success' : 'warning',
          offer.applicant_id,
        ]
      );
    }

    await logAudit({
      req,
      action: decision === 'Accepted' ? 'JOB_OFFER_ACCEPTED' : 'JOB_OFFER_DECLINED',
      entityType: 'job_offer',
      entityId: id,
    });

    res.json({ success: true, message: `Offer ${decision.toLowerCase()} successfully.` });
  } catch (err) {
    next(err);
  }
}

export async function deleteOffer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ success: false, error: 'Invalid offer ID' });
      return;
    }
    const del = await query('DELETE FROM job_offers WHERE id = $1 RETURNING id', [id]);
    if (del.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Offer not found' });
      return;
    }
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}
