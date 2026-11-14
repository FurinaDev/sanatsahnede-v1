import { Router } from 'express';
import { DbInstance } from '../db/database';
import { AuthedRequest, requireAuth, requireFeatureFlag, requireRole } from '../middleware/auth';
import { mapAvailabilitySlot, mapVenue } from '../db/mappers';
import { newId, slugify } from '../utils/crypto';
import { hasTimeConflict } from '../../src/utils/businessLogic';
import { logAudit } from '../services/auditService';

export function createVenuesRouter(db: DbInstance): Router {
  const router = Router();

  router.get('/venues', (_req, res) => {
    const rows = db.prepare('SELECT * FROM venues ORDER BY created_at DESC').all() as any[];
    return res.json({ venues: rows.map((r) => mapVenue(db, r)) });
  });

  router.post('/venues', requireAuth, requireFeatureFlag(db, 'open_stage_network'), (req: AuthedRequest, res) => {
    const {
      name,
      city,
      district = '',
      address = '',
      description = '',
      contactPhone = '',
      contactEmail = '',
      spaces = [],
      accessibility,
    } = req.body || {};

    if (!name || !city) {
      return res.status(400).json({ error: 'Mekân adı ve şehir zorunludur.' });
    }

    const id = newId('venue');
    const slug = `${slugify(name)}-${id.slice(-4)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO venues (
        id, manager_user_id, name, slug, city, district, address, description,
        contact_phone, contact_email, is_verified, accessibility_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.user!.id, String(name).trim(), slug, city, district, address, description,
      contactPhone, contactEmail || req.user!.email, req.user!.isVerified ? 1 : 0,
      JSON.stringify(
        accessibility || {
          wheelchairAccess: false, stepFreeEntrance: false, accessibleRestroom: false,
          elevatorOrRamp: false, signLanguageInterpretation: false, liveCaptions: false,
          audioDescription: false, brailleProgram: false, hearingLoop: false,
          companionSupport: false, accessibleSeating: false, sensoryFriendly: false,
          accessibleTransitInfo: '',
        }
      ),
      now
    );

    if (Array.isArray(spaces)) {
      for (const s of spaces) {
        if (!s?.name) continue;
        db.prepare(`
          INSERT INTO venue_spaces (id, venue_id, name, seated_capacity, standing_capacity, stage_dimensions, technical_equipment_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          newId('space'), id, s.name, Number(s.seatedCapacity || 0),
          Number(s.standingCapacity || 0), s.stageDimensions || '',
          JSON.stringify(Array.isArray(s.technicalEquipment) ? s.technicalEquipment : [])
        );
      }
    }

    const created = db.prepare('SELECT * FROM venues WHERE id = ?').get(id);
    return res.status(201).json({ venue: mapVenue(db, created) });
  });

  router.patch('/venues/:id', requireAuth, requireFeatureFlag(db, 'open_stage_network'), (req: AuthedRequest, res) => {
    const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id) as any;
    if (!venue) return res.status(404).json({ error: 'Mekân bulunamadı.' });
    if (venue.manager_user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Bu mekânı düzenleme yetkiniz yok.' });
    }

    const { name, city, district, address, description, contactPhone, contactEmail } = req.body || {};
    db.prepare(`
      UPDATE venues SET
        name = COALESCE(?, name),
        city = COALESCE(?, city),
        district = COALESCE(?, district),
        address = COALESCE(?, address),
        description = COALESCE(?, description),
        contact_phone = COALESCE(?, contact_phone),
        contact_email = COALESCE(?, contact_email)
      WHERE id = ?
    `).run(
      name !== undefined ? String(name).trim() : null,
      city ?? null,
      district ?? null,
      address ?? null,
      description ?? null,
      contactPhone ?? null,
      contactEmail ?? null,
      venue.id
    );

    const updated = db.prepare('SELECT * FROM venues WHERE id = ?').get(venue.id);
    return res.json({ venue: mapVenue(db, updated) });
  });

  router.post('/venues/:id/spaces', requireAuth, requireFeatureFlag(db, 'open_stage_network'), (req: AuthedRequest, res) => {
    const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id) as any;
    if (!venue) return res.status(404).json({ error: 'Mekân bulunamadı.' });
    if (venue.manager_user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Bu mekâna salon ekleme yetkiniz yok.' });
    }

    const { name, seatedCapacity = 0, standingCapacity = 0, stageDimensions = '', technicalEquipment = [] } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Salon adı zorunludur.' });
    }

    db.prepare(`
      INSERT INTO venue_spaces (id, venue_id, name, seated_capacity, standing_capacity, stage_dimensions, technical_equipment_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId('space'),
      venue.id,
      String(name).trim(),
      Number(seatedCapacity || 0),
      Number(standingCapacity || 0),
      stageDimensions,
      JSON.stringify(Array.isArray(technicalEquipment) ? technicalEquipment : [])
    );

    const updated = db.prepare('SELECT * FROM venues WHERE id = ?').get(venue.id);
    return res.status(201).json({ venue: mapVenue(db, updated) });
  });

  router.delete('/venues/:id/spaces/:spaceId', requireAuth, (req: AuthedRequest, res) => {
    const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id) as any;
    if (!venue) return res.status(404).json({ error: 'Mekân bulunamadı.' });
    if (venue.manager_user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Bu salonu silme yetkiniz yok.' });
    }

    db.prepare('DELETE FROM venue_spaces WHERE id = ? AND venue_id = ?').run(req.params.spaceId, venue.id);
    const updated = db.prepare('SELECT * FROM venues WHERE id = ?').get(venue.id);
    return res.json({ venue: mapVenue(db, updated) });
  });

  // Update Accessibility Spec (owner or staff)
  router.put('/venues/:id/accessibility', requireAuth, requireFeatureFlag(db, 'accessible_arts'), (req: AuthedRequest, res) => {
    const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id) as any;
    if (!venue) return res.status(404).json({ error: 'Mekân bulunamadı.' });

    const isStaff = ['admin', 'verification_officer', 'moderator'].includes(req.user!.activeRole);
    if (venue.manager_user_id !== req.user!.id && !isStaff) {
      return res.status(403).json({ error: 'Erişilebilirlik bilgisini güncelleme yetkiniz yok.' });
    }

    const nextAcc = {
      ...(JSON.parse(venue.accessibility_json || '{}')),
      ...(req.body || {}),
    };
    db.prepare('UPDATE venues SET accessibility_json = ? WHERE id = ?').run(JSON.stringify(nextAcc), venue.id);
    const updated = db.prepare('SELECT * FROM venues WHERE id = ?').get(venue.id);
    return res.json({ venue: mapVenue(db, updated) });
  });

  // Official Accessibility Verification (Verifier / Admin only)
  router.post(
    '/venues/:id/accessibility/verify',
    requireAuth,
    requireRole('admin', 'verification_officer', 'moderator'),
    (req: AuthedRequest, res) => {
      const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id) as any;
      if (!venue) return res.status(404).json({ error: 'Mekân bulunamadı.' });

      const acc = JSON.parse(venue.accessibility_json || '{}');
      acc.verifiedBy = `${req.user!.firstName} ${req.user!.lastName}`.trim() + ' (Doğrulama Uzmanı)';
      acc.verifiedAt = new Date().toISOString();

      db.prepare('UPDATE venues SET accessibility_json = ? WHERE id = ?').run(JSON.stringify(acc), venue.id);
      logAudit(db, {
        userId: req.user!.id,
        action: 'VERIFY_VENUE_ACCESSIBILITY',
        resourceType: 'venue',
        resourceId: venue.id,
      });
      const updated = db.prepare('SELECT * FROM venues WHERE id = ?').get(venue.id);
      return res.json({ venue: mapVenue(db, updated) });
    }
  );

  // Availability Slots (with strict 409 Conflict Lock!)
  router.get('/availability', (_req, res) => {
    const rows = db.prepare('SELECT * FROM availability_slots ORDER BY slot_date ASC, start_time ASC').all() as any[];
    return res.json({ slots: rows.map(mapAvailabilitySlot) });
  });

  router.post('/availability', requireAuth, requireFeatureFlag(db, 'open_stage_network'), (req: AuthedRequest, res) => {
    const {
      ownerType = 'venue',
      ownerId,
      ownerName,
      title,
      slotDate,
      startTime,
      endTime,
      recurrence = 'once',
      slotKind = 'available',
      isFree = false,
      feeAmount = 0,
      city = 'İstanbul',
      notes = '',
    } = req.body || {};

    if (!ownerId || !title || !slotDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'Sahip, başlık, tarih, başlangıç ve bitiş saati zorunludur.' });
    }

    // Ownership verification
    const isAdmin = req.user!.activeRole === 'admin';
    if (!isAdmin) {
      let authorized = false;
      if (ownerType === 'venue') {
        const v = db.prepare('SELECT manager_user_id FROM venues WHERE id = ?').get(ownerId) as any;
        authorized = v?.manager_user_id === req.user!.id;
      } else if (ownerType === 'artist') {
        const a = db.prepare('SELECT user_id FROM individual_profiles WHERE id = ?').get(ownerId) as any;
        authorized = a?.user_id === req.user!.id;
      } else if (ownerType === 'ensemble') {
        const e = db.prepare('SELECT leader_user_id FROM ensembles WHERE id = ?').get(ownerId) as any;
        authorized = e?.leader_user_id === req.user!.id;
      } else if (ownerType === 'technical_provider') {
        const t = db.prepare('SELECT user_id FROM technical_providers WHERE id = ?').get(ownerId) as any;
        authorized = t?.user_id === req.user!.id;
      }
      if (!authorized) {
        return res.status(403).json({ error: 'Yalnızca kendi profiliniz veya mekânınız için takvim kaydı ekleyebilirsiniz.' });
      }
    }

    // Overlap / Conflict Detection
    const existingSlots = db
      .prepare('SELECT * FROM availability_slots WHERE owner_id = ? AND slot_date = ?')
      .all(ownerId, slotDate) as any[];

    const conflicting = existingSlots.find((s) =>
      hasTimeConflict(
        { date: slotDate, startTime, endTime },
        { date: s.slot_date, startTime: s.start_time, endTime: s.end_time }
      )
    );

    if (conflicting) {
      return res.status(409).json({
        error: `Takvim çakışması: ${slotDate} tarihinde ${conflicting.start_time}-${conflicting.end_time} arası "${conflicting.title}" kaydı zaten mevcut.`,
      });
    }

    const id = newId('slot');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO availability_slots (
        id, owner_type, owner_id, owner_user_id, owner_name, title, slot_date,
        start_time, end_time, recurrence, slot_kind, is_free, fee_amount, city, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, ownerType, ownerId, req.user!.id,
      ownerName || `${req.user!.firstName} ${req.user!.lastName}`.trim(),
      String(title).trim(), slotDate, startTime, endTime, recurrence,
      slotKind, isFree ? 1 : 0, isFree ? 0 : Number(feeAmount || 0), city, notes, now
    );

    const created = db.prepare('SELECT * FROM availability_slots WHERE id = ?').get(id);
    return res.status(201).json({ slot: mapAvailabilitySlot(created) });
  });

  router.delete('/availability/:id', requireAuth, (req: AuthedRequest, res) => {
    const slot = db.prepare('SELECT * FROM availability_slots WHERE id = ?').get(req.params.id) as any;
    if (!slot) return res.status(404).json({ error: 'Takvim kaydı bulunamadı.' });
    if (slot.owner_user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Yetkisiz işlem.' });
    }
    db.prepare('DELETE FROM availability_slots WHERE id = ?').run(slot.id);
    return res.json({ success: true });
  });

  return router;
}
