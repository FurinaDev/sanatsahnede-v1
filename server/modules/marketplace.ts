import { Router } from 'express';
import { DbInstance, parseJson } from '../db/database';
import { AuthedRequest, requireAuth, requireVerified } from '../middleware/auth';
import {
  mapApplication,
  mapBooking,
  mapContract,
  mapDispute,
  mapIndividualProfile,
  mapLedgerEntry,
  mapListing,
  mapOffer,
  mapProductionWorkspace,
  mapReview,
} from '../db/mappers';
import { newId, slugify } from '../utils/crypto';
import {
  calculateCancellationRate,
  calculateCommission,
  canReleaseEscrowPayout,
  explainArtistListingMatch,
  hasTimeConflict,
} from '../../src/utils/businessLogic';
import { INITIAL_SETTINGS } from '../../src/data/seedData';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';
import {
  getPaymentMode,
  initializeEscrowCheckout,
  signWebhookPayload,
  verifyWebhookSignature,
} from '../services/paymentAdapter';

function getPlatformSettings(db: DbInstance) {
  const row = db
    .prepare('SELECT setting_value FROM platform_settings WHERE setting_key = ?')
    .get('settings') as { setting_value: string } | undefined;
  return row ? parseJson(row.setting_value, INITIAL_SETTINGS) : INITIAL_SETTINGS;
}

function createContractAndProductionForBooking(db: DbInstance, booking: any) {
  const now = new Date().toISOString();
  const contractId = newId('contract');
  const termsText = `1. Taraflar: ${booking.business_name} (İşveren) ve ${booking.performer_name} (İcracı).\n2. Performans Tarihi ve Yeri: ${booking.event_date} (${booking.start_time} - ${booking.end_time}), ${booking.venue_name} (${booking.city}).\n3. Mali Şartlar: İcracı Net Hakedişi ${booking.net_payout_amount} TRY, Platform Hizmet Bedeli ${booking.commission_amount} TRY (%${booking.commission_rate}, ${booking.commission_model}). İşveren Toplam Ödeme: ${booking.gross_amount} TRY.\n4. Güvence & Çift Onay: Tutar sahne tamamlanana kadar güvence hesabında tutulur; hem işveren hem icracı tamamlanma onayı verdiğinde serbest bırakılır.`;
  const disclaimer =
    'Bu dijital sözleşme SanatSahnede platformu içi operasyon ve güvence kaydıdır; yüksek tutarlı kurumsal projelerde ayrıca ıslak imza veya 5070 sayılı Kanun kapsamında nitelikli elektronik imza kullanılması tavsiye edilir.';

  db.prepare(`
    INSERT OR IGNORE INTO contracts (
      id, booking_id, version, title, terms_text, disclaimer,
      employer_accepted_at, performer_accepted_at, created_at
    ) VALUES (?, ?, '1.0', ?, ?, ?, ?, ?, ?)
  `).run(
    contractId,
    booking.id,
    `${booking.listing_title} — Dijital İcra Sözleşmesi`,
    termsText,
    disclaimer,
    booking.contract_terms_accepted_by_employer ? now : null,
    booking.contract_terms_accepted_by_performer ? now : null,
    now
  );

  // Auto-provision Production Workspace for the booking
  const existingProd = db
    .prepare('SELECT id FROM production_workspaces WHERE context_type = ? AND context_id = ?')
    .get('booking', booking.id);
  if (!existingProd) {
    db.prepare(`
      INSERT INTO production_workspaces (
        id, context_type, context_id, title, event_date, venue_name,
        rider_json, stage_plot_json, schedule_json, tasks_json, logistics_json, updated_at
      ) VALUES (?, 'booking', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId('prod'),
      booking.id,
      `${booking.listing_title} — Prodüksiyon Masası`,
      booking.event_date,
      booking.venue_name,
      JSON.stringify({
        stageSize: 'Standart Salon Sahnesi (6m x 4m)',
        soundRequirements: 'Etkinlik ilanında belirtilen akustik/ses düzeni geçerlidir.',
        lightRequirements: 'Standart sahne aydınlatması',
        microphones: [],
        backline: [],
        monitors: '1 adet sahne monitörü',
        ioPatchList: 'Soundcheck sırasında belirlenecek',
        specialNotes: '',
      }),
      JSON.stringify([
        { id: 'sp_init_1', kind: 'musician', label: booking.performer_name, x: 50, y: 45 },
      ]),
      JSON.stringify([
        { id: 'sch_init_1', time: '18:00', title: 'Sanatçı Varış & Soundcheck', ownerRole: 'İcracı' },
        { id: 'sch_init_2', time: booking.start_time || '20:00', title: 'Performans Başlangıcı', ownerRole: 'İcracı' },
      ]),
      JSON.stringify([
        { id: 'tsk_init_1', title: 'Teknik rider ve sahne planı teyidi', assigneeRole: 'artist', dueDate: booking.event_date, completed: false },
        { id: 'tsk_init_2', title: 'Kulis ve varış bilgisi paylaşımı', assigneeRole: 'business_owner', dueDate: booking.event_date, completed: false },
      ]),
      JSON.stringify({
        travelSummary: 'Taraflarca Prodüksiyon Masası üzerinden planlanacaktır.',
        accommodationSummary: 'İlan şartlarına tabidir.',
        transferNotes: '',
        arrivalTime: '18:00',
      }),
      now
    );
  }
}

function finalizePaymentHold(
  db: DbInstance,
  bookingRow: any,
  provider: string,
  providerRef: string,
  mode: 'sandbox' | 'production'
) {
  const now = new Date().toISOString();
  const paymentStatus = mode === 'production' ? 'held_live' : 'held_sandbox';
  db.prepare(`
    UPDATE bookings SET
      payment_status = ?,
      payment_provider = ?,
      payment_ref = ?,
      status = 'confirmed',
      updated_at = ?
    WHERE id = ?
  `).run(paymentStatus, provider, providerRef, now, bookingRow.id);

  // Prevent duplicate hold ledger entries for same booking
  const existingHold = db
    .prepare(`SELECT id FROM financial_ledger WHERE booking_id = ? AND entry_type = 'payment_hold'`)
    .get(bookingRow.id);
  if (!existingHold) {
    db.prepare(`
      INSERT INTO financial_ledger (
        id, booking_id, entry_type, amount, currency, provider, provider_ref, mode, notes, created_at
      ) VALUES (?, ?, 'payment_hold', ?, 'TRY', ?, ?, ?, ?, ?)
    `).run(
      newId('led'),
      bookingRow.id,
      bookingRow.gross_amount,
      provider,
      providerRef,
      mode,
      `Güvence ödemesi bloke edildi (${mode})`,
      now
    );
  }

  // Block performer availability slot for date conflict protection
  const existingSlot = db
    .prepare(`SELECT id FROM availability_slots WHERE owner_id = ? AND slot_date = ? AND slot_kind = 'booked'`)
    .get(bookingRow.performer_id, bookingRow.event_date);
  if (!existingSlot) {
    db.prepare(`
      INSERT INTO availability_slots (
        id, owner_type, owner_id, owner_user_id, owner_name, title, slot_date,
        start_time, end_time, recurrence, slot_kind, is_free, fee_amount, city, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'once', 'booked', 0, ?, ?, ?, ?)
    `).run(
      newId('slot'),
      bookingRow.performer_type === 'ensemble' ? 'ensemble' : 'artist',
      bookingRow.performer_id,
      bookingRow.performer_user_id,
      bookingRow.performer_name,
      `Rezervasyon: ${bookingRow.listing_title}`,
      bookingRow.event_date,
      bookingRow.start_time || '20:00',
      bookingRow.end_time || '21:30',
      bookingRow.net_payout_amount,
      bookingRow.city,
      `Booking #${bookingRow.id} otomatik takvim kilidi`,
      now
    );
  }

  notifyUser(db, {
    userId: bookingRow.performer_user_id,
    type: 'booking_confirmed',
    title: 'Güvence Ödemesi Alındı — Rezervasyon Kesinleşti',
    body: `${bookingRow.business_name} ile ${bookingRow.event_date} tarihli performansınız için ödeme güvenceye alındı.`,
    linkView: 'artist_dashboard',
    linkEntityId: bookingRow.id,
  });
}

