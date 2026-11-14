import { Router } from 'express';
import { DbInstance } from '../db/database';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { mapEvent } from '../db/mappers';
import { newId } from '../utils/crypto';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';

export function createEventsRouter(db: DbInstance): Router {
  const router = Router();

  router.get('/', (req: AuthedRequest, res) => {
    const isStaff =
      req.user &&
      ['admin', 'moderator', 'verification_officer'].includes(req.user.activeRole);

    const rows = db.prepare('SELECT * FROM events ORDER BY event_date ASC').all() as any[];
    const visible = rows
      .filter((e) => isStaff || e.status === 'published' || (req.user && e.creator_user_id === req.user.id))
      .map(mapEvent);

    return res.json({ events: visible });
  });

  router.post('/', requireAuth, (req: AuthedRequest, res) => {
    const {
      title,
      discipline = 'Müzik',
      category = 'Müzik & Konser',
      organizerName,
      organizerContact,
      venueName,
      city,
      district = '',
      eventDate,
      startTime = '20:00',
      endTime,
      genres = ['Klasik Müzik'],
      performers = '',
      ticketPrice = 0,
      isFree = false,
      ticketUrl,
      description,
      posterUrl,
      accessibilitySummary = [],
    } = req.body || {};

    if (!title || !venueName || !city || !eventDate || !description) {
      return res.status(400).json({ error: 'Etkinlik başlığı, mekân, şehir, tarih ve açıklama zorunludur.' });
    }

    const id = newId('evt');
    const now = new Date().toISOString();
    const isPrivileged = ['admin', 'moderator'].includes(req.user!.activeRole);
    const status = isPrivileged ? 'published' : 'pending_moderation';

    db.prepare(`
      INSERT INTO events (
        id, creator_user_id, title, discipline, category, organizer_name, organizer_contact,
        venue_name, city, district, event_date, start_time, end_time, genres_json,
        performers, ticket_price, is_free, ticket_url, description, poster_url, status,
        accessibility_summary_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.user!.id,
      String(title).trim(),
      discipline,
      category,
      organizerName || `${req.user!.firstName} ${req.user!.lastName}`.trim(),
      organizerContact || req.user!.email,
      String(venueName).trim(),
      String(city).trim(),
      district,
      eventDate,
      startTime,
      endTime || null,
      JSON.stringify(Array.isArray(genres) ? genres : []),
      performers,
      isFree ? 0 : Number(ticketPrice || 0),
      isFree ? 1 : 0,
      ticketUrl || null,
      String(description).trim(),
      posterUrl || '/src/assets/images/venue_cultural_foundation_1794582678466.jpg',
      status,
      JSON.stringify(Array.isArray(accessibilitySummary) ? accessibilitySummary : []),
      now
    );

    if (status === 'pending_moderation') {
      notifyUser(db, {
        userId: 'user_admin',
        type: 'moderation_needed',
        title: 'Yeni Etkinlik Onayı Bekliyor',
        body: `"${title}" etkinliği moderasyon kuyruğuna eklendi.`,
        linkView: 'admin_panel',
      });
    }

    logAudit(db, {
      userId: req.user!.id,
      action: 'CREATE_EVENT',
      resourceType: 'event',
      resourceId: id,
      details: { status },
    });

    const created = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    return res.status(201).json({ event: mapEvent(created) });
  });

  router.patch('/:id', requireAuth, (req: AuthedRequest, res) => {
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Etkinlik bulunamadı.' });

    const isStaff = ['admin', 'moderator'].includes(req.user!.activeRole);
    if (row.creator_user_id !== req.user!.id && !isStaff) {
      return res.status(403).json({ error: 'Bu etkinliği düzenleme yetkiniz yok.' });
    }

    const {
      title,
      discipline,
      category,
      organizerName,
      organizerContact,
      venueName,
      city,
      district,
      eventDate,
      startTime,
      endTime,
      genres,
      performers,
      ticketPrice,
      isFree,
      ticketUrl,
      description,
      posterUrl,
      accessibilitySummary,
    } = req.body || {};

    db.prepare(`
      UPDATE events SET
        title = COALESCE(?, title),
        discipline = COALESCE(?, discipline),
        category = COALESCE(?, category),
        organizer_name = COALESCE(?, organizer_name),
        organizer_contact = COALESCE(?, organizer_contact),
        venue_name = COALESCE(?, venue_name),
        city = COALESCE(?, city),
        district = COALESCE(?, district),
        event_date = COALESCE(?, event_date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        genres_json = COALESCE(?, genres_json),
        performers = COALESCE(?, performers),
        ticket_price = COALESCE(?, ticket_price),
        is_free = COALESCE(?, is_free),
        ticket_url = COALESCE(?, ticket_url),
        description = COALESCE(?, description),
        poster_url = COALESCE(?, poster_url),
        accessibility_summary_json = COALESCE(?, accessibility_summary_json)
      WHERE id = ?
    `).run(
      title !== undefined ? String(title).trim() : null,
      discipline ?? null,
      category ?? null,
      organizerName ?? null,
      organizerContact ?? null,
      venueName ?? null,
      city ?? null,
      district ?? null,
      eventDate ?? null,
      startTime ?? null,
      endTime ?? null,
      genres !== undefined ? JSON.stringify(Array.isArray(genres) ? genres : []) : null,
      performers ?? null,
      isFree === true ? 0 : ticketPrice !== undefined ? Number(ticketPrice) : null,
      isFree !== undefined ? (isFree ? 1 : 0) : null,
      ticketUrl ?? null,
      description !== undefined ? String(description).trim() : null,
      posterUrl ?? null,
      accessibilitySummary !== undefined ? JSON.stringify(Array.isArray(accessibilitySummary) ? accessibilitySummary : []) : null,
      row.id
    );

    logAudit(db, { userId: req.user!.id, action: 'UPDATE_EVENT', resourceType: 'event', resourceId: row.id });
    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(row.id);
    return res.json({ event: mapEvent(updated) });
  });

  router.delete('/:id', requireAuth, (req: AuthedRequest, res) => {
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Etkinlik bulunamadı.' });

    const isStaff = ['admin', 'moderator'].includes(req.user!.activeRole);
    if (row.creator_user_id !== req.user!.id && !isStaff) {
      return res.status(403).json({ error: 'Bu etkinliği silme yetkiniz yok.' });
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(row.id);
    logAudit(db, { userId: req.user!.id, action: 'DELETE_EVENT', resourceType: 'event', resourceId: row.id });
    return res.json({ success: true });
  });

  // 9.9 Calendar .ics export
  router.get('/:id/ics', (req, res) => {
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Etkinlik bulunamadı.' });

    const dateClean = String(row.event_date).replace(/-/g, '');
    const startClean = `${String(row.start_time || '20:00').replace(':', '')}00`;
    const endClean = `${String(row.end_time || '22:00').replace(':', '')}00`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SanatSahnede//Kultur Takvimi//TR',
      'BEGIN:VEVENT',
      `UID:${row.id}@sanatsahnede.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${dateClean}T${startClean}`,
      `DTEND:${dateClean}T${endClean}`,
      `SUMMARY:${String(row.title).replace(/\n/g, ' ')}`,
      `LOCATION:${row.venue_name}, ${row.city}`,
      `DESCRIPTION:${String(row.description).replace(/\n/g, ' ')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sanatsahnede-${row.id}.ics"`);
    return res.send(ics);
  });

  return router;
}
