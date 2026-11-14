import { Router } from 'express';
import { DbInstance, parseJson } from '../db/database';
import { AuthedRequest, requireAuth, requireRole, rowToUser } from '../middleware/auth';
import {
  mapAuditLog,
  mapBooking,
  mapDispute,
  mapEvent,
  mapFeatureFlag,
  mapLedgerEntry,
  mapListing,
  mapOpportunity,
  mapProject,
  mapTechnicalProvider,
  mapVenue,
  mapVerification,
} from '../db/mappers';
import { newId } from '../utils/crypto';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';
import { seedDatabase } from '../db/seed';
import { INITIAL_SETTINGS } from '../../src/data/seedData';
import { getPaymentMode } from '../services/paymentAdapter';

export function createAdminRouter(db: DbInstance): Router {
  const router = Router();

  const staffRoles = ['admin', 'moderator', 'finance_admin', 'verification_officer', 'support'] as const;

  router.get('/overview', requireAuth, requireRole(...staffRoles), (_req, res) => {
    const users = (db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as any[]).map(rowToUser);
    const verifications = (db.prepare('SELECT * FROM verification_requests ORDER BY submitted_at DESC').all() as any[]).map(mapVerification);
    const pendingListings = (db.prepare(`SELECT * FROM listings WHERE status = 'pending_moderation'`).all() as any[]).map(mapListing);
    const pendingEvents = (db.prepare(`SELECT * FROM events WHERE status = 'pending_moderation'`).all() as any[]).map(mapEvent);
    const pendingOpportunities = (db.prepare(`SELECT * FROM opportunities WHERE status = 'pending_moderation'`).all() as any[]).map(mapOpportunity);
    const disputes = (db.prepare('SELECT * FROM disputes ORDER BY updated_at DESC').all() as any[]).map(mapDispute);
    const ledger = (db.prepare('SELECT * FROM financial_ledger ORDER BY created_at DESC').all() as any[]).map(mapLedgerEntry);
    const featureFlags = (db.prepare('SELECT * FROM feature_flags').all() as any[]).map(mapFeatureFlag);
    const auditLogs = (db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 80').all() as any[]).map(mapAuditLog);
    const contactMessages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 30').all() as any[];

    return res.json({
      users,
      verifications,
      pendingListings,
      pendingEvents,
      pendingOpportunities,
      disputes,
      ledger,
      featureFlags,
      auditLogs,
      contactMessages,
    });
  });

  // Verification Approve / Reject
  router.post(
    '/verifications/:id/approve',
    requireAuth,
    requireRole('admin', 'verification_officer'),
    (req: AuthedRequest, res) => {
      const vr = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(req.params.id) as any;
      if (!vr) return res.status(404).json({ error: 'Doğrulama başvurusu bulunamadı.' });

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE verification_requests SET status = 'approved', admin_note = ?, reviewed_by_user_id = ?, reviewed_at = ?
        WHERE id = ?
      `).run(req.body?.note || 'Onaylandı', req.user!.id, now, vr.id);

      db.prepare(`UPDATE users SET is_verified = 1, kyc_status = 'approved' WHERE id = ?`).run(vr.user_id);

      if (vr.account_type === 'business') {
        db.prepare(`UPDATE business_profiles SET is_verified = 1, verification_status = 'approved' WHERE user_id = ?`).run(vr.user_id);
      } else if (vr.account_type === 'ensemble') {
        db.prepare(`UPDATE ensembles SET is_verified = 1, verification_status = 'approved' WHERE leader_user_id = ?`).run(vr.user_id);
      } else {
        db.prepare(`UPDATE individual_profiles SET is_verified = 1, verification_status = 'approved' WHERE user_id = ?`).run(vr.user_id);
      }

      notifyUser(db, {
        userId: vr.user_id,
        type: 'verification_approved',
        title: 'Hesap Doğrulamanız Onaylandı',
        body: `${vr.entity_name} için doğrulama rozeti aktif edildi.`,
      });

      logAudit(db, {
        userId: req.user!.id,
        action: 'APPROVE_VERIFICATION',
        resourceType: 'verification_request',
        resourceId: vr.id,
      });

      const updated = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(vr.id);
      return res.json({ verification: mapVerification(updated) });
    }
  );

  router.post(
    '/verifications/:id/reject',
    requireAuth,
    requireRole('admin', 'verification_officer'),
    (req: AuthedRequest, res) => {
      const vr = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(req.params.id) as any;
      if (!vr) return res.status(404).json({ error: 'Doğrulama başvurusu bulunamadı.' });

      const note = String(req.body?.note || 'Eksik veya doğrulanamayan belge');
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE verification_requests SET status = 'rejected', admin_note = ?, reviewed_by_user_id = ?, reviewed_at = ?
        WHERE id = ?
      `).run(note, req.user!.id, now, vr.id);

      db.prepare(`UPDATE users SET is_verified = 0, kyc_status = 'rejected' WHERE id = ?`).run(vr.user_id);

      if (vr.account_type === 'business') {
        db.prepare(`UPDATE business_profiles SET is_verified = 0, verification_status = 'rejected' WHERE user_id = ?`).run(vr.user_id);
      } else if (vr.account_type === 'ensemble') {
        db.prepare(`UPDATE ensembles SET is_verified = 0, verification_status = 'rejected' WHERE leader_user_id = ?`).run(vr.user_id);
      } else {
        db.prepare(`UPDATE individual_profiles SET is_verified = 0, verification_status = 'rejected' WHERE user_id = ?`).run(vr.user_id);
      }

      notifyUser(db, {
        userId: vr.user_id,
        type: 'verification_rejected',
        title: 'Doğrulama Başvurusu Güncellemesi',
        body: `Başvurunuz reddedildi: ${note}`,
      });

      logAudit(db, {
        userId: req.user!.id,
        action: 'REJECT_VERIFICATION',
        resourceType: 'verification_request',
        resourceId: vr.id,
        details: { note },
      });

      const updated = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(vr.id);
      return res.json({ verification: mapVerification(updated) });
    }
  );

  // Content Moderation (Listings, Events, Opportunities)
  router.post(
    '/moderation/:entityType/:id',
    requireAuth,
    requireRole('admin', 'moderator'),
    (req: AuthedRequest, res) => {
      const { entityType, id } = req.params;
      const { decision } = req.body || {};
      if (!['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ error: 'Geçersiz moderasyon kararı.' });
      }

      if (entityType === 'listing') {
        const nextStatus = decision === 'approve' ? 'active' : 'rejected';
        db.prepare('UPDATE listings SET status = ? WHERE id = ?').run(nextStatus, id);
        const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(id);
        if (!row) return res.status(404).json({ error: 'İlan bulunamadı.' });
        logAudit(db, { userId: req.user!.id, action: `MODERATE_LISTING_${decision.toUpperCase()}`, resourceType: 'listing', resourceId: id });
        return res.json({ listing: mapListing(row) });
      }

      if (entityType === 'event') {
        const nextStatus = decision === 'approve' ? 'published' : 'rejected';
        db.prepare('UPDATE events SET status = ? WHERE id = ?').run(nextStatus, id);
        const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
        if (!row) return res.status(404).json({ error: 'Etkinlik bulunamadı.' });
        logAudit(db, { userId: req.user!.id, action: `MODERATE_EVENT_${decision.toUpperCase()}`, resourceType: 'event', resourceId: id });
        return res.json({ event: mapEvent(row) });
      }

      if (entityType === 'opportunity') {
        const nextStatus = decision === 'approve' ? 'published' : 'rejected';
        db.prepare('UPDATE opportunities SET status = ? WHERE id = ?').run(nextStatus, id);
        const row = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id);
        if (!row) return res.status(404).json({ error: 'Fırsat bulunamadı.' });
        logAudit(db, { userId: req.user!.id, action: `MODERATE_OPPORTUNITY_${decision.toUpperCase()}`, resourceType: 'opportunity', resourceId: id });
        return res.json({ opportunity: mapOpportunity(row) });
      }

      if (entityType === 'project') {
        const nextStatus = decision === 'approve' ? 'recruiting' : 'archived';
        db.prepare('UPDATE projects SET status = ? WHERE id = ?').run(nextStatus, id);
        const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        if (!row) return res.status(404).json({ error: 'Proje bulunamadı.' });
        logAudit(db, { userId: req.user!.id, action: `MODERATE_PROJECT_${decision.toUpperCase()}`, resourceType: 'project', resourceId: id });
        return res.json({ project: mapProject(row) });
      }

      return res.status(400).json({ error: 'Desteklenmeyen içerik türü.' });
    }
  );

  // Platform Settings (Commission Rate & Model)
  router.patch(
    '/settings',
    requireAuth,
    requireRole('admin', 'finance_admin'),
    (req: AuthedRequest, res) => {
      const row = db.prepare('SELECT setting_value FROM platform_settings WHERE setting_key = ?').get('settings') as any;
      const current = row ? parseJson(row.setting_value, INITIAL_SETTINGS) : INITIAL_SETTINGS;
      const next = {
        ...current,
        ...(req.body?.commissionRate !== undefined ? { commissionRate: Math.max(0, Math.min(30, Number(req.body.commissionRate))) } : {}),
        ...(req.body?.commissionModel ? { commissionModel: req.body.commissionModel } : {}),
        ...(req.body?.requireVerificationForListing !== undefined ? { requireVerificationForListing: Boolean(req.body.requireVerificationForListing) } : {}),
      };
      db.prepare('INSERT OR REPLACE INTO platform_settings (setting_key, setting_value) VALUES (?, ?)').run(
        'settings',
        JSON.stringify(next)
      );
      logAudit(db, { userId: req.user!.id, action: 'UPDATE_SETTINGS', resourceType: 'platform_settings', resourceId: 'settings', details: next });
      return res.json({ settings: next });
    }
  );

  // Dispute Resolution (Refund or Release Escrow)
  router.post(
    '/disputes/:id/resolve',
    requireAuth,
    requireRole('admin', 'finance_admin', 'support'),
    (req: AuthedRequest, res) => {
      const disp = db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id) as any;
      if (!disp) return res.status(404).json({ error: 'Uyuşmazlık bulunamadı.' });
      const bk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(disp.booking_id) as any;
      if (!bk) return res.status(404).json({ error: 'İlgili rezervasyon bulunamadı.' });

      const { outcome, resolutionNote = '' } = req.body || {};
      if (!['resolved_refund', 'resolved_release'].includes(outcome)) {
        return res.status(400).json({ error: 'Geçersiz uyuşmazlık kararı.' });
      }

      const now = new Date().toISOString();
      const mode = getPaymentMode();
      db.prepare(`
        UPDATE disputes SET status = ?, resolution_note = ?, resolved_by_user_id = ?, updated_at = ?
        WHERE id = ?
      `).run(outcome, resolutionNote, req.user!.id, now, disp.id);

      if (outcome === 'resolved_refund') {
        db.prepare(`
          UPDATE bookings SET status = 'cancelled', payment_status = 'refunded', dispute_status = 'resolved', updated_at = ?
          WHERE id = ?
        `).run(now, bk.id);
        db.prepare(`
          INSERT INTO financial_ledger (id, booking_id, entry_type, amount, currency, provider, provider_ref, mode, notes, created_at)
          VALUES (?, ?, 'refund', ?, 'TRY', 'iyzico_sandbox', ?, ?, ?, ?)
        `).run(newId('led'), bk.id, bk.gross_amount, `disp_ref_${bk.id}`, mode, `Uyuşmazlık çözümü: İşverene iade — ${resolutionNote}`, now);
      } else {
        db.prepare(`
          UPDATE bookings SET status = 'completed', payment_status = 'released', dispute_status = 'resolved', updated_at = ?
          WHERE id = ?
        `).run(now, bk.id);
        db.prepare(`
          INSERT INTO financial_ledger (id, booking_id, entry_type, amount, currency, provider, provider_ref, mode, notes, created_at)
          VALUES (?, ?, 'payout_release', ?, 'TRY', 'iyzico_sandbox', ?, ?, ?, ?)
        `).run(newId('led'), bk.id, bk.net_payout_amount, `disp_rel_${bk.id}`, mode, `Uyuşmazlık çözümü: İcracıya aktarım — ${resolutionNote}`, now);
      }

      logAudit(db, {
        userId: req.user!.id,
        action: 'RESOLVE_DISPUTE',
        resourceType: 'dispute',
        resourceId: disp.id,
        details: { outcome, resolutionNote },
      });

      const updatedDisp = db.prepare('SELECT * FROM disputes WHERE id = ?').get(disp.id);
      const updatedBk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bk.id);
      return res.json({ dispute: mapDispute(updatedDisp), booking: mapBooking(updatedBk) });
    }
  );

  // Feature Flags Toggle (19.3)
  router.patch('/feature-flags/:key', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const existing = db.prepare('SELECT * FROM feature_flags WHERE flag_key = ?').get(req.params.key) as any;
    if (!existing) return res.status(404).json({ error: 'Özellik bayrağı bulunamadı.' });
    const enabled = req.body?.enabled ? 1 : 0;
    db.prepare('UPDATE feature_flags SET enabled = ? WHERE flag_key = ?').run(enabled, req.params.key);
    logAudit(db, { userId: req.user!.id, action: 'TOGGLE_FEATURE_FLAG', resourceType: 'feature_flag', resourceId: req.params.key, details: { enabled: Boolean(enabled) } });
    const updated = db.prepare('SELECT * FROM feature_flags WHERE flag_key = ?').get(req.params.key);
    return res.json({ featureFlag: mapFeatureFlag(updated) });
  });

  // User Role Assignment (Admin only)
  router.patch('/users/:id/roles', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
    if (!userRow) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    const { roles, activeRole } = req.body || {};
    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: 'En az bir rol belirtilmelidir.' });
    }
    const nextActive = activeRole && roles.includes(activeRole) ? activeRole : roles[0];
    db.prepare('UPDATE users SET roles_json = ?, active_role = ? WHERE id = ?').run(
      JSON.stringify(roles),
      nextActive,
      userRow.id
    );
    logAudit(db, { userId: req.user!.id, action: 'UPDATE_USER_ROLES', resourceType: 'user', resourceId: userRow.id, details: { roles } });
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userRow.id);
    return res.json({ user: rowToUser(updated) });
  });

  // User Status Toggle (Active / Suspended - Admin only)
  router.patch('/users/:id/status', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
    if (!userRow) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (userRow.id === req.user!.id) {
      return res.status(400).json({ error: 'Kendi yönetici hesabınızı askıya alamazsınız.' });
    }
    const { status } = req.body || {};
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Geçersiz kullanıcı durumu.' });
    }
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userRow.id);
    if (status === 'suspended') {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userRow.id);
    }
    logAudit(db, { userId: req.user!.id, action: 'UPDATE_USER_STATUS', resourceType: 'user', resourceId: userRow.id, details: { status } });
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userRow.id);
    return res.json({ user: rowToUser(updated) });
  });

  // Verify Venue (Admin / Verification Officer)
  router.post(
    '/venues/:id/verify',
    requireAuth,
    requireRole('admin', 'verification_officer'),
    (req: AuthedRequest, res) => {
      const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id) as any;
      if (!venue) return res.status(404).json({ error: 'Mekân bulunamadı.' });
      const verified = req.body?.isVerified !== false ? 1 : 0;
      db.prepare('UPDATE venues SET is_verified = ? WHERE id = ?').run(verified, venue.id);
      notifyUser(db, {
        userId: venue.manager_user_id,
        type: 'venue_verification',
        title: verified ? 'Mekânınız Doğrulandı' : 'Mekân Doğrulaması Kaldırıldı',
        body: `"${venue.name}" mekânının doğrulama durumu güncellendi.`,
        linkView: 'venue_dashboard',
      });
      logAudit(db, {
        userId: req.user!.id,
        action: verified ? 'VERIFY_VENUE' : 'UNVERIFY_VENUE',
        resourceType: 'venue',
        resourceId: venue.id,
      });
      const updated = db.prepare('SELECT * FROM venues WHERE id = ?').get(venue.id);
      return res.json({ venue: mapVenue(db, updated) });
    }
  );

  // Verify Technical Provider (Admin / Verification Officer)
  router.post(
    '/technical-providers/:id/verify',
    requireAuth,
    requireRole('admin', 'verification_officer'),
    (req: AuthedRequest, res) => {
      const tp = db.prepare('SELECT * FROM technical_providers WHERE id = ?').get(req.params.id) as any;
      if (!tp) return res.status(404).json({ error: 'Teknik sağlayıcı bulunamadı.' });
      const verified = req.body?.isVerified !== false ? 1 : 0;
      db.prepare('UPDATE technical_providers SET is_verified = ? WHERE id = ?').run(verified, tp.id);
      notifyUser(db, {
        userId: tp.user_id,
        type: 'technical_verification',
        title: verified ? 'Teknik Sağlayıcı Profiliniz Doğrulandı' : 'Teknik Sağlayıcı Doğrulaması Kaldırıldı',
        body: `"${tp.name}" profilinizin doğrulama durumu güncellendi.`,
        linkView: 'technical_dashboard',
      });
      logAudit(db, {
        userId: req.user!.id,
        action: verified ? 'VERIFY_TECHNICAL_PROVIDER' : 'UNVERIFY_TECHNICAL_PROVIDER',
        resourceType: 'technical_provider',
        resourceId: tp.id,
      });
      const updated = db.prepare('SELECT * FROM technical_providers WHERE id = ?').get(tp.id);
      return res.json({ technicalProvider: mapTechnicalProvider(db, updated) });
    }
  );

  // Sandbox Demo Reset
  router.post('/reset-demo', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    seedDatabase(db, true);
    logAudit(db, { userId: req.user!.id, action: 'RESET_DEMO_DATABASE', resourceType: 'database', resourceId: 'all' });
    return res.json({ success: true });
  });

  return router;
}