export function createMarketplaceRouter(db: DbInstance): Router {
  const router = Router();

  // Create Listing (verified business/organizer/venue/admin only)
  router.post('/listings', requireAuth, requireVerified, (req: AuthedRequest, res) => {
    const biz = db
      .prepare('SELECT * FROM business_profiles WHERE user_id = ?')
      .get(req.user!.id) as any;

    if (!biz && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'İlan yayınlamak için doğrulanmış bir kurum/işletme profili gereklidir.' });
    }
    if (biz && (!biz.is_verified || biz.verification_status !== 'approved') && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'İlan yayınlayabilmek için işletme doğrulamanız onaylanmış olmalıdır.' });
    }

    const {
      title,
      description,
      discipline = 'Müzik',
      specialtyTags = [],
      eventType = 'Özel Sahne & Dinleti',
      genres = ['Klasik Müzik'],
      targetEnsembleType = 'Solo',
      requiredInstruments = ['Piyano'],
      performerCount = 1,
      durationMins = 60,
      eventDate,
      startTime = '20:00',
      endTime = '21:30',
      applicationDeadline,
      city,
      district = '',
      venueName,
      isOutdoor = false,
      repertoireExpectation = '',
      dressCode = 'Resmi / Sahne Kıyafeti',
      soundSystemProvided = true,
      transportationProvided = false,
      accommodationProvided = false,
      budgetAmount,
    } = req.body || {};

    if (!title || !description || !eventDate || !city || !venueName || !budgetAmount || Number(budgetAmount) <= 0) {
      return res.status(400).json({ error: 'Başlık, açıklama, tarih, şehir, mekân ve geçerli bütçe zorunludur.' });
    }

    const id = newId('list');
    const slug = `${slugify(title)}-${id.slice(-4)}`;
    const now = new Date().toISOString();
    const isAdmin = req.user!.activeRole === 'admin' || req.user!.activeRole === 'moderator';
    const status = isAdmin ? 'active' : 'pending_moderation';
    const targetBiz = biz || (db.prepare('SELECT * FROM business_profiles LIMIT 1').get() as any);

    db.prepare(`
      INSERT INTO listings (
        id, business_id, business_name, business_type, business_logo, business_verified,
        title, slug, description, discipline, specialty_tags_json, event_type, genres_json,
        target_ensemble_type, required_instruments_json, performer_count, duration_mins,
        event_date, start_time, end_time, application_deadline, city, district, venue_name,
        is_outdoor, repertoire_expectation, dress_code, sound_system_provided,
        transportation_provided, accommodation_provided, budget_amount, currency, status,
        is_replacement, applications_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TRY', ?, 0, 0, ?)
    `).run(
      id,
      targetBiz.id,
      targetBiz.business_name,
      targetBiz.business_type,
      targetBiz.logo_url,
      targetBiz.is_verified,
      String(title).trim(),
      slug,
      String(description).trim(),
      discipline,
      JSON.stringify(Array.isArray(specialtyTags) ? specialtyTags : []),
      eventType,
      JSON.stringify(Array.isArray(genres) ? genres : []),
      targetEnsembleType,
      JSON.stringify(Array.isArray(requiredInstruments) ? requiredInstruments : []),
      Number(performerCount),
      Number(durationMins),
      eventDate,
      startTime,
      endTime,
      applicationDeadline || eventDate,
      city,
      district,
      venueName,
      isOutdoor ? 1 : 0,
      repertoireExpectation,
      dressCode,
      soundSystemProvided ? 1 : 0,
      transportationProvided ? 1 : 0,
      accommodationProvided ? 1 : 0,
      Number(budgetAmount),
      status,
      now
    );

    if (status === 'pending_moderation') {
      notifyUser(db, {
        userId: 'user_admin',
        type: 'moderation_needed',
        title: 'Yeni İlan Moderasyon Onayı Bekliyor',
        body: `${targetBiz.business_name} tarafından açılan "${title}" ilanı onay bekliyor.`,
        linkView: 'admin_panel',
      });
    }

    logAudit(db, {
      userId: req.user!.id,
      action: 'CREATE_LISTING',
      resourceType: 'listing',
      resourceId: id,
      details: { status },
    });

    const created = db.prepare('SELECT * FROM listings WHERE id = ?').get(id);
    return res.status(201).json({ listing: mapListing(created) });
  });

  // 9.7 Explainable Smart Match for a Listing
  router.get('/listings/:id/smart-match', (req, res) => {
    const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'İlan bulunamadı.' });
    const listing = mapListing(row);

    const artistRows = db.prepare('SELECT * FROM individual_profiles WHERE is_verified = 1').all() as any[];
    const bookedSlots = db
      .prepare(`SELECT owner_id, slot_date, start_time, end_time FROM availability_slots WHERE slot_date = ? AND slot_kind IN ('booked', 'blocked')`)
      .all(listing.eventDate) as any[];

    const matches = artistRows
      .map((ar) => {
        const artist = mapIndividualProfile(ar);
        const hasConflict = bookedSlots.some(
          (s) =>
            s.owner_id === artist.id &&
            hasTimeConflict(
              { date: listing.eventDate, startTime: listing.startTime, endTime: listing.endTime },
              { date: s.slot_date, startTime: s.start_time, endTime: s.end_time }
            )
        );
        return explainArtistListingMatch(listing, artist, hasConflict);
      })
      .sort((a, b) => b.matchedCriteriaCount - a.matchedCriteriaCount)
      .slice(0, 6);

    return res.json({ matches });
  });

  // Submit Application (authenticated + verified performer)
  router.post('/applications', requireAuth, requireVerified, (req: AuthedRequest, res) => {
    const {
      listingId,
      applicantType = 'individual',
      applicantId,
      message,
      participatingMembers = [],
    } = req.body || {};

    if (!listingId || !message || !String(message).trim()) {
      return res.status(400).json({ error: 'İlan ve başvuru mesajı zorunludur.' });
    }

    const listingRow = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as any;
    if (!listingRow || listingRow.status !== 'active') {
      return res.status(404).json({ error: 'Başvuru yapılabilecek aktif ilan bulunamadı.' });
    }

    let profileName = `${req.user!.firstName} ${req.user!.lastName}`.trim();
    let profileAvatar = req.user!.avatarUrl;
    let profileRating = 5.0;
    let profileJobs = 0;
    let profileCancel = 0;
    let profileVerified = req.user!.isVerified;
    let resolvedApplicantId = applicantId;
    let instrumentsOrType = 'Sanatçı';
    let genres: string[] = ['Klasik Müzik'];

    if (applicantType === 'ensemble') {
      const ens = applicantId
        ? (db.prepare('SELECT * FROM ensembles WHERE id = ? AND leader_user_id = ?').get(applicantId, req.user!.id) as any)
        : (db.prepare('SELECT * FROM ensembles WHERE leader_user_id = ?').get(req.user!.id) as any);
      if (!ens) {
        return res.status(403).json({ error: 'Yalnızca yöneticisi olduğunuz topluluk adına başvurabilirsiniz.' });
      }
      resolvedApplicantId = ens.id;
      profileName = ens.name;
      profileAvatar = ens.avatar_url;
      profileRating = Number(ens.rating_avg || 5);
      profileJobs = Number(ens.completed_jobs_count || 0);
      profileCancel = Number(ens.cancellation_rate || 0);
      profileVerified = Boolean(ens.is_verified);
      instrumentsOrType = ens.ensemble_type;
      genres = parseJson(ens.genres_json, ['Oda Müziği']);
    } else {
      const ind = db.prepare('SELECT * FROM individual_profiles WHERE user_id = ?').get(req.user!.id) as any;
      if (!ind) {
        return res.status(403).json({ error: 'Başvuru yapabilmek için bireysel sanatçı profiliniz bulunmalıdır.' });
      }
      resolvedApplicantId = ind.id;
      profileName = ind.full_name;
      profileAvatar = ind.avatar_url;
      profileRating = Number(ind.rating_avg || 5);
      profileJobs = Number(ind.completed_jobs_count || 0);
      profileCancel = Number(ind.cancellation_rate || 0);
      profileVerified = Boolean(ind.is_verified);
      instrumentsOrType = `${ind.primary_instrument} (Solo)`;
      genres = parseJson(ind.genres_json, ['Klasik Müzik']);
    }

    // Check duplicate application
    const duplicate = db
      .prepare('SELECT id FROM applications WHERE listing_id = ? AND applicant_id = ?')
      .get(listingId, resolvedApplicantId);
    if (duplicate) {
      return res.status(409).json({ error: 'Bu ilana daha önce başvuru yaptınız.' });
    }

    // Conflict warning check
    const existingSlots = db
      .prepare(`SELECT * FROM availability_slots WHERE owner_id = ? AND slot_date = ? AND slot_kind IN ('booked', 'blocked')`)
      .all(resolvedApplicantId, listingRow.event_date) as any[];
    const hasConflict = existingSlots.some((s) =>
      hasTimeConflict(
        { date: listingRow.event_date, startTime: listingRow.start_time, endTime: listingRow.end_time },
        { date: s.slot_date, startTime: s.start_time, endTime: s.end_time }
      )
    );

    const id = newId('app');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO applications (
        id, listing_id, applicant_type, applicant_id, applicant_user_id, applicant_name,
        applicant_avatar, applicant_rating, applicant_completed_jobs, applicant_cancellation_rate,
        applicant_is_verified, instruments_or_type, genres_json, message,
        participating_members_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
    `).run(
      id,
      listingId,
      applicantType,
      resolvedApplicantId,
      req.user!.id,
      profileName,
      profileAvatar,
      profileRating,
      profileJobs,
      profileCancel,
      profileVerified ? 1 : 0,
      instrumentsOrType,
      JSON.stringify(genres),
      String(message).trim(),
      JSON.stringify(Array.isArray(participatingMembers) ? participatingMembers : []),
      now
    );

    db.prepare('UPDATE listings SET applications_count = applications_count + 1 WHERE id = ?').run(listingId);

    const biz = db.prepare('SELECT user_id FROM business_profiles WHERE id = ?').get(listingRow.business_id) as { user_id: string } | undefined;
    if (biz) {
      notifyUser(db, {
        userId: biz.user_id,
        type: 'new_application',
        title: 'İlanınıza Yeni Başvuru Geldi',
        body: `${profileName}, "${listingRow.title}" ilanına başvurdu.`,
        linkView: 'business_dashboard',
        linkEntityId: listingId,
      });
    }

    const created = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    return res.status(201).json({
      application: mapApplication(created),
      conflictWarning: hasConflict
        ? `${listingRow.event_date} tarihinde takviminizde başka bir rezervasyon/blokaj görünüyor.`
        : null,
    });
  });

  // Update Application Status (shortlist / reject / select -> creates Booking + Contract)
  router.patch('/applications/:id/status', requireAuth, (req: AuthedRequest, res) => {
    const appRow = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id) as any;
    if (!appRow) return res.status(404).json({ error: 'Başvuru bulunamadı.' });

    const listingRow = db.prepare('SELECT * FROM listings WHERE id = ?').get(appRow.listing_id) as any;
    const bizRow = db.prepare('SELECT * FROM business_profiles WHERE id = ?').get(listingRow.business_id) as any;

    if (!bizRow || (bizRow.user_id !== req.user!.id && req.user!.activeRole !== 'admin')) {
      return res.status(403).json({ error: 'Bu başvuruyu değerlendirme yetkiniz yok.' });
    }

    const { status } = req.body || {};
    if (!['shortlisted', 'rejected', 'selected'].includes(status)) {
      return res.status(400).json({ error: 'Geçersiz başvuru durumu.' });
    }

    db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, appRow.id);

    let createdBooking: any = null;
    let createdContract: any = null;

    if (status === 'selected') {
      // Reject other non-selected applications on the same listing
      db.prepare(`UPDATE applications SET status = 'rejected' WHERE listing_id = ? AND id != ?`).run(
        listingRow.id,
        appRow.id
      );
      db.prepare(`UPDATE listings SET status = 'assigned' WHERE id = ?`).run(listingRow.id);

      const settings = getPlatformSettings(db);
      const calc = calculateCommission(
        Number(listingRow.budget_amount),
        Number(settings.commissionRate),
        settings.commissionModel
      );

      const bookingId = newId('booking');
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO bookings (
          id, listing_id, listing_title, business_id, business_name, application_id,
          performer_type, performer_id, performer_user_id, performer_name, performer_avatar,
          event_date, start_time, end_time, venue_name, city, net_payout_amount,
          commission_amount, gross_amount, commission_model, commission_rate, status,
          performer_completed_at, employer_completed_at,
          contract_terms_accepted_by_performer, contract_terms_accepted_by_employer,
          payment_status, dispute_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'agreement_pending', NULL, NULL, 0, 1, 'unpaid', 'none', ?, ?)
      `).run(
        bookingId,
        listingRow.id,
        listingRow.title,
        bizRow.id,
        bizRow.business_name,
        appRow.id,
        appRow.applicant_type,
        appRow.applicant_id,
        appRow.applicant_user_id,
        appRow.applicant_name,
        appRow.applicant_avatar,
        listingRow.event_date,
        listingRow.start_time,
        listingRow.end_time,
        listingRow.venue_name,
        listingRow.city,
        calc.performerPayout,
        calc.commissionAmount,
        calc.grossAmount,
        calc.model,
        calc.commissionRate,
        now,
        now
      );

      const bkRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
      createContractAndProductionForBooking(db, bkRow);

      createdBooking = mapBooking(bkRow);
      createdContract = mapContract(db.prepare('SELECT * FROM contracts WHERE booking_id = ?').get(bookingId));

      notifyUser(db, {
        userId: appRow.applicant_user_id,
        type: 'application_selected',
        title: 'Başvurunuz Seçildi — Sözleşme Onayı Bekleniyor',
        body: `${bizRow.business_name}, "${listingRow.title}" ilanı için sizi seçti. Lütfen dijital sözleşmeyi onaylayın.`,
        linkView: appRow.applicant_type === 'ensemble' ? 'ensemble_dashboard' : 'artist_dashboard',
        linkEntityId: bookingId,
      });
    } else if (status === 'shortlisted') {
      notifyUser(db, {
        userId: appRow.applicant_user_id,
        type: 'application_shortlisted',
        title: 'Başvurunuz Kısa Listeye Alındı',
        body: `${bizRow.business_name}, "${listingRow.title}" ilanı için başvurunuzu kısa listeye aldı.`,
        linkView: 'artist_dashboard',
      });
    }

    logAudit(db, {
      userId: req.user!.id,
      action: 'UPDATE_APPLICATION_STATUS',
      resourceType: 'application',
      resourceId: appRow.id,
      details: { status },
    });

    const updatedApp = db.prepare('SELECT * FROM applications WHERE id = ?').get(appRow.id);
    return res.json({
      application: mapApplication(updatedApp),
      booking: createdBooking,
      contract: createdContract,
    });
  });

  // Offers & Counter-Offers
  router.post('/offers', requireAuth, (req: AuthedRequest, res) => {
    const { listingId, applicationId, performerId, performerType = 'individual', proposedAmount, scopeNotes = '' } = req.body || {};
    const listingRow = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as any;
    if (!listingRow) return res.status(404).json({ error: 'İlan bulunamadı.' });

    const bizRow = db.prepare('SELECT * FROM business_profiles WHERE id = ?').get(listingRow.business_id) as any;
    let performerUserId = '';
    let performerName = '';
    let resolvedPerformerId = performerId;

    if (applicationId) {
      const appRow = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId) as any;
      if (appRow) {
        performerUserId = appRow.applicant_user_id;
        performerName = appRow.applicant_name;
        resolvedPerformerId = appRow.applicant_id;
      }
    } else if (performerType === 'ensemble') {
      const ens = db.prepare('SELECT * FROM ensembles WHERE id = ?').get(performerId) as any;
      if (ens) {
        performerUserId = ens.leader_user_id;
        performerName = ens.name;
      }
    } else {
      const ind = db.prepare('SELECT * FROM individual_profiles WHERE id = ?').get(performerId) as any;
      if (ind) {
        performerUserId = ind.user_id;
        performerName = ind.full_name;
      }
    }

    if (!performerUserId) {
      return res.status(400).json({ error: 'Teklif gönderilecek sanatçı veya topluluk bulunamadı.' });
    }

    const isEmployer = bizRow && bizRow.user_id === req.user!.id;
    const isPerformer = performerUserId === req.user!.id;
    if (!isEmployer && !isPerformer && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Bu ilan için teklif başlatma yetkiniz yok.' });
    }

    const amount = Number(proposedAmount || listingRow.budget_amount);
    if (amount <= 0) return res.status(400).json({ error: 'Geçerli bir teklif tutarı giriniz.' });

    const settings = getPlatformSettings(db);
    const calc = calculateCommission(amount, Number(settings.commissionRate), settings.commissionModel);

    const offerId = newId('offer');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO offers (
        id, listing_id, listing_title, application_id, employer_user_id, business_id,
        performer_type, performer_id, performer_user_id, performer_name,
        proposed_amount, commission_model, commission_rate, net_payout_amount,
        commission_amount, gross_amount, event_date, start_time, end_time,
        expires_at, last_actor_user_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      offerId, listingRow.id, listingRow.title, applicationId || null,
      bizRow.user_id, bizRow.id, performerType, resolvedPerformerId, performerUserId, performerName,
      amount, calc.model, calc.commissionRate, calc.performerPayout,
      calc.commissionAmount, calc.grossAmount, listingRow.event_date,
      listingRow.start_time, listingRow.end_time, expiresAt, req.user!.id, now, now
    );

    db.prepare(`
      INSERT INTO offer_revisions (
        id, offer_id, actor_user_id, actor_role, proposed_amount, commission_model,
        commission_rate, net_payout_amount, commission_amount, gross_amount, scope_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId('orev'), offerId, req.user!.id, req.user!.activeRole, amount,
      calc.model, calc.commissionRate, calc.performerPayout, calc.commissionAmount,
      calc.grossAmount, scopeNotes || 'İlk teklif', now
    );

    const recipientUserId = isEmployer ? performerUserId : bizRow.user_id;
    notifyUser(db, {
      userId: recipientUserId,
      type: 'new_offer',
      title: 'Yeni Sahne Teklifi',
      body: `"${listingRow.title}" için ${amount} TRY tutarında teklif iletildi.`,
      linkView: isEmployer ? 'artist_dashboard' : 'business_dashboard',
    });

    const created = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId);
    return res.status(201).json({ offer: mapOffer(db, created) });
  });

  router.post('/offers/:id/counter', requireAuth, (req: AuthedRequest, res) => {
    const offerRow = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id) as any;
    if (!offerRow) return res.status(404).json({ error: 'Teklif bulunamadı.' });
    if (offerRow.employer_user_id !== req.user!.id && offerRow.performer_user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Bu teklife karşı teklif gönderemezsiniz.' });
    }
    if (['accepted', 'rejected', 'expired'].includes(offerRow.status)) {
      return res.status(400).json({ error: 'Sonuçlanmış teklife karşı teklif gönderilemez.' });
    }

    const { proposedAmount, scopeNotes = '' } = req.body || {};
    const amount = Number(proposedAmount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Geçerli tutar giriniz.' });

    const settings = getPlatformSettings(db);
    const calc = calculateCommission(amount, Number(settings.commissionRate), settings.commissionModel);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE offers SET
        proposed_amount = ?, commission_model = ?, commission_rate = ?,
        net_payout_amount = ?, commission_amount = ?, gross_amount = ?,
        last_actor_user_id = ?, status = 'countered', updated_at = ?
      WHERE id = ?
    `).run(
      amount, calc.model, calc.commissionRate, calc.performerPayout,
      calc.commissionAmount, calc.grossAmount, req.user!.id, now, offerRow.id
    );

    db.prepare(`
      INSERT INTO offer_revisions (
        id, offer_id, actor_user_id, actor_role, proposed_amount, commission_model,
        commission_rate, net_payout_amount, commission_amount, gross_amount, scope_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId('orev'), offerRow.id, req.user!.id, req.user!.activeRole, amount,
      calc.model, calc.commissionRate, calc.performerPayout, calc.commissionAmount,
      calc.grossAmount, scopeNotes || 'Karşı teklif', now
    );

    const recipient = offerRow.employer_user_id === req.user!.id ? offerRow.performer_user_id : offerRow.employer_user_id;
    notifyUser(db, {
      userId: recipient,
      type: 'counter_offer',
      title: 'Karşı Teklif Alındı',
      body: `"${offerRow.listing_title}" için ${amount} TRY tutarında karşı teklif gönderildi.`,
      linkView: offerRow.employer_user_id === req.user!.id ? 'artist_dashboard' : 'business_dashboard',
    });

    const updated = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerRow.id);
    return res.json({ offer: mapOffer(db, updated) });
  });

  router.post('/offers/:id/accept', requireAuth, (req: AuthedRequest, res) => {
    const offerRow = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id) as any;
    if (!offerRow) return res.status(404).json({ error: 'Teklif bulunamadı.' });
    if (offerRow.employer_user_id !== req.user!.id && offerRow.performer_user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Bu teklifi onaylama yetkiniz yok.' });
    }
    if (offerRow.last_actor_user_id === req.user!.id) {
      return res.status(400).json({ error: 'Kendi gönderdiğiniz son teklifi karşı taraf onaylamalıdır.' });
    }
    if (['accepted', 'rejected'].includes(offerRow.status)) {
      return res.status(400).json({ error: 'Bu teklif zaten sonuçlandırılmış.' });
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE offers SET status = 'accepted', updated_at = ? WHERE id = ?`).run(now, offerRow.id);

    const listingRow = db.prepare('SELECT * FROM listings WHERE id = ?').get(offerRow.listing_id) as any;
    const bizRow = db.prepare('SELECT * FROM business_profiles WHERE id = ?').get(offerRow.business_id) as any;
    const perfAvatar =
      offerRow.performer_type === 'ensemble'
        ? ((db.prepare('SELECT avatar_url FROM ensembles WHERE id = ?').get(offerRow.performer_id) as any)?.avatar_url || '/src/assets/images/ensemble_string_trio_1794440056146.jpg')
        : ((db.prepare('SELECT avatar_url FROM individual_profiles WHERE id = ?').get(offerRow.performer_id) as any)?.avatar_url || '/src/assets/images/artist_jazz_pianist_1794440057025.jpg');

    const bookingId = newId('booking');
    db.prepare(`
      INSERT INTO bookings (
        id, listing_id, listing_title, business_id, business_name, application_id,
        performer_type, performer_id, performer_user_id, performer_name, performer_avatar,
        event_date, start_time, end_time, venue_name, city, net_payout_amount,
        commission_amount, gross_amount, commission_model, commission_rate, status,
        contract_terms_accepted_by_performer, contract_terms_accepted_by_employer,
        payment_status, dispute_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'agreement_pending', ?, ?, 'unpaid', 'none', ?, ?)
    `).run(
      bookingId, offerRow.listing_id, offerRow.listing_title, offerRow.business_id,
      bizRow?.business_name || 'Kurum', offerRow.application_id || offerRow.id,
      offerRow.performer_type, offerRow.performer_id, offerRow.performer_user_id,
      offerRow.performer_name, perfAvatar, offerRow.event_date, offerRow.start_time,
      offerRow.end_time, listingRow?.venue_name || 'Belirtilen Mekân', listingRow?.city || 'İstanbul',
      offerRow.net_payout_amount, offerRow.commission_amount, offerRow.gross_amount,
      offerRow.commission_model, offerRow.commission_rate,
      req.user!.id === offerRow.performer_user_id ? 1 : 0,
      req.user!.id === offerRow.employer_user_id ? 1 : 0,
      now, now
    );

    if (listingRow) {
      db.prepare(`UPDATE listings SET status = 'assigned' WHERE id = ?`).run(listingRow.id);
    }

    const bkRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    createContractAndProductionForBooking(db, bkRow);

    const contractRow = db.prepare('SELECT * FROM contracts WHERE booking_id = ?').get(bookingId);
    const updatedOffer = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerRow.id);
    return res.json({
      offer: mapOffer(db, updatedOffer),
      booking: mapBooking(bkRow),
      contract: mapContract(contractRow),
    });
  });

  router.post('/offers/:id/reject', requireAuth, (req: AuthedRequest, res) => {
    const offerRow = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id) as any;
    if (!offerRow) return res.status(404).json({ error: 'Teklif bulunamadı.' });
    if (offerRow.employer_user_id !== req.user!.id && offerRow.performer_user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Yetkisiz işlem.' });
    }
    db.prepare(`UPDATE offers SET status = 'rejected', updated_at = ? WHERE id = ?`).run(
      new Date().toISOString(),
      offerRow.id
    );
    const updated = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerRow.id);
    return res.json({ offer: mapOffer(db, updated) });
  });

  // Accept Digital Contract on a Booking
  router.post('/bookings/:id/accept-contract', requireAuth, (req: AuthedRequest, res) => {
    const bk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
    if (!bk) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });

    const biz = db.prepare('SELECT user_id FROM business_profiles WHERE id = ?').get(bk.business_id) as { user_id: string } | undefined;
    const isEmployer = biz?.user_id === req.user!.id;
    const isPerformer = bk.performer_user_id === req.user!.id;

    if (!isEmployer && !isPerformer && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Bu sözleşmeyi onaylama yetkiniz yok.' });
    }

    const now = new Date().toISOString();
    if (isEmployer) {
      db.prepare('UPDATE bookings SET contract_terms_accepted_by_employer = 1, updated_at = ? WHERE id = ?').run(now, bk.id);
      db.prepare('UPDATE contracts SET employer_accepted_at = ? WHERE booking_id = ?').run(now, bk.id);
    }
    if (isPerformer) {
      db.prepare('UPDATE bookings SET contract_terms_accepted_by_performer = 1, updated_at = ? WHERE id = ?').run(now, bk.id);
      db.prepare('UPDATE contracts SET performer_accepted_at = ? WHERE booking_id = ?').run(now, bk.id);
    }

    const refreshed = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bk.id) as any;
    if (
      refreshed.contract_terms_accepted_by_employer &&
      refreshed.contract_terms_accepted_by_performer &&
      refreshed.status === 'agreement_pending'
    ) {
      db.prepare(`UPDATE bookings SET status = 'payment_pending', updated_at = ? WHERE id = ?`).run(now, bk.id);
      if (biz) {
        notifyUser(db, {
          userId: biz.user_id,
          type: 'payment_ready',
          title: 'Sözleşme Onaylandı — Güvence Ödemesi Bekleniyor',
          body: `${bk.performer_name} dijital sözleşmeyi onayladı. Sandbox güvence ödemesini tamamlayabilirsiniz.`,
          linkView: 'business_dashboard',
          linkEntityId: bk.id,
        });
      }
    }

    const finalBk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bk.id);
    const finalContract = db.prepare('SELECT * FROM contracts WHERE booking_id = ?').get(bk.id);
    return res.json({ booking: mapBooking(finalBk), contract: finalContract ? mapContract(finalContract) : null });
  });

  // Escrow Checkout (iyzico Sandbox / Production Adapter)
  router.post('/bookings/:id/checkout', requireAuth, (req: AuthedRequest, res) => {
    const bk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
    if (!bk) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });

    const biz = db.prepare('SELECT user_id FROM business_profiles WHERE id = ?').get(bk.business_id) as { user_id: string } | undefined;
    if (!biz || (biz.user_id !== req.user!.id && req.user!.activeRole !== 'admin')) {
      return res.status(403).json({ error: 'Güvence ödemesini yalnızca ilan sahibi kurum başlatabilir.' });
    }
    if (!bk.contract_terms_accepted_by_performer || !bk.contract_terms_accepted_by_employer) {
      return res.status(400).json({ error: 'Ödeme öncesi her iki taraf da dijital sözleşmeyi onaylamalıdır.' });
    }
    if (bk.payment_status === 'held_sandbox' || bk.payment_status === 'held_live' || bk.payment_status === 'released') {
      return res.status(409).json({ error: 'Bu rezervasyonun güvence ödemesi zaten alınmıştır.' });
    }

    const checkout = initializeEscrowCheckout({
      bookingId: bk.id,
      amount: Number(bk.gross_amount),
      buyerEmail: req.user!.email,
      buyerName: bk.business_name,
    });

    const autoCompleteSandbox = req.body?.confirmSandboxNow !== false && checkout.mode === 'sandbox';
    const webhookPayload = JSON.stringify({
      bookingId: bk.id,
      providerRef: checkout.providerRef,
      status: 'success',
    });
    const webhookSignature = signWebhookPayload(webhookPayload);

    if (autoCompleteSandbox) {
      finalizePaymentHold(db, bk, checkout.provider, checkout.providerRef, checkout.mode);
    }

    logAudit(db, {
      userId: req.user!.id,
      action: 'ESCROW_CHECKOUT_INIT',
      resourceType: 'booking',
      resourceId: bk.id,
      details: { mode: checkout.mode, providerRef: checkout.providerRef, autoConfirmed: autoCompleteSandbox },
    });

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bk.id);
    return res.json({
      checkout,
      webhookSignature: checkout.mode === 'sandbox' ? webhookSignature : undefined,
      booking: mapBooking(updated),
    });
  });

  // Payment Webhook Verification
  router.post('/payments/iyzico/webhook', (req, res) => {
    const signature = req.headers['x-iyzico-signature'] as string | undefined;
    const rawBody = JSON.stringify(req.body || {});
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Geçersiz webhook imzası.' });
    }

    const { bookingId, providerRef, status } = req.body || {};
    if (!bookingId || status !== 'success') {
      return res.status(400).json({ error: 'Geçersiz ödeme bildirimi.' });
    }

    const bk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    if (!bk) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });

    const mode = getPaymentMode();
    finalizePaymentHold(db, bk, mode === 'production' ? 'iyzico_live' : 'iyzico_sandbox', providerRef || `wh_${bk.id}`, mode);
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bk.id);
    return res.json({ received: true, booking: mapBooking(updated) });
  });

  // Dual-Confirmation Completion (Performer + Employer MUST BOTH confirm before escrow release!)
  router.post('/bookings/:id/complete', requireAuth, (req: AuthedRequest, res) => {
    const bk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
    if (!bk) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });

    const biz = db.prepare('SELECT user_id FROM business_profiles WHERE id = ?').get(bk.business_id) as { user_id: string } | undefined;
    const isEmployer = biz?.user_id === req.user!.id;
    const isPerformer = bk.performer_user_id === req.user!.id;

    if (!isEmployer && !isPerformer) {
      return res.status(403).json({ error: 'Tamamlanma onayını yalnızca rezervasyonun tarafları verebilir.' });
    }
    if (bk.dispute_status === 'open' || bk.status === 'in_dispute') {
      return res.status(409).json({ error: 'Açık uyuşmazlık kaydı varken hakediş serbest bırakılamaz.' });
    }
    if (!['confirmed', 'performer_completed', 'employer_completed'].includes(bk.status)) {
      return res.status(400).json({ error: 'Bu rezervasyon şu anda tamamlanma onayı aşamasında değil.' });
    }

    const now = new Date().toISOString();
    let performerCompletedAt = bk.performer_completed_at;
    let employerCompletedAt = bk.employer_completed_at;

    if (isPerformer && !performerCompletedAt) {
      performerCompletedAt = now;
      db.prepare('UPDATE bookings SET performer_completed_at = ?, updated_at = ? WHERE id = ?').run(now, now, bk.id);
    }
    if (isEmployer && !employerCompletedAt) {
      employerCompletedAt = now;
      db.prepare('UPDATE bookings SET employer_completed_at = ?, updated_at = ? WHERE id = ?').run(now, now, bk.id);
    }

    const canRelease = canReleaseEscrowPayout({
      performerCompletedAt,
      employerCompletedAt,
      disputeStatus: bk.dispute_status,
      paymentStatus: bk.payment_status,
    });

    if (canRelease) {
      db.prepare(`
        UPDATE bookings SET
          status = 'completed',
          payment_status = 'released',
          updated_at = ?
        WHERE id = ?
      `).run(now, bk.id);

      const mode = getPaymentMode();
      db.prepare(`
        INSERT INTO financial_ledger (
          id, booking_id, entry_type, amount, currency, provider, provider_ref, mode, notes, created_at
        ) VALUES (?, ?, 'commission_accrual', ?, 'TRY', 'sanatsahnede_platform', ?, ?, ?, ?)
      `).run(newId('led'), bk.id, bk.commission_amount, `comm_${bk.id}`, mode, 'Platform hizmet komisyonu', now);

      db.prepare(`
        INSERT INTO financial_ledger (
          id, booking_id, entry_type, amount, currency, provider, provider_ref, mode, notes, created_at
        ) VALUES (?, ?, 'payout_release', ?, 'TRY', ?, ?, ?, ?, ?)
      `).run(
        newId('led'),
        bk.id,
        bk.net_payout_amount,
        mode === 'production' ? 'iyzico_live' : 'iyzico_sandbox',
        `rel_${bk.id}`,
        mode,
        'Çift taraflı onay sonrası icracı hakediş aktarımı',
        now
      );

      // Increment completed counts & create verified Career Passport record
      db.prepare('UPDATE business_profiles SET completed_bookings_count = completed_bookings_count + 1 WHERE id = ?').run(bk.business_id);
      if (bk.performer_type === 'ensemble') {
        db.prepare('UPDATE ensembles SET completed_jobs_count = completed_jobs_count + 1 WHERE id = ?').run(bk.performer_id);
      } else {
        db.prepare('UPDATE individual_profiles SET completed_jobs_count = completed_jobs_count + 1 WHERE id = ?').run(bk.performer_id);
      }

      db.prepare(`
        INSERT INTO career_records (
          id, artist_id, user_id, title, organization_name, venue_name, role_title,
          event_date, source_type, source_id, is_verified_record, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'booking', ?, 1, ?)
      `).run(
        newId('car'),
        bk.performer_id,
        bk.performer_user_id,
        bk.listing_title,
        bk.business_name,
        bk.venue_name,
        bk.performer_type === 'ensemble' ? 'Topluluk Performansı' : 'Solo İcracı',
        bk.event_date,
        bk.id,
        now
      );

      notifyUser(db, {
        userId: bk.performer_user_id,
        type: 'payout_released',
        title: 'Hakediş Serbest Bırakıldı',
        body: `"${bk.listing_title}" performansı çift taraflı onaylandı; ${bk.net_payout_amount} TRY hakediş aktarımı (${mode}) kaydedildi.`,
        linkView: 'artist_dashboard',
        linkEntityId: bk.id,
      });
    } else {
      const nextStatus = performerCompletedAt ? 'performer_completed' : 'employer_completed';
      db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run(nextStatus, now, bk.id);
      const otherUserId = isPerformer ? biz?.user_id : bk.performer_user_id;
      if (otherUserId) {
        notifyUser(db, {
          userId: otherUserId,
          type: 'completion_waiting',
          title: 'Karşı Taraf Tamamlanma Onayı Verdi',
          body: `"${bk.listing_title}" için hakediş aktarımının tamamlanması adına sizin de onayınız bekleniyor.`,
          linkView: isPerformer ? 'business_dashboard' : 'artist_dashboard',
          linkEntityId: bk.id,
        });
      }
    }

    logAudit(db, {
      userId: req.user!.id,
      action: canRelease ? 'BOOKING_DUAL_CONFIRMED_RELEASED' : 'BOOKING_PARTIAL_CONFIRM',
      resourceType: 'booking',
      resourceId: bk.id,
    });

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bk.id);
    return res.json({ booking: mapBooking(updated), payoutReleased: canRelease });
  });

  // Cancel Booking
  router.post('/bookings/:id/cancel', requireAuth, (req: AuthedRequest, res) => {
    const bk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
    if (!bk) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });

    const biz = db.prepare('SELECT user_id FROM business_profiles WHERE id = ?').get(bk.business_id) as { user_id: string } | undefined;
    const isEmployer = biz?.user_id === req.user!.id;
    const isPerformer = bk.performer_user_id === req.user!.id;
    const isAdmin = req.user!.activeRole === 'admin';

    if (!isEmployer && !isPerformer && !isAdmin) {
      return res.status(403).json({ error: 'Yetkisiz işlem.' });
    }
    if (bk.status === 'completed' || bk.status === 'cancelled') {
      return res.status(400).json({ error: 'Tamamlanmış veya iptal edilmiş rezervasyon iptal edilemez.' });
    }

    const now = new Date().toISOString();
    const cancelledByRole = isAdmin ? 'admin' : isEmployer ? 'employer' : 'performer';
    const reason = String(req.body?.reason || 'Belirtilen operasyonel neden').trim();
    const hadEscrowHold = bk.payment_status === 'held_sandbox' || bk.payment_status === 'held_live';

    db.prepare(`
      UPDATE bookings SET
        status = 'cancelled',
        payment_status = ?,
        cancellation_reason = ?,
        cancelled_by_role = ?,
        updated_at = ?
      WHERE id = ?
    `).run(hadEscrowHold ? 'refunded' : bk.payment_status, reason, cancelledByRole, now, bk.id);

    if (hadEscrowHold) {
      const mode = getPaymentMode();
      db.prepare(`
        INSERT INTO financial_ledger (
          id, booking_id, entry_type, amount, currency, provider, provider_ref, mode, notes, created_at
        ) VALUES (?, ?, 'refund', ?, 'TRY', ?, ?, ?, ?, ?)
      `).run(
        newId('led'),
        bk.id,
        bk.gross_amount,
        bk.payment_provider || 'iyzico_sandbox',
        `ref_${bk.id}`,
        mode,
        `İptal nedeniyle iade (${cancelledByRole}): ${reason}`,
        now
      );
    }

    if (cancelledByRole === 'performer') {
      const totalConfirmed = (
        db.prepare('SELECT COUNT(*) as cnt FROM bookings WHERE performer_id = ?').get(bk.performer_id) as { cnt: number }
      ).cnt;
      const cancelledCount = (
        db.prepare(`SELECT COUNT(*) as cnt FROM bookings WHERE performer_id = ? AND cancelled_by_role = 'performer'`).get(bk.performer_id) as { cnt: number }
      ).cnt;
      const newRate = calculateCancellationRate(cancelledCount, totalConfirmed);
      if (bk.performer_type === 'ensemble') {
        db.prepare('UPDATE ensembles SET cancellation_rate = ? WHERE id = ?').run(newRate, bk.performer_id);
      } else {
        db.prepare('UPDATE individual_profiles SET cancellation_rate = ? WHERE id = ?').run(newRate, bk.performer_id);
      }
    }

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bk.id);
    return res.json({ booking: mapBooking(updated) });
  });

  // Emergency Replacement Listing
  router.post('/bookings/:id/emergency-replacement', requireAuth, (req: AuthedRequest, res) => {
    const bk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
    if (!bk) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });
    const origListing = db.prepare('SELECT * FROM listings WHERE id = ?').get(bk.listing_id) as any;
    if (!origListing) return res.status(404).json({ error: 'Orijinal ilan bulunamadı.' });

    const biz = db.prepare('SELECT * FROM business_profiles WHERE id = ?').get(bk.business_id) as any;
    if (biz?.user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Acil yedek ilanını yalnızca kurum açabilir.' });
    }

    const id = newId('list_rep');
    const now = new Date().toISOString();
    const urgentReason = String(req.body?.urgentReason || 'Son dakika mücbir sebep nedeniyle acil icracı ihtiyacı').trim();
    db.prepare(`
      INSERT INTO listings (
        id, business_id, business_name, business_type, business_logo, business_verified,
        title, slug, description, discipline, specialty_tags_json, event_type, genres_json,
        target_ensemble_type, required_instruments_json, performer_count, duration_mins,
        event_date, start_time, end_time, application_deadline, city, district, venue_name,
        is_outdoor, repertoire_expectation, dress_code, sound_system_provided,
        transportation_provided, accommodation_provided, budget_amount, currency, status,
        is_replacement, original_listing_id, urgent_reason, applications_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TRY', 'active', 1, ?, ?, 0, ?)
    `).run(
      id, origListing.business_id, origListing.business_name, origListing.business_type,
      origListing.business_logo, origListing.business_verified,
      `[ACİL YEDEK] ${origListing.title}`,
      `${origListing.slug}-yedek-${id.slice(-4)}`,
      origListing.description, origListing.discipline, origListing.specialty_tags_json,
      origListing.event_type, origListing.genres_json, origListing.target_ensemble_type,
      origListing.required_instruments_json, origListing.performer_count, origListing.duration_mins,
      origListing.event_date, origListing.start_time, origListing.end_time,
      origListing.event_date, origListing.city, origListing.district, origListing.venue_name,
      origListing.is_outdoor, origListing.repertoire_expectation, origListing.dress_code,
      origListing.sound_system_provided, origListing.transportation_provided, origListing.accommodation_provided,
      origListing.budget_amount, origListing.id, urgentReason, now
    );

    const created = db.prepare('SELECT * FROM listings WHERE id = ?').get(id);
    return res.status(201).json({ listing: mapListing(created) });
  });

  // Open Dispute (freezes payout)
  router.post('/bookings/:id/dispute', requireAuth, (req: AuthedRequest, res) => {
    const bk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
    if (!bk) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });

    const biz = db.prepare('SELECT user_id FROM business_profiles WHERE id = ?').get(bk.business_id) as { user_id: string } | undefined;
    if (biz?.user_id !== req.user!.id && bk.performer_user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Uyuşmazlık kaydını yalnızca rezervasyon tarafları açabilir.' });
    }

    const { reason, evidenceNotes = '' } = req.body || {};
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Uyuşmazlık nedeni belirtilmelidir.' });
    }

    const id = newId('disp');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO disputes (id, booking_id, opened_by_user_id, opened_by_role, reason, evidence_notes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(id, bk.id, req.user!.id, req.user!.activeRole, String(reason).trim(), evidenceNotes, now, now);

    db.prepare(`UPDATE bookings SET status = 'in_dispute', dispute_status = 'open', updated_at = ? WHERE id = ?`).run(now, bk.id);

    notifyUser(db, {
      userId: 'user_admin',
      type: 'dispute_opened',
      title: 'Yeni Uyuşmazlık Kaydı Açıldı',
      body: `"${bk.listing_title}" rezervasyonu için uyuşmazlık bildirildi; hakediş donduruldu.`,
      linkView: 'admin_panel',
    });

    const disputeRow = db.prepare('SELECT * FROM disputes WHERE id = ?').get(id);
    const updatedBk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bk.id);
    return res.status(201).json({ dispute: mapDispute(disputeRow), booking: mapBooking(updatedBk) });
  });

  // Verified Review (Strictly on completed bookings)
  router.post('/bookings/:id/reviews', requireAuth, (req: AuthedRequest, res) => {
    const bk = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
    if (!bk) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });
    if (bk.status !== 'completed') {
      return res.status(400).json({ error: 'Yalnızca tamamlanmış (completed) rezervasyonlar için değerlendirme yazılabilir.' });
    }

    const biz = db.prepare('SELECT user_id FROM business_profiles WHERE id = ?').get(bk.business_id) as { user_id: string } | undefined;
    const isEmployer = biz?.user_id === req.user!.id;
    const isPerformer = bk.performer_user_id === req.user!.id;
    if (!isEmployer && !isPerformer) {
      return res.status(403).json({ error: 'Bu rezervasyonu değerlendirme yetkiniz yok.' });
    }

    const existing = db
      .prepare('SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ?')
      .get(bk.id, req.user!.id);
    if (existing) {
      return res.status(409).json({ error: 'Bu rezervasyon için zaten değerlendirme yaptınız.' });
    }

    const {
      scoreOverall = 5,
      scoreCommunication = 5,
      scoreProfessionalism = 5,
      scoreQuality = 5,
      comment,
    } = req.body || {};

    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ error: 'Değerlendirme yorumu boş bırakılamaz.' });
    }

    const id = newId('rev');
    const now = new Date().toISOString();
    const reviewerName = isEmployer ? bk.business_name : bk.performer_name;
    const reviewerRole = isEmployer ? 'employer' : 'performer';
    const targetId = isEmployer ? bk.performer_id : bk.business_id;
    const targetName = isEmployer ? bk.performer_name : bk.business_name;

    db.prepare(`
      INSERT INTO reviews (
        id, booking_id, reviewer_id, reviewer_name, reviewer_role,
        target_id, target_name, score_overall, score_communication,
        score_professionalism, score_quality, comment, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, bk.id, req.user!.id, reviewerName, reviewerRole, targetId, targetName,
      Number(scoreOverall), Number(scoreCommunication), Number(scoreProfessionalism),
      Number(scoreQuality), String(comment).trim(), now
    );

    const stats = db
      .prepare('SELECT AVG(score_overall) as avg_score, COUNT(*) as cnt FROM reviews WHERE target_id = ?')
      .get(targetId) as { avg_score: number; cnt: number };

    if (isEmployer) {
      if (bk.performer_type === 'ensemble') {
        db.prepare('UPDATE ensembles SET rating_avg = ?, rating_count = ? WHERE id = ?').run(
          Math.round(stats.avg_score * 100) / 100, stats.cnt, targetId
        );
      } else {
        db.prepare('UPDATE individual_profiles SET rating_avg = ?, rating_count = ? WHERE id = ?').run(
          Math.round(stats.avg_score * 100) / 100, stats.cnt, targetId
        );
      }
    } else {
      db.prepare('UPDATE business_profiles SET rating_avg = ?, rating_count = ? WHERE id = ?').run(
        Math.round(stats.avg_score * 100) / 100, stats.cnt, targetId
      );
    }

    const created = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
    return res.status(201).json({ review: mapReview(created) });
  });

  return router;
}
