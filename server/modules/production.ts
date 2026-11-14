import { Router } from 'express';
import { DbInstance, parseJson } from '../db/database';
import { AuthedRequest, requireAuth, requireFeatureFlag } from '../middleware/auth';
import {
  mapProductionWorkspace,
  mapTechnicalProvider,
  mapTechnicalQuote,
  mapTechnicalRequest,
} from '../db/mappers';
import { newId } from '../utils/crypto';
import { notifyUser } from '../services/notificationService';

function canAccessProductionContext(db: DbInstance, userId: string, activeRole: string, contextType: string, contextId: string): boolean {
  if (['admin', 'moderator'].includes(activeRole)) return true;

  if (contextType === 'booking') {
    const bk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(contextId) as any;
    if (!bk) return false;
    if (bk.performer_user_id === userId) return true;
    const biz = db.prepare('SELECT user_id FROM business_profiles WHERE id = ?').get(bk.business_id) as any;
    if (biz?.user_id === userId) return true;
    // Technical provider assigned via accepted quote also gets scoped access
    const techReq = db.prepare(`SELECT id FROM technical_requests WHERE context_type = 'booking' AND context_id = ?`).get(contextId) as any;
    if (techReq) {
      const acceptedQuote = db.prepare(`SELECT tq.id FROM technical_quotes tq JOIN technical_providers tp ON tp.id = tq.provider_id WHERE tq.request_id = ? AND tq.status = 'accepted' AND tp.user_id = ?`).get(techReq.id, userId);
      if (acceptedQuote) return true;
    }
    return false;
  }

  if (contextType === 'project') {
    const proj = db.prepare('SELECT * FROM projects WHERE id = ?').get(contextId) as any;
    if (!proj) return false;
    if (proj.owner_user_id === userId) return true;
    const members = parseJson<Array<{ userId: string }>>(proj.members_json, []);
    return members.some((m) => m.userId === userId);
  }

  return false;
}

