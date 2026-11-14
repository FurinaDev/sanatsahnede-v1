import { Router } from 'express';
import QRCode from 'qrcode';
import { DbInstance } from '../db/database';
import { AuthedRequest, requireAuth, requireFeatureFlag } from '../middleware/auth';
import {
  mapBusinessProfile,
  mapCareerRecord,
  mapEnsemble,
  mapIndividualProfile,
  mapPortfolio,
} from '../db/mappers';
import { newId, slugify } from '../utils/crypto';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';

export function createProfilesRouter(db: DbInstance): Router {
  const router = Router();

  // Update logged-in user's own artist profile
  router.patch('/artists/me', requireAuth, (req: AuthedRequest, res) => {
    const existing = db
      .prepare('SELECT * FROM individual_profiles WHERE user_id = ?')
      .get(req.user!.id) as any;

    if (!existing) {
      return res.status(404).json({ error: 'Bu kullanıcıya ait bireysel sanatçı profili bulunamadı.' });
    }

    const {
      fullName,
      stageName,
      title,
      discipline,
      specialtyTags,
      bioShort,
      bioLong,
      city,
      district,
      primaryInstrument,
      instruments,
      genres,
      education,
      experienceYears,
      repertoire,
      avatarUrl,
      coverUrl,
      website,
      socialLinks,
      educations,
      experiences,
      mediaItems,
    } = req.body || {};

    db.prepare(`
      UPDATE individual_profiles SET
        full_name = COALESCE(?, full_name),
        stage_name = COALESCE(?, stage_name),
        title = COALESCE(?, title),
        discipline = COALESCE(?, discipline),
        specialty_tags_json = COALESCE(?, specialty_tags_json),
        bio_short = COALESCE(?, bio_short),
        bio_long = COALESCE(?, bio_long),
        city = COALESCE(?, city),
        district = COALESCE(?, district),
        primary_instrument = COALESCE(?, primary_instrument),
        instruments_json = COALESCE(?, instruments_json),
        genres_json = COALESCE(?, genres_json),
        education = COALESCE(?, education),
        experience_years = COALESCE(?, experience_years),
        repertoire_json = COALESCE(?, repertoire_json),
        avatar_url = COALESCE(?, avatar_url),
        cover_url = COALESCE(?, cover_url),
        website = COALESCE(?, website),
        social_links_json = COALESCE(?, social_links_json),
        educations_json = COALESCE(?, educations_json),
        experiences_json = COALESCE(?, experiences_json),
        media_items_json = COALESCE(?, media_items_json)
      WHERE id = ? AND user_id = ?
    `).run(
      fullName ?? null,
      stageName ?? null,
      title ?? null,
      discipline ?? null,
      specialtyTags ? JSON.stringify(specialtyTags) : null,
      bioShort ?? null,
      bioLong ?? null,
      city ?? null,
      district ?? null,
      primaryInstrument ?? null,
      instruments ? JSON.stringify(instruments) : null,
      genres ? JSON.stringify(genres) : null,
      education ?? null,
      experienceYears !== undefined ? Number(experienceYears) : null,
      repertoire ? JSON.stringify(repertoire) : null,
      avatarUrl ?? null,
      coverUrl ?? null,
      website ?? null,
      socialLinks ? JSON.stringify(socialLinks) : null,
      educations ? JSON.stringify(educations) : null,
      experiences ? JSON.stringify(experiences) : null,
      mediaItems ? JSON.stringify(mediaItems) : null,
      existing.id,
      req.user!.id
    );

    const updated = db.prepare('SELECT * FROM individual_profiles WHERE id = ?').get(existing.id);
    logAudit(db, {
      userId: req.user!.id,
      action: 'UPDATE_ARTIST_PROFILE',
      resourceType: 'individual_profile',
      resourceId: existing.id,
    });

    return res.json({ artist: mapIndividualProfile(updated) });
  });

  // Update logged-in user's own business profile
  router.patch('/businesses/me', requireAuth, (req: AuthedRequest, res) => {
    const existing = db
      .prepare('SELECT * FROM business_profiles WHERE user_id = ?')
      .get(req.user!.id) as any;

    if (!existing) {
      return res.status(404).json({ error: 'Bu kullanıcıya ait kurum profili bulunamadı.' });
    }

    const {
      businessName,
      businessType,
      description,
      city,
      district,
      address,
      website,
      phone,
      email,
      taxNumber,
      taxOffice,
      officialTitle,
      disciplines,
      facilities,
    } = req.body || {};

    db.prepare(`
      UPDATE business_profiles SET
        business_name = COALESCE(?, business_name),
        business_type = COALESCE(?, business_type),
        description = COALESCE(?, description),
        city = COALESCE(?, city),
        district = COALESCE(?, district),
        address = COALESCE(?, address),
        website = COALESCE(?, website),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        tax_number = COALESCE(?, tax_number),
        tax_office = COALESCE(?, tax_office),
        official_title = COALESCE(?, official_title),
        disciplines_json = COALESCE(?, disciplines_json),
        facilities_json = COALESCE(?, facilities_json)
      WHERE id = ? AND user_id = ?
    `).run(
      businessName ?? null,
      businessType ?? null,
      description ?? null,
      city ?? null,
      district ?? null,
      address ?? null,
      website ?? null,
      phone ?? null,
      email ?? null,
      taxNumber ?? null,
      taxOffice ?? null,
      officialTitle ?? null,
      disciplines ? JSON.stringify(disciplines) : null,
      facilities ? JSON.stringify(facilities) : null,
      existing.id,
      req.user!.id
    );

    const updated = db.prepare('SELECT * FROM business_profiles WHERE id = ?').get(existing.id);
    logAudit(db, {
      userId: req.user!.id,
      action: 'UPDATE_BUSINESS_PROFILE',
      resourceType: 'business_profile',
      resourceId: existing.id,
    });

    return res.json({ business: mapBusinessProfile(updated) });
  });

  // Update ensemble (ownership verified)
  router.patch('/ensembles/:id', requireAuth, (req: AuthedRequest, res) => {
    const ens = db.prepare('SELECT * FROM ensembles WHERE id = ?').get(req.params.id) as any;
    if (!ens) return res.status(404).json({ error: 'Topluluk bulunamadı.' });
    if (ens.leader_user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Bu topluluğu düzenleme yetkiniz yok.' });
    }

    const {
      name,
      ensembleType,
      bio,
      foundedYear,
      city,
      genres,
      repertoire,
      avatarUrl,
      coverUrl,
      website,
      discipline,
    } = req.body || {};
    db.prepare(`
      UPDATE ensembles SET
        name = COALESCE(?, name),
        ensemble_type = COALESCE(?, ensemble_type),
        bio = COALESCE(?, bio),
        founded_year = COALESCE(?, founded_year),
        city = COALESCE(?, city),
        discipline = COALESCE(?, discipline),
        genres_json = COALESCE(?, genres_json),
        repertoire_json = COALESCE(?, repertoire_json),
        avatar_url = COALESCE(?, avatar_url),
        cover_url = COALESCE(?, cover_url),
        website = COALESCE(?, website)
      WHERE id = ?
    `).run(
      name ?? null,
      ensembleType ?? null,
      bio ?? null,
      foundedYear !== undefined ? Number(foundedYear) : null,
      city ?? null,
      discipline ?? null,
      genres ? JSON.stringify(genres) : null,
      repertoire ? JSON.stringify(repertoire) : null,
      avatarUrl ?? null,
      coverUrl ?? null,
      website ?? null,
      ens.id
    );

    const updated = db.prepare('SELECT * FROM ensembles WHERE id = ?').get(ens.id);
    return res.json({ ensemble: mapEnsemble(db, updated) });
  });

  // Add ensemble member (with email invite workflow if matching registered user)
  router.post('/ensembles/:id/members', requireAuth, (req: AuthedRequest, res) => {
    const ens = db.prepare('SELECT * FROM ensembles WHERE id = ?').get(req.params.id) as any;
    if (!ens) return res.status(404).json({ error: 'Topluluk bulunamadı.' });
    if (ens.leader_user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Topluluk üye listesini yalnızca topluluk yöneticisi düzenleyebilir.' });
    }

    const { name, instrument = 'Keman', roleTitle = 'Topluluk Üyesi', email } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Üye adı zorunludur.' });
    }

    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    const linkedUser = normalizedEmail
      ? (db.prepare('SELECT id, avatar_url FROM users WHERE email = ?').get(normalizedEmail) as any)
      : null;
    const shouldInvite = Boolean(linkedUser && linkedUser.id !== req.user!.id);
    const memberStatus = shouldInvite ? 'invited' : 'active';

    const memberId = newId('mem');
    db.prepare(`
      INSERT INTO ensemble_members (id, ensemble_id, user_id, email, name, instrument, role_title, joined_year, avatar_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      memberId,
      ens.id,
      linkedUser?.id || null,
      normalizedEmail,
      String(name).trim(),
      instrument,
      roleTitle,
      new Date().getFullYear(),
      linkedUser?.avatar_url || '/src/assets/images/artist_cellist_portrait_1794582676514.jpg',
      memberStatus
    );

    if (shouldInvite && linkedUser) {
      notifyUser(db, {
        userId: linkedUser.id,
        type: 'ensemble_invite',
        title: `${ens.name} Topluluğundan Üyelik Daveti`,
        body: `"${ens.name}" topluluğuna "${roleTitle}" (${instrument}) olarak davet edildiniz.`,
        linkView: 'ensemble_dashboard',
        linkEntityId: ens.id,
      });
    }

    const updated = db.prepare('SELECT * FROM ensembles WHERE id = ?').get(ens.id);
    return res.status(201).json({ ensemble: mapEnsemble(db, updated) });
  });

  // Respond to ensemble membership invitation
  router.post('/ensembles/:id/members/:memberId/respond', requireAuth, (req: AuthedRequest, res) => {
    const ens = db.prepare('SELECT * FROM ensembles WHERE id = ?').get(req.params.id) as any;
    if (!ens) return res.status(404).json({ error: 'Topluluk bulunamadı.' });
    const member = db
      .prepare('SELECT * FROM ensemble_members WHERE id = ? AND ensemble_id = ?')
      .get(req.params.memberId, ens.id) as any;
    if (!member) return res.status(404).json({ error: 'Üyelik daveti bulunamadı.' });

    const matchesUser =
      member.user_id === req.user!.id ||
      (member.email && member.email.toLowerCase() === req.user!.email.toLowerCase());
    if (!matchesUser && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Bu davete yalnızca davet edilen kullanıcı yanıt verebilir.' });
    }

    const { decision } = req.body || {};
    if (!['accept', 'decline'].includes(decision)) {
      return res.status(400).json({ error: 'Geçersiz davet yanıtı.' });
    }

    const nextStatus = decision === 'accept' ? 'active' : 'declined';
    db.prepare('UPDATE ensemble_members SET status = ?, user_id = COALESCE(user_id, ?) WHERE id = ?').run(
      nextStatus,
      req.user!.id,
      member.id
    );

    notifyUser(db, {
      userId: ens.leader_user_id,
      type: 'ensemble_invite_response',
      title: `Topluluk Daveti ${decision === 'accept' ? 'Kabul Edildi' : 'Reddedildi'}`,
      body: `${member.name}, "${ens.name}" üyelik davetini ${decision === 'accept' ? 'kabul etti' : 'reddetti'}.`,
      linkView: 'ensemble_dashboard',
      linkEntityId: ens.id,
    });

    const updated = db.prepare('SELECT * FROM ensembles WHERE id = ?').get(ens.id);
    return res.json({ ensemble: mapEnsemble(db, updated) });
  });

  // Remove ensemble member
  router.delete('/ensembles/:id/members/:memberId', requireAuth, (req: AuthedRequest, res) => {
    const ens = db.prepare('SELECT * FROM ensembles WHERE id = ?').get(req.params.id) as any;
    if (!ens) return res.status(404).json({ error: 'Topluluk bulunamadı.' });
    if (ens.leader_user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Yetkisiz işlem.' });
    }

    db.prepare('DELETE FROM ensemble_members WHERE id = ? AND ensemble_id = ?').run(
      req.params.memberId,
      ens.id
    );
    const updated = db.prepare('SELECT * FROM ensembles WHERE id = ?').get(ens.id);
    return res.json({ ensemble: mapEnsemble(db, updated) });
  });

  // 9.6 Artist Studio — Multi-identity Portfolios + QR generation
  router.get('/artist-studio', requireFeatureFlag(db, 'artist_studio'), (req: AuthedRequest, res) => {
    const rows = db.prepare('SELECT * FROM artist_portfolios ORDER BY created_at DESC').all() as any[];
    const visible = rows
      .filter((r) => r.visibility === 'public' || (req.user && r.user_id === req.user.id))
      .map(mapPortfolio);
    return res.json({ portfolios: visible });
  });

  router.post('/artist-studio', requireAuth, requireFeatureFlag(db, 'artist_studio'), (req: AuthedRequest, res) => {
    const profile = db
      .prepare('SELECT id FROM individual_profiles WHERE user_id = ?')
      .get(req.user!.id) as { id: string } | undefined;

    const {
      title,
      audienceType = 'Kurum & Otel',
      identityRole = 'Bireysel Sanatçı',
      language = 'tr',
      visibility = 'public',
      summary = '',
      worksList = [],
      pressQuotes = [],
      awards = [],
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Portfolyo başlığı zorunludur.' });
    }

    const id = newId('port');
    const slug = `${slugify(title)}-${id.slice(-4)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO artist_portfolios (
        id, artist_id, user_id, title, audience_type, identity_role, language,
        visibility, summary, works_list_json, press_quotes_json, awards_json, slug, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      profile?.id || req.user!.id,
      req.user!.id,
      String(title).trim(),
      audienceType,
      identityRole,
      language,
      visibility,
      summary,
      JSON.stringify(Array.isArray(worksList) ? worksList : []),
      JSON.stringify(Array.isArray(pressQuotes) ? pressQuotes : []),
      JSON.stringify(Array.isArray(awards) ? awards : []),
      slug,
      now
    );

    const created = db.prepare('SELECT * FROM artist_portfolios WHERE id = ?').get(id);
    return res.status(201).json({ portfolio: mapPortfolio(created) });
  });

  router.patch('/artist-studio/:id', requireAuth, requireFeatureFlag(db, 'artist_studio'), (req: AuthedRequest, res) => {
    const row = db.prepare('SELECT * FROM artist_portfolios WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Portfolyo bulunamadı.' });
    if (row.user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Bu portfolyoyu düzenleme yetkiniz yok.' });
    }

    const {
      title,
      audienceType,
      identityRole,
      language,
      visibility,
      summary,
      worksList,
      pressQuotes,
      awards,
    } = req.body || {};

    db.prepare(`
      UPDATE artist_portfolios SET
        title = COALESCE(?, title),
        audience_type = COALESCE(?, audience_type),
        identity_role = COALESCE(?, identity_role),
        language = COALESCE(?, language),
        visibility = COALESCE(?, visibility),
        summary = COALESCE(?, summary),
        works_list_json = COALESCE(?, works_list_json),
        press_quotes_json = COALESCE(?, press_quotes_json),
        awards_json = COALESCE(?, awards_json)
      WHERE id = ?
    `).run(
      title !== undefined ? String(title).trim() : null,
      audienceType ?? null,
      identityRole ?? null,
      language ?? null,
      visibility ?? null,
      summary ?? null,
      worksList !== undefined ? JSON.stringify(Array.isArray(worksList) ? worksList : []) : null,
      pressQuotes !== undefined ? JSON.stringify(Array.isArray(pressQuotes) ? pressQuotes : []) : null,
      awards !== undefined ? JSON.stringify(Array.isArray(awards) ? awards : []) : null,
      row.id
    );

    const updated = db.prepare('SELECT * FROM artist_portfolios WHERE id = ?').get(row.id);
    return res.json({ portfolio: mapPortfolio(updated) });
  });

  router.delete('/artist-studio/:id', requireAuth, (req: AuthedRequest, res) => {
    const row = db.prepare('SELECT * FROM artist_portfolios WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Portfolyo bulunamadı.' });
    if (row.user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Bu portfolyoyu silme yetkiniz yok.' });
    }
    db.prepare('DELETE FROM artist_portfolios WHERE id = ?').run(row.id);
    return res.json({ success: true });
  });

  router.get('/artist-studio/:id/qr', async (req, res) => {
    const row = db.prepare('SELECT * FROM artist_portfolios WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Portfolyo bulunamadı.' });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const targetUrl = `${baseUrl}/?portfolio=${encodeURIComponent(row.slug)}`;
    const qrDataUrl = await QRCode.toDataURL(targetUrl, { width: 220, margin: 1 });
    return res.json({ targetUrl, qrDataUrl });
  });

  // 9.10 Career Passport
  router.get('/career-passport', requireFeatureFlag(db, 'career_passport'), (req, res) => {
    const { artistId } = req.query;
    const rows = artistId
      ? (db.prepare('SELECT * FROM career_records WHERE artist_id = ? ORDER BY event_date DESC').all(String(artistId)) as any[])
      : (db.prepare('SELECT * FROM career_records ORDER BY event_date DESC').all() as any[]);
    return res.json({ records: rows.map(mapCareerRecord) });
  });

  router.post('/career-passport', requireAuth, requireFeatureFlag(db, 'career_passport'), (req: AuthedRequest, res) => {
    const profile = db
      .prepare('SELECT id FROM individual_profiles WHERE user_id = ?')
      .get(req.user!.id) as { id: string } | undefined;

    const { title, organizationName, venueName, roleTitle, eventDate } = req.body || {};
    if (!title || !organizationName || !eventDate) {
      return res.status(400).json({ error: 'Etkinlik adı, kurum ve tarih zorunludur.' });
    }

    const id = newId('car');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO career_records (
        id, artist_id, user_id, title, organization_name, venue_name, role_title,
        event_date, source_type, is_verified_record, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', 0, ?)
    `).run(
      id,
      profile?.id || req.user!.id,
      req.user!.id,
      String(title).trim(),
      String(organizationName).trim(),
      String(venueName || organizationName).trim(),
      String(roleTitle || 'Sanatçı').trim(),
      String(eventDate),
      now
    );

    const created = db.prepare('SELECT * FROM career_records WHERE id = ?').get(id);
    return res.status(201).json({ record: mapCareerRecord(created) });
  });

  router.delete('/career-passport/:id', requireAuth, requireFeatureFlag(db, 'career_passport'), (req: AuthedRequest, res) => {
    const row = db.prepare('SELECT * FROM career_records WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Kariyer kaydı bulunamadı.' });
    if (row.user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Bu kariyer kaydını silme yetkiniz yok.' });
    }
    if (row.source_type !== 'manual' || Boolean(row.is_verified_record)) {
      return res.status(403).json({ error: 'Doğrulanmış rezervasyon/sistem kayıtları silinemez.' });
    }
    db.prepare('DELETE FROM career_records WHERE id = ?').run(row.id);
    return res.json({ success: true });
  });

  router.get('/career-passport/:artistId/qr', async (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const targetUrl = `${baseUrl}/?passport=${encodeURIComponent(req.params.artistId)}`;
    const qrDataUrl = await QRCode.toDataURL(targetUrl, { width: 220, margin: 1 });
    return res.json({ targetUrl, qrDataUrl });
  });

  return router;
}