export function createProductionRouter(db: DbInstance): Router {
  const router = Router();

  // 9.3 Production Desk (Participant-only access)
  router.get('/production/:contextType/:contextId', requireAuth, requireFeatureFlag(db, 'production_desk'), (req: AuthedRequest, res) => {
    const { contextType, contextId } = req.params;
    if (!canAccessProductionContext(db, req.user!.id, req.user!.activeRole, contextType, contextId)) {
      return res.status(403).json({ error: 'Bu prodüksiyon çalışma alanına erişim yetkiniz bulunmamaktadır.' });
    }

    let ws = db
      .prepare('SELECT * FROM production_workspaces WHERE context_type = ? AND context_id = ?')
      .get(contextType, contextId) as any;

    if (!ws) {
      const id = newId('prod');
      const now = new Date().toISOString();
      const bkRow =
        contextType === 'booking'
          ? (db.prepare('SELECT listing_title, event_date, venue_name FROM bookings WHERE id = ?').get(contextId) as any)
          : null;
      const projRow =
        contextType !== 'booking'
          ? (db.prepare('SELECT title, delivery_date, city FROM projects WHERE id = ?').get(contextId) as any)
          : null;
      const title =
        contextType === 'booking'
          ? (bkRow?.listing_title || 'Sahne Prodüksiyon Masası')
          : (projRow?.title || 'Proje Prodüksiyon Masası');
      const resolvedDate =
        contextType === 'booking'
          ? (bkRow?.event_date || now.slice(0, 10))
          : (projRow?.delivery_date || now.slice(0, 10));
      const resolvedVenue =
        contextType === 'booking'
          ? (bkRow?.venue_name || 'Belirlenen Sahne')
          : (projRow?.city ? `${projRow.city} (Proje Alanı)` : 'Proje Alanı');
      db.prepare(`
        INSERT INTO production_workspaces (
          id, context_type, context_id, title, event_date, venue_name,
          rider_json, stage_plot_json, schedule_json, tasks_json, logistics_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, contextType, contextId, title, resolvedDate, resolvedVenue,
        JSON.stringify({ stageSize: '6m x 4m', soundRequirements: '', lightRequirements: '', microphones: [], backline: [], monitors: '', ioPatchList: '', specialNotes: '' }),
        JSON.stringify([]), JSON.stringify([]), JSON.stringify([]),
        JSON.stringify({ travelSummary: '', accommodationSummary: '', transferNotes: '', arrivalTime: '' }),
        now
      );
      ws = db.prepare('SELECT * FROM production_workspaces WHERE id = ?').get(id);
    }

    return res.json({ workspace: mapProductionWorkspace(ws) });
  });

  router.put('/production/:contextType/:contextId', requireAuth, requireFeatureFlag(db, 'production_desk'), (req: AuthedRequest, res) => {
    const { contextType, contextId } = req.params;
    if (!canAccessProductionContext(db, req.user!.id, req.user!.activeRole, contextType, contextId)) {
      return res.status(403).json({ error: 'Bu prodüksiyon masasını düzenleme yetkiniz yok.' });
    }

    const existing = db
      .prepare('SELECT * FROM production_workspaces WHERE context_type = ? AND context_id = ?')
      .get(contextType, contextId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Prodüksiyon çalışma alanı bulunamadı.' });
    }

    const { rider, stagePlot, schedule, tasks, logistics } = req.body || {};
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE production_workspaces SET
        rider_json = COALESCE(?, rider_json),
        stage_plot_json = COALESCE(?, stage_plot_json),
        schedule_json = COALESCE(?, schedule_json),
        tasks_json = COALESCE(?, tasks_json),
        logistics_json = COALESCE(?, logistics_json),
        updated_at = ?
      WHERE id = ?
    `).run(
      rider ? JSON.stringify(rider) : null,
      stagePlot ? JSON.stringify(stagePlot) : null,
      schedule ? JSON.stringify(schedule) : null,
      tasks ? JSON.stringify(tasks) : null,
      logistics ? JSON.stringify(logistics) : null,
      now,
      existing.id
    );

    const updated = db.prepare('SELECT * FROM production_workspaces WHERE id = ?').get(existing.id);
    return res.json({ workspace: mapProductionWorkspace(updated) });
  });

  // 9.4 Technical Match — Provider Profile, Inventory & Packages
  router.patch('/technical-providers/me', requireAuth, requireFeatureFlag(db, 'technical_match'), (req: AuthedRequest, res) => {
    const tp = db.prepare('SELECT * FROM technical_providers WHERE user_id = ?').get(req.user!.id) as any;
    if (!tp) return res.status(404).json({ error: 'Teknik hizmet sağlayıcı profili bulunamadı.' });

    const { name, city, serviceAreas, categories, description, staffCapacity } = req.body || {};
    db.prepare(`
      UPDATE technical_providers SET
        name = COALESCE(?, name),
        city = COALESCE(?, city),
        service_areas_json = COALESCE(?, service_areas_json),
        categories_json = COALESCE(?, categories_json),
        description = COALESCE(?, description),
        staff_capacity = COALESCE(?, staff_capacity)
      WHERE id = ? AND user_id = ?
    `).run(
      name !== undefined ? String(name).trim() : null,
      city ?? null,
      serviceAreas !== undefined ? JSON.stringify(Array.isArray(serviceAreas) ? serviceAreas : []) : null,
      categories !== undefined ? JSON.stringify(Array.isArray(categories) ? categories : []) : null,
      description ?? null,
      staffCapacity !== undefined ? Number(staffCapacity) : null,
      tp.id,
      req.user!.id
    );

    const updated = db.prepare('SELECT * FROM technical_providers WHERE id = ?').get(tp.id);
    return res.json({ provider: mapTechnicalProvider(db, updated) });
  });

  router.post('/technical-providers/equipment', requireAuth, requireFeatureFlag(db, 'technical_match'), (req: AuthedRequest, res) => {
    const tp = db.prepare('SELECT * FROM technical_providers WHERE user_id = ?').get(req.user!.id) as any;
    if (!tp) return res.status(403).json({ error: 'Ekipman eklemek için teknik hizmet sağlayıcı profiliniz olmalıdır.' });

    const { category, name, brandModel = '', quantity = 1, dailyRate = 0, mode = 'rental' } = req.body || {};
    if (!category || !name) return res.status(400).json({ error: 'Kategori ve ekipman adı zorunludur.' });

    const id = newId('eq');
    db.prepare(`
      INSERT INTO equipment_inventory (id, provider_id, category, name, brand_model, quantity, daily_rate, mode, is_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, tp.id, category, name, brandModel, Number(quantity), Number(dailyRate), mode);

    const updated = db.prepare('SELECT * FROM technical_providers WHERE id = ?').get(tp.id);
    return res.status(201).json({ provider: mapTechnicalProvider(db, updated) });
  });

  router.delete('/technical-providers/equipment/:id', requireAuth, (req: AuthedRequest, res) => {
    const tp = db.prepare('SELECT * FROM technical_providers WHERE user_id = ?').get(req.user!.id) as any;
    if (!tp) return res.status(403).json({ error: 'Yetkisiz işlem.' });
    db.prepare('DELETE FROM equipment_inventory WHERE id = ? AND provider_id = ?').run(req.params.id, tp.id);
    const updated = db.prepare('SELECT * FROM technical_providers WHERE id = ?').get(tp.id);
    return res.json({ provider: mapTechnicalProvider(db, updated) });
  });

  router.post('/technical-providers/packages', requireAuth, requireFeatureFlag(db, 'technical_match'), (req: AuthedRequest, res) => {
    const tp = db.prepare('SELECT * FROM technical_providers WHERE user_id = ?').get(req.user!.id) as any;
    if (!tp) return res.status(403).json({ error: 'Teknik sağlayıcı profili bulunamadı.' });

    const { title, description = '', priceAmount = 0, includedItems = [] } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Paket adı zorunludur.' });

    db.prepare(`
      INSERT INTO service_packages (id, provider_id, title, description, price_amount, included_items_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      newId('pkg'),
      tp.id,
      title,
      description,
      Number(priceAmount),
      JSON.stringify(Array.isArray(includedItems) ? includedItems : [])
    );

    const updated = db.prepare('SELECT * FROM technical_providers WHERE id = ?').get(tp.id);
    return res.status(201).json({ provider: mapTechnicalProvider(db, updated) });
  });

  router.delete('/technical-providers/packages/:id', requireAuth, (req: AuthedRequest, res) => {
    const tp = db.prepare('SELECT * FROM technical_providers WHERE user_id = ?').get(req.user!.id) as any;
    if (!tp) return res.status(403).json({ error: 'Yetkisiz işlem.' });
    db.prepare('DELETE FROM service_packages WHERE id = ? AND provider_id = ?').run(req.params.id, tp.id);
    const updated = db.prepare('SELECT * FROM technical_providers WHERE id = ?').get(tp.id);
    return res.json({ provider: mapTechnicalProvider(db, updated) });
  });

  // Rider-to-Inventory Match & Requests/Quotes
  router.post('/technical-requests', requireAuth, requireFeatureFlag(db, 'technical_match'), (req: AuthedRequest, res) => {
    const {
      contextType = 'standalone',
      contextId = '',
      title,
      city,
      eventDate,
      requiredEquipment = [],
      notes = '',
    } = req.body || {};

    if (!title || !city || !eventDate) {
      return res.status(400).json({ error: 'Talep başlığı, şehir ve tarih zorunludur.' });
    }

    const id = newId('treq');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO technical_requests (
        id, requester_user_id, context_type, context_id, title, city, event_date,
        required_equipment_json, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
    `).run(
      id, req.user!.id, contextType, contextId || id, String(title).trim(),
      city, eventDate, JSON.stringify(Array.isArray(requiredEquipment) ? requiredEquipment : []),
      notes, now
    );

    const created = db.prepare('SELECT * FROM technical_requests WHERE id = ?').get(id);
    return res.status(201).json({ request: mapTechnicalRequest(created) });
  });

  router.get('/technical-requests/:id/matches', requireAuth, (req, res) => {
    const reqRow = db.prepare('SELECT * FROM technical_requests WHERE id = ?').get(req.params.id) as any;
    if (!reqRow) return res.status(404).json({ error: 'Teknik talep bulunamadı.' });
    const required = parseJson<string[]>(reqRow.required_equipment_json, []);

    const providers = (db.prepare('SELECT * FROM technical_providers').all() as any[]).map((tp) =>
      mapTechnicalProvider(db, tp)
    );

    const matches = providers.map((tp) => {
      const covered = required.filter((reqItem) =>
        tp.equipment.some((eq) =>
          eq.name.toLowerCase().includes(reqItem.toLowerCase()) ||
          eq.category.toLowerCase().includes(reqItem.toLowerCase()) ||
          reqItem.toLowerCase().includes(eq.name.toLowerCase())
        )
      );
      const missing = required.filter((item) => !covered.includes(item));
      const busyOnDate = Boolean(
        db.prepare(`SELECT id FROM availability_slots WHERE owner_id = ? AND slot_date = ? AND slot_kind IN ('booked', 'blocked')`).get(tp.id, reqRow.event_date)
      );

      return {
        providerId: tp.id,
        providerName: tp.name,
        cityMatch: tp.city === reqRow.city || tp.serviceAreas.includes(reqRow.city),
        coveredItems: covered,
        missingItems: missing,
        availableOnDate: !busyOnDate,
      };
    });

    return res.json({ matches });
  });

  router.post('/technical-requests/:id/quotes', requireAuth, requireFeatureFlag(db, 'technical_match'), (req: AuthedRequest, res) => {
    const reqRow = db.prepare('SELECT * FROM technical_requests WHERE id = ?').get(req.params.id) as any;
    if (!reqRow) return res.status(404).json({ error: 'Talep bulunamadı.' });

    const tp = db.prepare('SELECT * FROM technical_providers WHERE user_id = ?').get(req.user!.id) as any;
    if (!tp) return res.status(403).json({ error: 'Teklif vermek için teknik sağlayıcı profiliniz olmalıdır.' });

    const { amount, notes = '' } = req.body || {};
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Geçerli teklif tutarı giriniz.' });

    const quoteId = newId('tquote');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO technical_quotes (id, request_id, provider_id, provider_name, amount, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?)
    `).run(quoteId, reqRow.id, tp.id, tp.name, Number(amount), notes, now);

    db.prepare(`UPDATE technical_requests SET status = 'quoted' WHERE id = ? AND status = 'open'`).run(reqRow.id);

    notifyUser(db, {
      userId: reqRow.requester_user_id,
      type: 'technical_quote',
      title: 'Yeni Teknik Ekipman Teklifi',
      body: `${tp.name}, "${reqRow.title}" talebiniz için ${amount} TRY teklif sundu.`,
      linkView: 'technical_match',
    });

    const created = db.prepare('SELECT * FROM technical_quotes WHERE id = ?').get(quoteId);
    return res.status(201).json({ quote: mapTechnicalQuote(created) });
  });

  router.post('/technical-quotes/:id/accept', requireAuth, (req: AuthedRequest, res) => {
    const quote = db.prepare('SELECT * FROM technical_quotes WHERE id = ?').get(req.params.id) as any;
    if (!quote) return res.status(404).json({ error: 'Teklif bulunamadı.' });

    const reqRow = db.prepare('SELECT * FROM technical_requests WHERE id = ?').get(quote.request_id) as any;
    if (!reqRow || (reqRow.requester_user_id !== req.user!.id && req.user!.activeRole !== 'admin')) {
      return res.status(403).json({ error: 'Bu teklifi yalnızca talep sahibi onaylayabilir.' });
    }

    const tp = db.prepare('SELECT * FROM technical_providers WHERE id = ?').get(quote.provider_id) as any;
    db.prepare(`UPDATE technical_quotes SET status = 'accepted' WHERE id = ?`).run(quote.id);
    db.prepare(`UPDATE technical_quotes SET status = 'rejected' WHERE request_id = ? AND id != ?`).run(reqRow.id, quote.id);
    db.prepare(`UPDATE technical_requests SET status = 'accepted' WHERE id = ?`).run(reqRow.id);

    // Date conflict lock for technical provider
    const now = new Date().toISOString();
    const existingSlot = db
      .prepare(`SELECT id FROM availability_slots WHERE owner_id = ? AND slot_date = ? AND slot_kind = 'booked'`)
      .get(quote.provider_id, reqRow.event_date);
    if (!existingSlot && tp) {
      db.prepare(`
        INSERT INTO availability_slots (
          id, owner_type, owner_id, owner_user_id, owner_name, title, slot_date,
          start_time, end_time, recurrence, slot_kind, is_free, fee_amount, city, notes, created_at
        ) VALUES (?, 'technical_provider', ?, ?, ?, ?, ?, '16:00', '23:00', 'once', 'booked', 0, ?, ?, ?, ?)
      `).run(newId('slot'), tp.id, tp.user_id, tp.name, `Teknik Kurulum: ${reqRow.title}`, reqRow.event_date, quote.amount, reqRow.city, 'Teknik teklif onayı kilidi', now);
    }

    if (tp) {
      notifyUser(db, {
        userId: tp.user_id,
        type: 'technical_quote_accepted',
        title: 'Teknik Teklifiniz Onaylandı',
        body: `"${reqRow.title}" için sunduğunuz ${quote.amount} TRY teklif kabul edildi.`,
        linkView: 'technical_dashboard',
      });
    }

    const updatedQuote = db.prepare('SELECT * FROM technical_quotes WHERE id = ?').get(quote.id);
    const updatedReq = db.prepare('SELECT * FROM technical_requests WHERE id = ?').get(reqRow.id);
    return res.json({ quote: mapTechnicalQuote(updatedQuote), request: mapTechnicalRequest(updatedReq) });
  });

  router.post('/technical-quotes/:id/reject', requireAuth, (req: AuthedRequest, res) => {
    const quote = db.prepare('SELECT * FROM technical_quotes WHERE id = ?').get(req.params.id) as any;
    if (!quote) return res.status(404).json({ error: 'Teklif bulunamadı.' });

    const reqRow = db.prepare('SELECT * FROM technical_requests WHERE id = ?').get(quote.request_id) as any;
    if (!reqRow || (reqRow.requester_user_id !== req.user!.id && req.user!.activeRole !== 'admin')) {
      return res.status(403).json({ error: 'Bu teklifi yalnızca talep sahibi reddedebilir.' });
    }
    if (quote.status === 'accepted') {
      return res.status(400).json({ error: 'Kabul edilmiş teklif reddedilemez.' });
    }

    db.prepare(`UPDATE technical_quotes SET status = 'rejected' WHERE id = ?`).run(quote.id);
    const tp = db.prepare('SELECT * FROM technical_providers WHERE id = ?').get(quote.provider_id) as any;
    if (tp) {
      notifyUser(db, {
        userId: tp.user_id,
        type: 'technical_quote_rejected',
        title: 'Teknik Teklif Güncellemesi',
        body: `"${reqRow.title}" için sunduğunuz ${quote.amount} TRY teklif reddedildi.`,
        linkView: 'technical_dashboard',
      });
    }

    const updatedQuote = db.prepare('SELECT * FROM technical_quotes WHERE id = ?').get(quote.id);
    const updatedReq = db.prepare('SELECT * FROM technical_requests WHERE id = ?').get(reqRow.id);
    return res.json({ quote: mapTechnicalQuote(updatedQuote), request: mapTechnicalRequest(updatedReq) });
  });

  return router;
}
