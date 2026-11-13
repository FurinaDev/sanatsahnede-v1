import { DbInstance } from './database';
import { hashPassword, newId } from '../utils/crypto';
import {
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_INDIVIDUAL_PROFILES,
  INITIAL_ENSEMBLES,
  INITIAL_BUSINESS_PROFILES,
  INITIAL_LISTINGS,
  INITIAL_APPLICATIONS,
  INITIAL_BOOKINGS,
  INITIAL_REVIEWS,
  INITIAL_VERIFICATIONS,
  INITIAL_EVENTS,
} from '../../src/data/seedData';
import { RoleType } from '../../src/types';

export function seedDatabase(db: DbInstance, force = false): void {
  const existingCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
  if (existingCount > 0 && !force) {
    return;
  }

  if (force) {
    const tables = [
      'sessions', 'audit_logs', 'notifications', 'messages', 'conversations',
      'career_records', 'artist_portfolios', 'user_bookmarks',
      'opportunity_applications', 'opportunities', 'project_applications', 'projects',
      'production_workspaces', 'technical_quotes', 'technical_requests',
      'service_packages', 'equipment_inventory', 'technical_providers',
      'availability_slots', 'venue_spaces', 'venues', 'cultural_programs',
      'originals_programs', 'contact_messages', 'reviews', 'financial_ledger',
      'disputes', 'contracts', 'bookings', 'offer_revisions', 'offers',
      'applications', 'listings', 'verification_requests', 'events',
      'ensemble_members', 'ensembles', 'individual_profiles', 'business_profiles',
      'organization_members', 'organizations', 'feature_flags', 'platform_settings',
      'users',
    ];
    db.exec('PRAGMA foreign_keys = OFF;');
    for (const t of tables) {
      db.exec(`DELETE FROM ${t};`);
    }
    db.exec('PRAGMA foreign_keys = ON;');
  }

  const demoPasswordHash = hashPassword('DemoSanat123!');
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    // 1. Platform Settings
    const upsertSetting = db.prepare(
      'INSERT OR REPLACE INTO platform_settings (setting_key, setting_value) VALUES (?, ?)'
    );
    upsertSetting.run('settings', JSON.stringify(INITIAL_SETTINGS));

    // 2. Users (INITIAL_USERS + secondary profile owners + specialized role demo accounts)
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (
        id, email, password_hash, first_name, last_name, phone, avatar_url,
        roles_json, active_role, active_organization_id, is_verified,
        email_verified, phone_verified, kyc_status, is_demo, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of INITIAL_USERS) {
      insertUser.run(
        u.id,
        u.email.toLowerCase(),
        demoPasswordHash,
        u.firstName,
        u.lastName,
        u.phone,
        u.avatarUrl,
        JSON.stringify(u.roles),
        u.activeRole,
        u.id === 'user_hotel_mgr' ? 'org_grand_bosphorus' : null,
        u.isVerified ? 1 : 0,
        1,
        1,
        u.isVerified ? 'approved' : 'unsubmitted',
        1,
        'active',
        u.createdAt
      );
    }

    // Extra demo role users for new ecosystem workspaces
    const extraRoleUsers: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      avatarUrl: string;
      roles: RoleType[];
      activeRole: RoleType;
      orgId?: string | null;
      verified?: boolean;
    }> = [
      {
        id: 'user_venue_akm',
        email: 'sahne@kadikoyakustik.com',
        firstName: 'Hakan',
        lastName: 'Yılmaz',
        phone: '+90 532 410 20 30',
        avatarUrl: '/src/assets/images/venue_cultural_foundation_1794582678466.jpg',
        roles: ['venue_manager', 'business_owner'],
        activeRole: 'venue_manager',
        verified: true,
      },
      {
        id: 'user_tech_pro',
        email: 'teknik@sesvesahne.com',
        firstName: 'Murat',
        lastName: 'Şahin',
        phone: '+90 532 710 44 55',
        avatarUrl: '/src/assets/images/hero_culture_music_1794440056664.jpg',
        roles: ['technical_provider'],
        activeRole: 'technical_provider',
        verified: true,
      },
      {
        id: 'user_organizer_fest',
        email: 'festival@istanbuloda.org',
        firstName: 'Elif',
        lastName: 'Karahan',
        phone: '+90 533 880 12 19',
        avatarUrl: '/src/assets/images/venue_grand_hotel_1794440055758.jpg',
        roles: ['organizer', 'business_owner'],
        activeRole: 'organizer',
        orgId: 'org_moda_vakfi',
        verified: true,
      },
      {
        id: 'user_audience_ece',
        email: 'izleyici@sanatsever.com',
        firstName: 'Ece',
        lastName: 'Demirtaş',
        phone: '+90 536 300 40 50',
        avatarUrl: '/src/assets/images/artist_cellist_portrait_1794582676514.jpg',
        roles: ['audience'],
        activeRole: 'audience',
        verified: false,
      },
      {
        id: 'user_moderator',
        email: 'moderator@sanatsahnede.com',
        firstName: 'Cansu',
        lastName: 'Aydın',
        phone: '+90 530 500 60 70',
        avatarUrl: '/src/assets/images/artist_guitar_vocalist_1794582675464.jpg',
        roles: ['moderator', 'verification_officer'],
        activeRole: 'moderator',
        verified: true,
      },
    ];

    for (const eu of extraRoleUsers) {
      insertUser.run(
        eu.id,
        eu.email.toLowerCase(),
        demoPasswordHash,
        eu.firstName,
        eu.lastName,
        eu.phone,
        eu.avatarUrl,
        JSON.stringify(eu.roles),
        eu.activeRole,
        eu.orgId ?? null,
        eu.verified ? 1 : 0,
        1,
        1,
        eu.verified ? 'approved' : 'unsubmitted',
        1,
        'active',
        now
      );
    }

    // Secondary user accounts corresponding to seed artists, ensembles, businesses & pending verifications
    for (const a of INITIAL_INDIVIDUAL_PROFILES) {
      const parts = a.fullName.split(' ');
      insertUser.run(
        a.userId,
        `${a.slug.replace(/-/g, '.')}@demo.sanatsahnede.com`,
        demoPasswordHash,
        parts[0] || a.fullName,
        parts.slice(1).join(' '),
        '+90 532 000 00 00',
        a.avatarUrl,
        JSON.stringify(['artist']),
        'artist',
        null,
        a.isVerified ? 1 : 0,
        1,
        1,
        a.isVerified ? 'approved' : 'pending',
        1,
        'active',
        a.createdAt
      );
    }

    for (const e of INITIAL_ENSEMBLES) {
      insertUser.run(
        e.leaderUserId,
        `${e.slug.replace(/-/g, '.')}@demo.sanatsahnede.com`,
        demoPasswordHash,
        e.name,
        '',
        '+90 532 000 00 01',
        e.avatarUrl,
        JSON.stringify(['ensemble_leader', 'artist']),
        'ensemble_leader',
        null,
        e.isVerified ? 1 : 0,
        1,
        1,
        e.isVerified ? 'approved' : 'pending',
        1,
        'active',
        e.createdAt
      );
    }

    for (const b of INITIAL_BUSINESS_PROFILES) {
      insertUser.run(
        b.userId,
        b.email.toLowerCase(),
        demoPasswordHash,
        b.businessName,
        '',
        b.phone,
        b.logoUrl,
        JSON.stringify(['business_owner']),
        'business_owner',
        b.id === 'biz_grand_bosphorus' ? 'org_grand_bosphorus' : b.id === 'biz_kadikoy_art' ? 'org_moda_vakfi' : null,
        b.isVerified ? 1 : 0,
        1,
        1,
        b.isVerified ? 'approved' : 'pending',
        1,
        'active',
        b.createdAt
      );
    }

    insertUser.run(
      'user_guitar_cem',
      'cemre.aksoy.gitar@demo.sanatsahnede.com',
      demoPasswordHash,
      'Cemre',
      'Aksoy',
      '+90 538 111 44 55',
      '/src/assets/images/artist_guitar_vocalist_1794582675464.jpg',
      JSON.stringify(['artist']),
      'artist',
      null,
      0,
      1,
      1,
      'pending',
      1,
      'active',
      '2026-11-11T08:15:00Z'
    );

    // 3. Organizations & Members (Culture Desk 9.11)
    const insertOrg = db.prepare(`
      INSERT OR IGNORE INTO organizations (id, name, org_type, owner_user_id, city, tax_number, is_verified, managed_service_enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertOrg.run('org_grand_bosphorus', 'The Grand Bosphorus Hotel & Kültür Grup', 'Otel ve Konaklama', 'user_hotel_mgr', 'İstanbul', '3960458912', 1, 1, '2026-01-15T09:00:00Z');
    insertOrg.run('org_moda_vakfi', 'Moda Kültür ve Sanat Vakfı', 'Kültür Merkezi', 'user_organizer_fest', 'İstanbul', '6210349811', 1, 0, '2026-02-01T10:00:00Z');

    const insertOrgMember = db.prepare(`
      INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, user_name, email, role_title, permissions_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertOrgMember.run('orgm_1', 'org_grand_bosphorus', 'user_hotel_mgr', 'Deniz Kaya', 'etkinlik@grandbosphorus.com', 'Kültür & Etkinlik Direktörü', JSON.stringify(['manage_listings', 'approve_bookings', 'manage_budget', 'manage_staff']), 'active', '2026-01-15T09:00:00Z');
    insertOrgMember.run('orgm_2', 'org_moda_vakfi', 'user_organizer_fest', 'Elif Karahan', 'festival@istanbuloda.org', 'Program Koordinatörü', JSON.stringify(['manage_listings', 'manage_programs', 'approve_bookings']), 'active', '2026-02-01T10:00:00Z');

    // 4. Individual Profiles
    const insertInd = db.prepare(`
      INSERT OR IGNORE INTO individual_profiles (
        id, user_id, slug, full_name, stage_name, title, discipline, specialty_tags_json,
        bio_short, bio_long, city, district, primary_instrument, instruments_json, genres_json,
        education, experience_years, repertoire_json, video_urls_json, audio_samples_json,
        cv_url, avatar_url, cover_url, website, social_links_json, is_verified,
        verification_status, verification_doc_url, rating_avg, rating_count,
        completed_jobs_count, cancellation_rate, is_recommended, recommendation_period,
        recommendation_badge, educations_json, experiences_json, media_items_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const a of INITIAL_INDIVIDUAL_PROFILES) {
      insertInd.run(
        a.id, a.userId, a.slug, a.fullName, a.stageName ?? null, a.title,
        a.discipline ?? 'Müzik', JSON.stringify(a.specialtyTags ?? []),
        a.bioShort, a.bioLong, a.city, a.district, a.primaryInstrument,
        JSON.stringify(a.instruments), JSON.stringify(a.genres), a.education,
        a.experienceYears, JSON.stringify(a.repertoire), JSON.stringify(a.videoUrls),
        JSON.stringify(a.audioSamples), a.cvUrl ?? null, a.avatarUrl, a.coverUrl ?? null,
        a.website ?? null, JSON.stringify(a.socialLinks ?? {}),
        a.isVerified ? 1 : 0, a.verificationStatus, a.verificationDocUrl ?? null,
        a.ratingAvg, a.ratingCount, a.completedJobsCount, a.cancellationRate,
        a.isRecommended ? 1 : 0, a.recommendationPeriod ?? null, a.recommendationBadge ?? null,
        JSON.stringify(a.educations ?? []), JSON.stringify(a.experiences ?? []),
        JSON.stringify(a.mediaItems ?? []), a.createdAt
      );
    }

    // 5. Ensembles & Members
    const insertEns = db.prepare(`
      INSERT OR IGNORE INTO ensembles (
        id, leader_user_id, payout_responsible_user_id, name, slug, discipline, specialty_tags_json,
        ensemble_type, bio, founded_year, city, genres_json, repertoire_json, video_urls_json,
        avatar_url, cover_url, website, is_verified, verification_status, rating_avg, rating_count,
        completed_jobs_count, cancellation_rate, is_recommended, recommendation_period,
        recommendation_badge, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertEnsMember = db.prepare(`
      INSERT OR IGNORE INTO ensemble_members (id, ensemble_id, user_id, email, name, instrument, role_title, joined_year, avatar_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const e of INITIAL_ENSEMBLES) {
      insertEns.run(
        e.id, e.leaderUserId, e.leaderUserId, e.name, e.slug,
        e.discipline ?? 'Müzik', JSON.stringify(e.specialtyTags ?? []),
        e.ensembleType, e.bio, e.foundedYear, e.city,
        JSON.stringify(e.genres), JSON.stringify(e.repertoire), JSON.stringify(e.videoUrls),
        e.avatarUrl, e.coverUrl ?? null, e.website ?? null,
        e.isVerified ? 1 : 0, e.verificationStatus, e.ratingAvg, e.ratingCount,
        e.completedJobsCount, e.cancellationRate,
        e.isRecommended ? 1 : 0, e.recommendationPeriod ?? null, e.recommendationBadge ?? null,
        e.createdAt
      );
      for (const m of e.members) {
        insertEnsMember.run(
          m.id, e.id, m.userId ?? null, null, m.name, m.instrument, m.roleTitle, m.joinedYear, m.avatarUrl, 'active'
        );
      }
    }

    // 6. Business Profiles
    const insertBiz = db.prepare(`
      INSERT OR IGNORE INTO business_profiles (
        id, user_id, organization_id, business_name, slug, business_type, disciplines_json,
        facilities_json, description, city, district, address, website, phone, email,
        tax_number, tax_office, official_title, logo_url, cover_url, is_verified,
        verification_status, verification_doc_url, rating_avg, rating_count,
        completed_bookings_count, is_recommended, recommendation_period,
        recommendation_badge, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const b of INITIAL_BUSINESS_PROFILES) {
      insertBiz.run(
        b.id, b.userId,
        b.id === 'biz_grand_bosphorus' ? 'org_grand_bosphorus' : b.id === 'biz_kadikoy_art' ? 'org_moda_vakfi' : null,
        b.businessName, b.slug, b.businessType,
        JSON.stringify(b.disciplines ?? ['Müzik']), JSON.stringify(b.facilities ?? []),
        b.description, b.city, b.district, b.address, b.website ?? null,
        b.phone, b.email, b.taxNumber ?? null, b.taxOffice ?? null, b.officialTitle ?? null,
        b.logoUrl, b.coverUrl ?? null, b.isVerified ? 1 : 0, b.verificationStatus,
        b.verificationDocUrl ?? null, b.ratingAvg, b.ratingCount, b.completedBookingsCount,
        b.isRecommended ? 1 : 0, b.recommendationPeriod ?? null, b.recommendationBadge ?? null,
        b.createdAt
      );
    }

    // 7. Listings
    const insertListing = db.prepare(`
      INSERT OR IGNORE INTO listings (
        id, business_id, business_name, business_type, business_logo, business_verified,
        title, slug, description, discipline, specialty_tags_json, event_type, genres_json,
        target_ensemble_type, required_instruments_json, performer_count, duration_mins,
        event_date, start_time, end_time, application_deadline, city, district, venue_name,
        is_outdoor, repertoire_expectation, dress_code, sound_system_provided,
        transportation_provided, accommodation_provided, budget_amount, currency, status,
        is_replacement, original_listing_id, urgent_reason, applications_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const l of INITIAL_LISTINGS) {
      insertListing.run(
        l.id, l.businessId, l.businessName, l.businessType, l.businessLogo,
        l.businessVerified ? 1 : 0, l.title, l.slug, l.description,
        l.discipline ?? 'Müzik', JSON.stringify(l.specialtyTags ?? []),
        l.eventType, JSON.stringify(l.genres), l.targetEnsembleType,
        JSON.stringify(l.requiredInstruments), l.performerCount, l.durationMins,
        l.eventDate, l.startTime, l.endTime, l.applicationDeadline, l.city,
        l.district, l.venueName, l.isOutdoor ? 1 : 0, l.repertoireExpectation,
        l.dressCode, l.soundSystemProvided ? 1 : 0, l.transportationProvided ? 1 : 0,
        l.accommodationProvided ? 1 : 0, l.budgetAmount, l.currency, l.status,
        l.isReplacement ? 1 : 0, l.originalListingId ?? null, l.urgentReason ?? null,
        l.applicationsCount, l.createdAt
      );
    }

    // 8. Applications
    const insertApp = db.prepare(`
      INSERT OR IGNORE INTO applications (
        id, listing_id, applicant_type, applicant_id, applicant_user_id, applicant_name,
        applicant_avatar, applicant_rating, applicant_completed_jobs, applicant_cancellation_rate,
        applicant_is_verified, instruments_or_type, genres_json, message,
        participating_members_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const app of INITIAL_APPLICATIONS) {
      insertApp.run(
        app.id, app.listingId, app.applicantType, app.applicantId, app.applicantUserId,
        app.applicantName, app.applicantAvatar, app.applicantRating, app.applicantCompletedJobs,
        app.applicantCancellationRate, app.applicantIsVerified ? 1 : 0,
        app.instrumentsOrType, JSON.stringify(app.genres), app.message,
        JSON.stringify(app.participatingMembers ?? []), app.status, app.createdAt
      );
    }

    // 9. Bookings + Digital Contracts + Financial Ledger
    const insertBooking = db.prepare(`
      INSERT OR IGNORE INTO bookings (
        id, listing_id, listing_title, business_id, business_name, application_id,
        performer_type, performer_id, performer_user_id, performer_name, performer_avatar,
        event_date, start_time, end_time, venue_name, city, net_payout_amount,
        commission_amount, gross_amount, commission_model, commission_rate, status,
        performer_completed_at, employer_completed_at,
        contract_terms_accepted_by_performer, contract_terms_accepted_by_employer,
        payment_status, payment_provider, payment_ref, dispute_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertContract = db.prepare(`
      INSERT OR IGNORE INTO contracts (
        id, booking_id, version, title, terms_text, disclaimer,
        employer_accepted_at, performer_accepted_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLedger = db.prepare(`
      INSERT OR IGNORE INTO financial_ledger (
        id, booking_id, entry_type, amount, currency, provider, provider_ref, mode, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const bk of INITIAL_BOOKINGS) {
      const perfUserId = bk.performerId === 'artist_efe_ozkan' ? 'user_artist_efe' : 'user_trio_selin';
      const isCompleted = bk.status === 'completed';
      insertBooking.run(
        bk.id, bk.listingId, bk.listingTitle, bk.businessId, bk.businessName,
        bk.applicationId, bk.performerType, bk.performerId, perfUserId,
        bk.performerName, bk.performerAvatar, bk.eventDate, '20:00', '21:30',
        bk.venueName, bk.city, bk.netPayoutAmount, bk.commissionAmount,
        bk.grossAmount, bk.commissionModel, bk.commissionRate, bk.status,
        isCompleted ? bk.updatedAt : null, isCompleted ? bk.updatedAt : null,
        bk.contractTermsAcceptedByPerformer ? 1 : 0,
        bk.contractTermsAcceptedByEmployer ? 1 : 0,
        bk.paymentStatus, 'iyzico_sandbox', `sandbox_ref_${bk.id}`, 'none',
        bk.createdAt, bk.updatedAt
      );

      insertContract.run(
        `contract_${bk.id}`,
        bk.id,
        '1.0',
        `${bk.listingTitle} — Dijital Sahne & İcra Sözleşmesi`,
        `1. Taraflar: ${bk.businessName} (İşveren) ve ${bk.performerName} (İcracı).\n2. Performans Tarihi ve Yeri: ${bk.eventDate}, ${bk.venueName} (${bk.city}).\n3. Mali Koşullar: İcracı net hakedişi ${bk.netPayoutAmount} TRY, Platform hizmet bedeli ${bk.commissionAmount} TRY (%${bk.commissionRate}, ${bk.commissionModel}).\n4. Ödeme ve Hak Ediş: Ödeme tutarı sahne tamamlanana kadar güvence hesabında tutulur; çift taraflı tamamlanma onayı sonrası aktarılır.`,
        'Bu dijital sözleşme platform içi operasyon kaydıdır; yüksek tutarlı kurumsal sözleşmeler için tarafların ayrıca ıslak imza veya 5070 sayılı Elektronik İmza Kanunu kapsamında nitelikli e-imza düzenlemesi önerilir.',
        bk.contractTermsAcceptedByEmployer ? bk.createdAt : null,
        bk.contractTermsAcceptedByPerformer ? bk.createdAt : null,
        bk.createdAt
      );

      insertLedger.run(
        `led_hold_${bk.id}`,
        bk.id,
        'payment_hold',
        bk.grossAmount,
        'TRY',
        'iyzico_sandbox',
        `iyz_sbx_${bk.id}`,
        'sandbox',
        'Sandbox güvence ödemesi alındı',
        bk.createdAt
      );

      if (bk.paymentStatus === 'released') {
        insertLedger.run(
          `led_comm_${bk.id}`,
          bk.id,
          'commission_accrual',
          bk.commissionAmount,
          'TRY',
          'sanatsahnede_platform',
          `comm_${bk.id}`,
          'sandbox',
          'Platform hizmet komisyonu tahakkuku',
          bk.updatedAt
        );
        insertLedger.run(
          `led_rel_${bk.id}`,
          bk.id,
          'payout_release',
          bk.netPayoutAmount,
          'TRY',
          'iyzico_sandbox',
          `rel_${bk.id}`,
          'sandbox',
          'Çift taraflı onay sonrası icracı hakediş aktarımı (Sandbox)',
          bk.updatedAt
        );
      }
    }

    // 10. Reviews
    const insertReview = db.prepare(`
      INSERT OR IGNORE INTO reviews (
        id, booking_id, reviewer_id, reviewer_name, reviewer_role,
        target_id, target_name, score_overall, score_communication,
        score_professionalism, score_quality, comment, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of INITIAL_REVIEWS) {
      insertReview.run(
        r.id, r.bookingId, r.reviewerId, r.reviewerName, r.reviewerRole,
        r.targetId, r.targetName, r.scoreOverall, r.scoreCommunication,
        r.scoreProfessionalism, r.scoreQuality, r.comment, r.createdAt
      );
    }

    // 11. Verifications
    const insertVerif = db.prepare(`
      INSERT OR IGNORE INTO verification_requests (
        id, user_id, entity_name, account_type, documents_json, portfolio_url, video_url, status, admin_note, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const v of INITIAL_VERIFICATIONS) {
      insertVerif.run(
        v.id, v.userId, v.entityName, v.accountType, JSON.stringify(v.documents),
        v.portfolioUrl ?? null, v.videoUrl ?? null, v.status, v.adminNote ?? null, v.submittedAt
      );
    }

    // 12. Events
    const insertEvent = db.prepare(`
      INSERT OR IGNORE INTO events (
        id, creator_user_id, title, discipline, category, organizer_name, organizer_contact,
        venue_name, city, district, event_date, start_time, end_time, genres_json,
        performers, ticket_price, is_free, ticket_url, description, poster_url, status,
        is_originals, accessibility_summary_json, accessibility_verified_by,
        accessibility_verified_at, latitude, longitude, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const cityCoords: Record<string, [number, number]> = {
      'İstanbul': [41.0422, 29.0083],
      'Ankara': [39.9208, 32.8541],
      'İzmir': [38.4237, 27.1428],
      'Antalya': [36.8969, 30.7133],
      'Bursa': [40.1885, 29.0610],
    };

    for (let idx = 0; idx < INITIAL_EVENTS.length; idx++) {
      const ev = INITIAL_EVENTS[idx];
      const coords = cityCoords[ev.city] || [41.0082, 28.9784];
      const accTags = idx % 2 === 0
        ? ['Tekerlekli Sandalye Erişimi', 'Basamaksız Giriş', 'Erişilebilir Tuvalet']
        : ['Tekerlekli Sandalye Erişimi', 'Duyusal Dostu Oturum'];
      insertEvent.run(
        ev.id, 'user_hotel_mgr', ev.title, ev.discipline ?? 'Müzik', ev.category,
        ev.organizerName, ev.organizerContact ?? null, ev.venueName, ev.city,
        ev.district ?? '', ev.eventDate, ev.startTime, ev.endTime ?? null,
        JSON.stringify(ev.genres), ev.performers, ev.ticketPrice, ev.isFree ? 1 : 0,
        ev.ticketUrl ?? null, ev.description, ev.posterUrl ?? null, ev.status,
        idx === 0 ? 1 : 0, JSON.stringify(accTags),
        idx % 2 === 0 ? 'SanatSahnede Erişilebilirlik Doğrulama Ekibi' : null,
        idx % 2 === 0 ? '2026-11-10T10:00:00Z' : null,
        coords[0], coords[1], ev.createdAt
      );
    }

    // 13. Venues, Spaces & Accessibility Specs (9.2 + 9.8)
    const insertVenue = db.prepare(`
      INSERT OR IGNORE INTO venues (
        id, organization_id, manager_user_id, name, slug, city, district, address,
        description, contact_phone, contact_email, is_verified, accessibility_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertSpace = db.prepare(`
      INSERT OR IGNORE INTO venue_spaces (
        id, venue_id, name, seated_capacity, standing_capacity, stage_dimensions, technical_equipment_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertVenue.run(
      'venue_kadikoy_akustik', null, 'user_venue_akm',
      'Kadıköy Akustik Sahne & Stüdyo', 'kadikoy-akustik-sahne',
      'İstanbul', 'Kadıköy', 'Caferağa Mah. Moda Cad. No: 84',
      'Doğal ahşap akustiğe sahip 180 kişilik oda müziği ve disiplinlerarası performans sahnesi ile genç sanatçılara açık prova salonu.',
      '+90 216 345 12 34', 'sahne@kadikoyakustik.com', 1,
      JSON.stringify({
        wheelchairAccess: true, stepFreeEntrance: true, accessibleRestroom: true,
        elevatorOrRamp: true, signLanguageInterpretation: true, liveCaptions: false,
        audioDescription: false, brailleProgram: true, hearingLoop: true,
        companionSupport: true, accessibleSeating: true, sensoryFriendly: true,
        accessibleTransitInfo: 'Kadıköy İskelesi ve M4 Metro 6 dakika yürüme mesafesi; alçak tabanlı otobüs durağı 80m.',
        verifiedBy: 'Cansu Aydın (Doğrulama Uzmanı)', verifiedAt: '2026-11-05T14:00:00Z',
      }),
      now
    );
    insertSpace.run('space_ka_1', 'venue_kadikoy_akustik', 'Ana Oda Müziği Salonu', 180, 220, '8m x 5m', JSON.stringify(['Steinway B-211 Kuyruklu Piyano', 'DPA Stereo Çift', '16 Kanal Dijital Mikser']));
    insertSpace.run('space_ka_2', 'venue_kadikoy_akustik', 'Genç Sanatçı Prova Stüdyosu', 25, 35, '5m x 4m', JSON.stringify(['Duvar Piyanosu', 'Müzik Sehpaları', 'Akustik Paneller']));

    insertVenue.run(
      'venue_bosphorus_hall', 'org_grand_bosphorus', 'user_hotel_mgr',
      'The Grand Bosphorus Balo & Resital Salonu', 'grand-bosphorus-balo-salonu',
      'İstanbul', 'Beşiktaş', 'Çırağan Cad. No: 44',
      'Boğaz manzaralı, yüksek tavanlı klasik gala ve protokol resital salonu.',
      '+90 212 327 00 00', 'etkinlik@grandbosphorus.com', 1,
      JSON.stringify({
        wheelchairAccess: true, stepFreeEntrance: true, accessibleRestroom: true,
        elevatorOrRamp: true, signLanguageInterpretation: false, liveCaptions: true,
        audioDescription: false, brailleProgram: false, hearingLoop: true,
        companionSupport: true, accessibleSeating: true, sensoryFriendly: false,
        accessibleTransitInfo: 'Ana girişte vale ve basamaksız rampa asansör bağlantısı mevcut.',
        verifiedBy: 'Cansu Aydın (Doğrulama Uzmanı)', verifiedAt: '2026-11-02T11:00:00Z',
      }),
      now
    );
    insertSpace.run('space_gb_1', 'venue_bosphorus_hall', 'Bosphorus Balo Salonu', 320, 480, '10m x 6m', JSON.stringify(['Steinway D-274 Konser Piyanosu', 'd&b audiotechnik Line Array', 'Sahne Aydınlatma Rig']));

    insertVenue.run(
      'venue_ankara_erimtan', null, 'user_erimtan',
      'Erimtan Arkeoloji & Oda Müziği Salonu', 'erimtan-oda-muzigi-salonu',
      'Ankara', 'Altındağ', 'Kale Mahallesi, Gözcü Sok. No: 10',
      'Tarihi Ankara Kalesi dokusunda haftalık oda müziği konserleri ve kültür söyleşileri.',
      '+90 312 311 04 01', 'konser@erimtanmuzesi.org', 1,
      JSON.stringify({
        wheelchairAccess: true, stepFreeEntrance: true, accessibleRestroom: true,
        elevatorOrRamp: true, signLanguageInterpretation: false, liveCaptions: false,
        audioDescription: true, brailleProgram: true, hearingLoop: false,
        companionSupport: true, accessibleSeating: true, sensoryFriendly: true,
        accessibleTransitInfo: 'Engelli araç park yeri ve müze içi asansör erişimi mevcuttur.',
        verifiedBy: 'Mekân Beyanı + Saha Kontrolü', verifiedAt: '2026-10-28T09:30:00Z',
      }),
      now
    );
    insertSpace.run('space_er_1', 'venue_ankara_erimtan', 'Çok Amaçlı Müze Salonu', 140, 160, '7m x 4.5m', JSON.stringify(['Yamaha C7 Kuyruklu Piyano', 'Akustik Yansıtıcı Paneller']));

    // 14. Availability Slots (9.2 Open Stage & Calendar)
    const insertSlot = db.prepare(`
      INSERT OR IGNORE INTO availability_slots (
        id, owner_type, owner_id, owner_user_id, owner_name, title, slot_date,
        start_time, end_time, recurrence, slot_kind, is_free, fee_amount, city, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertSlot.run('slot_1', 'venue', 'venue_kadikoy_akustik', 'user_venue_akm', 'Kadıköy Akustik Sahne & Stüdyo', 'Genç Oda Müziği Toplulukları Açık Sahne Akşamı', '2026-11-29', '19:00', '22:00', 'weekly', 'open_stage', 1, 0, 'İstanbul', 'Başvurular değerlendirilerek 20 dakikalık sahne sırası verilir.', now);
    insertSlot.run('slot_2', 'venue', 'venue_kadikoy_akustik', 'user_venue_akm', 'Kadıköy Akustik Sahne & Stüdyo', 'Ücretsiz Prova Stüdyosu Desteği (Sabah Oturumu)', '2026-12-02', '10:00', '13:00', 'weekly', 'free_rehearsal', 1, 0, 'İstanbul', 'Konservatuvar öğrencileri ve ilk sahne projeleri için ücretsizdir.', now);
    insertSlot.run('slot_3', 'artist', 'artist_efe_ozkan', 'user_artist_efe', 'Efe Özkan', 'Bosphorus Gala Rezervasyonu (Dolu)', '2026-11-28', '20:00', '21:30', 'once', 'booked', 0, 25000, 'İstanbul', 'Otomatik rezervasyon blokajı.', now);
    insertSlot.run('slot_4', 'artist', 'artist_efe_ozkan', 'user_artist_efe', 'Efe Özkan', 'Akşam Resitali Müsaitliği', '2026-12-06', '18:00', '22:30', 'once', 'available', 0, 22000, 'İstanbul', 'İstanbul ve çevre iller için uygun.', now);
    insertSlot.run('slot_5', 'venue', 'venue_ankara_erimtan', 'user_erimtan', 'Erimtan Arkeoloji & Oda Müziği Salonu', 'Salı Akşamları Açık Müze Sahnesi', '2026-12-01', '18:30', '20:30', 'weekly', 'open_stage', 1, 0, 'Ankara', 'Akustik solo ve duo başvurularına açıktır.', now);

    // 15. Technical Providers, Equipment, Packages, Requests, Quotes (9.4)
    db.prepare(`
      INSERT OR IGNORE INTO technical_providers (
        id, user_id, name, city, service_areas_json, categories_json,
        description, staff_capacity, is_verified, rating_avg, completed_jobs_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'tech_ses_sahne', 'user_tech_pro', 'Ses ve Sahne Teknik Prodüksiyon A.Ş.', 'İstanbul',
      JSON.stringify(['İstanbul', 'Kocaeli', 'Bursa', 'Ankara']),
      JSON.stringify(['Ses Sistemi', 'Sahne Aydınlatma', 'Akustik Mikrofonlama', 'Canlı Kayıt & Yayın']),
      'Oda müziği, caz konserleri ve kurumsal galalar için akustik duyarlı DPA/Neumann mikrofonlama, line array ses ve DMX sahne aydınlatması.',
      12, 1, 4.94, 42, now
    );

    const insertEquip = db.prepare(`
      INSERT OR IGNORE INTO equipment_inventory (
        id, provider_id, category, name, brand_model, quantity, daily_rate, mode, is_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertEquip.run('eq_1', 'tech_ses_sahne', 'Mikrofon', 'DPA 4099 Akustik Enstrüman Mikrofon Seti', 'DPA 4099 Core Stereo/Cello/Piano', 8, 950, 'rental', 1);
    insertEquip.run('eq_2', 'tech_ses_sahne', 'Ses Sistemi', 'Line Array Salon Ses Sistemi', 'L-Acoustics Syva + Sub', 2, 7500, 'service', 1);
    insertEquip.run('eq_3', 'tech_ses_sahne', 'Dijital Mikser', '32 Kanal Dijital Sahne Konsolu', 'Allen & Heath dLive C1500', 2, 4200, 'rental', 1);
    insertEquip.run('eq_4', 'tech_ses_sahne', 'Aydınlatma', 'Sıcak Ton Sahne Aydınlatma Paketi', 'ETC Source Four LED (8x) + DMX', 1, 5500, 'service', 1);
    insertEquip.run('eq_5', 'tech_ses_sahne', 'Piyano & Backline', 'Sahne Monitör Hoparlör Çifti', 'd&b M4 Stage Monitor', 4, 1400, 'rental', 1);

    const insertPkg = db.prepare(`
      INSERT OR IGNORE INTO service_packages (id, provider_id, title, description, price_amount, included_items_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPkg.run('pkg_1', 'tech_ses_sahne', 'Oda Müziği & Gala Akustik Paketi', 'Yaylı trio/kuartet veya solo piyano için şeffaf akustik güçlendirme ve 1 ses mühendisi dahil.', 14500, JSON.stringify(['4x DPA 4099 Mikrofon', 'L-Acoustics Syva Stereo Çift', '16ch Dijital Mikser', '1 Ses Mühendisi & Kurulum']));
    insertPkg.run('pkg_2', 'tech_ses_sahne', 'Caz Quartet & Sahne Işık Paketi', 'Tam akustik-elektrik caz grubu seslendirme, 4 sahne monitörü ve sıcak sahne ışığı.', 22000, JSON.stringify(['Davul & Kontrbas Mikrofon Seti', '4x Sahne Monitörü', 'ETC LED Aydınlatma', '2 Teknik Uzman']));

    db.prepare(`
      INSERT OR IGNORE INTO technical_requests (
        id, requester_user_id, context_type, context_id, title, city, event_date,
        required_equipment_json, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'treq_1', 'user_hotel_mgr', 'booking', 'booking_sample_confirmed_01',
      'Bosphorus Balo Salonu Solo Piyano Gala Mikrofonlama & Işık', 'İstanbul', '2026-11-28',
      JSON.stringify(['DPA 4099 Akustik Enstrüman Mikrofon Seti', 'Sıcak Ton Sahne Aydınlatma Paketi']),
      'Steinway D-274 piyano için çift DPA 4099 ve yumuşak sahne ışığı talep edilmektedir.',
      'quoted', now
    );

    db.prepare(`
      INSERT OR IGNORE INTO technical_quotes (
        id, request_id, provider_id, provider_name, amount, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'tquote_1', 'treq_1', 'tech_ses_sahne', 'Ses ve Sahne Teknik Prodüksiyon A.Ş.', 11500,
      'Kurulum, soundcheck (17:00) ve etkinlik süresince ses-ışık operatörü dahildir.', 'submitted', now
    );

    // 16. Production Workspace (9.3 Linked to booking_sample_confirmed_01)
    db.prepare(`
      INSERT OR IGNORE INTO production_workspaces (
        id, context_type, context_id, title, event_date, venue_name,
        rider_json, stage_plot_json, schedule_json, tasks_json, logistics_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'prod_booking_01', 'booking', 'booking_sample_confirmed_01',
      'Kültür ve Sanat Elçileri Gala Gecesi — Prodüksiyon Masası', '2026-11-28',
      'The Grand Bosphorus Hotel — Bosphorus Balo Salonu',
      JSON.stringify({
        stageSize: '8m x 5m Ahşap Platform',
        soundRequirements: 'Steinway D-274 piyano için 2x DPA 4099 veya Neumann KM184 stereo çift, doğal salon akustiği destekli.',
        lightRequirements: 'Piyano üzeri sıcak amber (3000K) takip ışığı; dinleyicilere loş ortam.',
        microphones: ['2x Neumann KM184 (Piyano Stereo)', '1x Shure SM58 (Anons Mikrofonu)'],
        backline: ['Steinway D-274 Konser Piyanosu (442 Hz akortlu)', 'Ayarlanabilir Konser Taburesi'],
        monitors: '1 adet sağ kanat yakın alan monitörü (düşük seviye)',
        ioPatchList: 'Ch1-2: Piyano L/R | Ch3: Sunucu | Aux1: Sahne Monitör',
        specialNotes: 'Etkinlikten 3 saat önce piyano akort kontrolü rica olunur.',
      }),
      JSON.stringify([
        { id: 'sp_1', kind: 'instrument', label: 'Steinway D-274', x: 48, y: 42 },
        { id: 'sp_2', kind: 'musician', label: 'Efe Özkan', x: 35, y: 46 },
        { id: 'sp_3', kind: 'mic', label: 'KM184 L/R', x: 52, y: 36 },
        { id: 'sp_4', kind: 'monitor', label: 'Wedge M1', x: 26, y: 55 },
        { id: 'sp_5', kind: 'speaker', label: 'PA Sol', x: 14, y: 78 },
        { id: 'sp_6', kind: 'speaker', label: 'PA Sağ', x: 84, y: 78 },
      ]),
      JSON.stringify([
        { id: 'sch_1', time: '16:30', title: 'Piyano Akort & Teknik Kurulum', ownerRole: 'Teknik Ekip' },
        { id: 'sch_2', time: '18:00', title: 'Sanatçı Varış & Soundcheck', ownerRole: 'İcracı' },
        { id: 'sch_3', time: '19:30', title: 'Kulis Hazırlık & Kapı Açılış', ownerRole: 'Kurum' },
        { id: 'sch_4', time: '20:00', title: '1. Bölüm — Klasik Gala Seçkisi', ownerRole: 'İcracı' },
        { id: 'sch_5', time: '21:00', title: '2. Bölüm — Akustik Caz Seçkisi', ownerRole: 'İcracı' },
      ]),
      JSON.stringify([
        { id: 'tsk_1', title: 'Piyano 442Hz akort onayı', assigneeRole: 'business_owner', dueDate: '2026-11-28', completed: true },
        { id: 'tsk_2', title: 'Final repertuvar akış PDF paylaşımı', assigneeRole: 'artist', dueDate: '2026-11-26', completed: false },
        { id: 'tsk_3', title: 'Kuliste sıcak su, bitki çayı ve dinlenme odası hazırlığı', assigneeRole: 'business_owner', dueDate: '2026-11-28', completed: false },
      ]),
      JSON.stringify({
        travelSummary: 'Beşiktaş ilçe içi ulaşım; otel VIP araç transferi planlandı.',
        accommodationSummary: 'İstanbul içi performans (konaklama gerekmez).',
        transferNotes: 'Giriş kapısında Güvenlik Amirliği plaka kaydı: 34 SS 2026.',
        arrivalTime: '17:45',
      }),
      now
    );

    // 17. Interdisciplinary Projects (9.1 Project Lab)
    const insertProject = db.prepare(`
      INSERT OR IGNORE INTO projects (
        id, owner_user_id, owner_name, title, description, disciplines_json,
        project_type, city, is_remote, budget_amount, is_volunteer,
        application_deadline, delivery_date, status, roles_needed_json,
        members_json, tasks_json, meetings_json, expenses_json, files_json,
        rights_agreement, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProject.run(
      'proj_bogaz_senfonisi', 'user_trio_selin', 'Selin Arslan',
      'Boğazın Yankıları — Oda Müziği & Video Enstalasyon Projesi',
      'İstanbul Boğazı ses peyzajı kayıtlarını canlı yaylı trio ve mekâna özgü projeksiyon haritalama ile birleştiren 45 dakikalık disiplinlerarası performans üretimi.',
      JSON.stringify(['Müzik', 'Bileşik Sanatlar', 'Görsel Sanatlar & Sergi']),
      'Disiplinlerarası Performans', 'İstanbul', 0, 65000, 0,
      '2026-12-10', '2027-02-15', 'recruiting',
      JSON.stringify([
        { id: 'rn_1', roleTitle: 'Görsel Tasarım & Projeksiyon Sanatçısı', discipline: 'Görsel Sanatlar & Sergi', count: 1 },
        { id: 'rn_2', roleTitle: 'Ses Tasarımcısı & Field Recording', discipline: 'Müzik', count: 1 },
      ]),
      JSON.stringify([
        { id: 'pm_1', userId: 'user_trio_selin', name: 'Selin Arslan', roleTitle: 'Proje Yürütücüsü & Çello', status: 'active' },
        { id: 'pm_2', userId: 'user_artist_efe', name: 'Efe Özkan', roleTitle: 'Piyano & Armonik Düzenleme', status: 'active' },
      ]),
      JSON.stringify([
        { id: 'pt_1', title: 'Vapur ve sahil ses kayıtlarının derlenmesi', assigneeName: 'Efe Özkan', dueDate: '2026-12-05', status: 'doing' },
        { id: 'pt_2', title: '1. Bölüm partisyon revizyonu', assigneeName: 'Selin Arslan', dueDate: '2026-12-12', status: 'todo' },
      ]),
      JSON.stringify([
        { id: 'pmt_1', title: 'İlk Okuma & Senaryo Toplantısı', meetingDate: '2026-11-24 19:00', notes: 'Kadıköy Akustik Stüdyo — görsel akış taslağı incelenecek.' },
      ]),
      JSON.stringify([
        { id: 'pex_1', title: 'Stüdyo Ön Kayıt & Mikrofon Kirası', amount: 4500, recordedAt: '2026-11-12' },
      ]),
      JSON.stringify([
        { id: 'pfl_1', name: 'Proje Konsept Sunumu v2.pdf', url: '#konsept-v2', uploadedBy: 'Selin Arslan' },
      ]),
      'Tüm katılımcılar eser üzerindeki manevi haklarını korur; dijital gösterim ve turne gelirleri katkı payına göre eşitlikçi protokolle paylaşılır.',
      now
    );

    insertProject.run(
      'proj_anadolu_edebiyat_sahne', 'user_organizer_fest', 'Elif Karahan',
      'Anadolu’dan Sesler ve Dizeler — Gezici Okuma Tiyatrosu',
      'Çağdaş öykü yazarlarının metinlerini akustik ney, ud ve klasik gitar eşliğinde Türkiye genelinde kültür merkezlerine taşıyan ortak üretim.',
      JSON.stringify(['Edebiyat & Söyleşi', 'Müzik', 'Sahne & Tiyatro']),
      'Turne & Sahne Prodüksiyonu', 'Ankara', 1, 42000, 0,
      '2026-12-20', '2027-03-01', 'in_production',
      JSON.stringify([
        { id: 'rn_3', roleTitle: 'Tiyatro Oyuncusu / Anlatıcı', discipline: 'Sahne & Tiyatro', count: 2 },
      ]),
      JSON.stringify([
        { id: 'pm_3', userId: 'user_organizer_fest', name: 'Elif Karahan', roleTitle: 'Yapımcı', status: 'active' },
      ]),
      JSON.stringify([
        { id: 'pt_3', title: 'Turne şehir listesi kesinleştirme (Ankara, Eskişehir, Bursa)', assigneeName: 'Elif Karahan', dueDate: '2026-12-01', status: 'done' },
      ]),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([]),
      'Metin ve müzik telif hakları eser sahiplerine aittir; turne temsilleri için 1 yıllık gösterim izni alınmıştır.',
      now
    );

    // 18. Opportunity Radar (9.5)
    const insertOpp = db.prepare(`
      INSERT OR IGNORE INTO opportunities (
        id, creator_user_id, title, organizer_name, category, discipline, city, country,
        reward_info, deadline, requirements, application_method, external_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertOpp.run('opp_1', 'user_organizer_fest', 'Genç Oda Müziği Toplulukları Destek Fonu 2027', 'Moda Kültür ve Sanat Vakfı', 'Destek & Hibe', 'Müzik', 'İstanbul', 'Türkiye', '120.000 TRY Prodüksiyon Desteği + 3 Konser Garantisi', '2026-12-30', '35 yaş altı en az 3 kişilik oda müziği toplulukları; 20 dakikalık canlı video kaydı.', 'internal', null, 'published', now);
    insertOpp.run('opp_2', 'user_venue_akm', 'Kadıköy Akustik Misafir Sanatçı (Residency) Programı', 'Kadıköy Akustik Sahne & Stüdyo', 'Misafir Sanatçı Programı', 'Bileşik Sanatlar', 'İstanbul', 'Türkiye', '4 Hafta Ücretsiz Stüdyo Kullanımı + Final Gösterisi', '2026-12-18', 'Disiplinlerarası proje dosyası ve kısa niyet mektubu.', 'internal', null, 'published', now);
    insertOpp.run('opp_3', 'user_admin', 'Uluslararası Ankara Oda Müziği Yarışması & Seçmeleri', 'Başkent Kültür Konsorsiyumu', 'Yarışma & Seçme', 'Müzik', 'Ankara', 'Türkiye', 'Birincilik Ödülü 150.000 TRY & Turne', '2027-01-15', 'Resmi başvuru portalı üzerinden portfolyo ve eser kaydı yüklenmesi gerekir.', 'external', 'https://example.org/ankara-oda-muzigi-yarisma', 'published', now);

    // 19. Artist Studio Portfolios & Career Passport (9.6 + 9.10)
    db.prepare(`
      INSERT OR IGNORE INTO artist_portfolios (
        id, artist_id, user_id, title, audience_type, identity_role, language, visibility,
        summary, works_list_json, press_quotes_json, awards_json, slug, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'port_efe_kurum', 'artist_efe_ozkan', 'user_artist_efe',
      'Kurumsal Gala & Lüks Otel Dinletisi Dosyası', 'Kurum & Otel', 'Konser Piyanisti', 'tr', 'public',
      'Prestijli gala, diplomatik davet ve lüks otel akşamları için Chopin, Debussy ve modern akustik caz standartlarından oluşan seçkin solo piyano portfolyosu.',
      JSON.stringify(['Chopin Nocturne Op. 9 No. 2 (Solo Piyano)', 'Bill Evans — Waltz for Debby Uyarlaması', 'Fazıl Say — Kara Toprak']),
      JSON.stringify(['"Sahne duruşu ve müzikal zarafetiyle Bosphorus Balo Salonu gecemize unutulmaz bir seviye kattı." — The Grand Bosphorus']),
      JSON.stringify(['İstanbul Genç Yetenekler Piyano Yarışması 1.lik (2019)', 'Akbank Caz Genç Sahne Seçkisi (2022)']),
      'efe-ozkan-kurumsal-epk', now
    );
    db.prepare(`
      INSERT OR IGNORE INTO artist_portfolios (
        id, artist_id, user_id, title, audience_type, identity_role, language, visibility,
        summary, works_list_json, press_quotes_json, awards_json, slug, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'port_efe_festival', 'artist_efe_ozkan', 'user_artist_efe',
      'Efe Özkan — International Festival & Composer EPK', 'Festival & Küratör', 'Besteci & Akustik Caz İcracısı', 'en', 'public',
      'Istanbul-based concert pianist and contemporary acoustic jazz composer blending Anatolian motifs with modern chamber improvisation.',
      JSON.stringify(['Anatolian Modal Preludes (Original Cycle)', 'Bosphorus Dusk for Solo Piano']),
      JSON.stringify(['"A compelling bridge between classical precision and spontaneous jazz lyricism."']),
      JSON.stringify(['İKSV Genç Caz Finalisti']),
      'efe-ozkan-festival-epk', now
    );

    const insertCareer = db.prepare(`
      INSERT OR IGNORE INTO career_records (
        id, artist_id, user_id, title, organization_name, venue_name, role_title,
        event_date, source_type, source_id, is_verified_record, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCareer.run('car_1', 'artist_selin_arslan', 'user_trio_selin', 'Boğaz Kır Düğünü Açılış Kokteyli — Yaylı Trio Dinletisi', 'The Grand Bosphorus Hotel', 'The Grand Bosphorus Bahçe', 'Çello & Topluluk Lideri', '2026-10-25', 'booking', 'booking_sample_completed_02', 1, now);
    insertCareer.run('car_2', 'artist_efe_ozkan', 'user_artist_efe', 'Akbank Caz Festivali — Oda Caz Gecesi', 'Akbank Sanat', 'Akbank Sanat Çok Amaçlı Salon', 'Solist Piyanist', '2025-10-12', 'manual', null, 0, now);

    // 20. Context Conversations, Messages & Notifications (12.3 + 12.9)
    db.prepare(`
      INSERT OR IGNORE INTO conversations (id, context_type, context_id, title, participant_user_ids_json, last_message_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'conv_booking_01', 'booking', 'booking_sample_confirmed_01',
      'Gala Gecesi Solo Piyano — Teknik & Repertuvar Koordinasyonu',
      JSON.stringify(['user_hotel_mgr', 'user_artist_efe']),
      now
    );

    const insertMsg = db.prepare(`
      INSERT OR IGNORE INTO messages (id, conversation_id, sender_user_id, sender_name, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertMsg.run('msg_1', 'conv_booking_01', 'user_hotel_mgr', 'Deniz Kaya (Grand Bosphorus)', 'Merhaba Efe Bey, gala gecesi için Steinway D-274 piyanomuzun akort randevusunu 28 Kasım 15:00 olarak teyit ettik.', '2026-11-11T10:00:00Z');
    insertMsg.run('msg_2', 'conv_booking_01', 'user_artist_efe', 'Efe Özkan', 'Teşekkürler Deniz Hanım. Prodüksiyon masasına DPA/KM184 mikrofon talebimi ve akış saatlerimi ekledim.', '2026-11-11T10:25:00Z');

    const insertNotif = db.prepare(`
      INSERT OR IGNORE INTO notifications (id, user_id, type, title, body, link_view, link_entity_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertNotif.run('not_1', 'user_artist_efe', 'booking_confirmed', 'Güvence Ödemesi Onaylandı', 'The Grand Bosphorus Hotel gala rezervasyonu için güvence tutarı (25.000 TRY) kilitlendi.', 'artist_dashboard', 'booking_sample_confirmed_01', 0, now);
    insertNotif.run('not_2', 'user_hotel_mgr', 'technical_quote', 'Yeni Teknik Teklif Geldi', 'Ses ve Sahne Teknik Prodüksiyon A.Ş. gala teknik talebinize 11.500 TRY teklif sundu.', 'technical_match', 'treq_1', 0, now);
    insertNotif.run('not_3', 'user_admin', 'verification_pending', 'Bekleyen Doğrulama Başvuruları', '2 yeni hesap doğrulama başvurusu incelemenizi bekliyor.', 'admin_panel', null, 0, now);

    // 21. Cultural Programs (9.11 Kurumsal Kültür Masası)
    db.prepare(`
      INSERT OR IGNORE INTO cultural_programs (
        id, organization_id, organization_name, title, year, service_mode,
        assigned_coordinator_name, total_budget, events_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'cp_grand_2026', 'org_grand_bosphorus', 'The Grand Bosphorus Hotel & Kültür Grup',
      '2026–2027 Boğaziçi Kış & Bahar Kültür Sezonu', 2026, 'managed_service',
      'SanatSahnede Kurumsal Program Koordinatörü', 480000,
      JSON.stringify([
        { id: 'cpe_1', month: 'Kasım 2026', title: 'Kültür Elçileri Solo Piyano Gala Gecesi', discipline: 'Müzik', venueName: 'Bosphorus Balo Salonu', budget: 27500, status: 'confirmed' },
        { id: 'cpe_2', month: 'Aralık 2026', title: 'Yeni Yıl Oda Müziği & Yaylı Quartet Gecesi', discipline: 'Müzik', venueName: 'Boğaz Terası', budget: 38000, status: 'recruiting' },
        { id: 'cpe_3', month: 'Ocak 2027', title: 'Çağdaş Heykel & Ses Enstalasyonu Kış Buluşması', discipline: 'Heykel & Enstalasyon', venueName: 'Lobi Sanat Galerisi', budget: 55000, status: 'planned' },
      ]),
      now
    );

    // 22. SanatSahnede Originals Programs (10)
    const insertOrig = db.prepare(`
      INSERT OR IGNORE INTO originals_programs (
        id, code, title, tagline, description, season_title, city,
        application_deadline, event_date, status, jury_members_json, sponsors_json, applications_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertOrig.run(
      'orig_ilk_sahne', 'ilk_sahne', 'İlk Sahne', 'Genç Sanatçılar İçin Profesyonel Sahneye İlk Adım',
      'Konservatuvar son sınıf öğrencileri ve bağımsız genç sanatçılara ücretsiz salon, teknik destek, profesyonel video kaydı ve ilk doğrulanmış Kariyer Pasaportu kaydı sağlayan amiral gemisi program.',
      '2026–2027 Kış Seçkisi', 'İstanbul & Ankara', '2026-12-15', '2027-01-20', 'open',
      JSON.stringify(['Prof. Dr. Leyla Erdem', 'Efe Özkan', 'Selin Arslan']),
      JSON.stringify(['Kadıköy Akustik Sahne', 'Moda Kültür ve Sanat Vakfı']),
      JSON.stringify([])
    );
    insertOrig.run(
      'orig_birlesik', 'birlesik', 'Birleşik', 'Disiplinlerarası Ortak Üretim Programı',
      'Müzisyenler, görsel sanatçılar, tiyatro ve edebiyat yaratıcılarını aynı prodüksiyon masasında buluşturan özel kürasyon.',
      '2027 İlkbahar Edisyonu', 'İstanbul', '2027-01-10', '2027-03-05', 'open',
      JSON.stringify(['Dr. Aylin Koç', 'Kerem Yıldız']),
      JSON.stringify(['Pera Kültür ve Müzik Derneği']),
      JSON.stringify([])
    );
    insertOrig.run(
      'orig_sahne_senin', 'sahne_senin', 'Sahne Senin', 'Açık Çağrı & Mikro Sahne Maratonu',
      'Halka açık erişilebilir mekânlarda 20 dakikalık canlı setlerle seyirci ve kurum yöneticilerinin karşısına çıkma fırsatı.',
      'Aralık 2026 Edisyonu', 'İzmir', '2026-12-08', '2026-12-27', 'open',
      JSON.stringify(['Emre Alkan', 'Hakan Yılmaz']),
      JSON.stringify(['İzmir Caz Kolektifi']),
      JSON.stringify([])
    );
    insertOrig.run(
      'orig_yeni_sesler', 'yeni_sesler', 'Yeni Sesler', 'Çağdaş Besteci & Özgün Eser İcrası',
      'Türkiye’deki genç bestecilerin yeni oda müziği eserlerinin profesyonel topluluklarca seslendirilmesi ve yayınlanması.',
      '2027 Bahar', 'Ankara', '2027-02-01', '2027-04-12', 'open',
      JSON.stringify(['Cem Aksoy', 'Zeynep Kılıç']),
      JSON.stringify(['Erimtan Müzesi']),
      JSON.stringify([])
    );
    insertOrig.run(
      'orig_sehirde_sahne', 'sehirde_sahne', 'Şehirde Sahne', 'Kamusal Alanda Herkes İçin Erişilebilir Sanat',
      'Büyükşehir kültür meydanlarında ücretsiz ve engelli erişimi tam sağlanmış açık hava konserleri ve atölyeler.',
      '2026 Sonbahar Arşivi & 2027 Planlaması', 'Türkiye Geneli', '2027-03-01', '2027-05-15', 'published',
      JSON.stringify(['Elif Karahan', 'Cansu Aydın']),
      JSON.stringify(['The Grand Bosphorus Kültür Grup']),
      JSON.stringify([])
    );

    // 23. Feature Flags (19.3)
    const insertFlag = db.prepare(`
      INSERT OR IGNORE INTO feature_flags (flag_key, label, enabled, allowed_roles_json, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertFlag.run('project_lab', 'Proje Lab & Ortak Çalışma Alanı', 1, JSON.stringify(['all']), 'Disiplinlerarası proje çağrıları ve ekip yönetim modülü');
    insertFlag.run('open_stage_network', 'Açık Sahne & Mekân Takvimi', 1, JSON.stringify(['all']), 'Mekân müsaitlik takvimi ve genç sanatçı açık sahne slotları');
    insertFlag.run('production_desk', 'Prodüksiyon & Teknik Rider Masası', 1, JSON.stringify(['all']), 'Sahne planı, teknik rider ve rol bazlı lojistik yönetimi');
    insertFlag.run('technical_match', 'Teknik Ekip & Envanter Eşleşmesi', 1, JSON.stringify(['all']), 'Ses/ışık ekipmanı eşleştirme ve teknik teklif sistemi');
    insertFlag.run('opportunity_radar', 'Fırsat Radarı', 1, JSON.stringify(['all']), 'Hibe, burs, misafir sanatçı ve yarışma radarı');
    insertFlag.run('artist_studio', 'Sanatçı Stüdyosu & Çoklu Portfolyo', 1, JSON.stringify(['all']), 'Hedef kitleye özel portfolyo versiyonları ve QR paylaşımı');
    insertFlag.run('smart_match', 'Açıklanabilir Akıllı Eşleşme', 1, JSON.stringify(['all']), 'Şeffaf kriterlerle ilan-sanatçı eşleşme analizi');
    insertFlag.run('accessible_arts', 'Erişilebilir Sanat Doğrulaması', 1, JSON.stringify(['all']), 'Bağımsız mekân ve etkinlik erişilebilirlik etiketleri');
    insertFlag.run('career_passport', 'SanatSahnede Kariyer Pasaportu', 1, JSON.stringify(['all']), 'Rezervasyonlardan otomatik doğrulanan sahne geçmişi');
    insertFlag.run('culture_desk', 'Kurumsal Kültür Masası', 1, JSON.stringify(['all']), 'Kurumlar için yıllık program ve çok şubeli kültür yönetimi');
    insertFlag.run('originals_programs', 'SanatSahnede Originals Programları', 1, JSON.stringify(['all']), 'İlk Sahne, Birleşik ve özel ekosistem programları');
    insertFlag.run('ai_draft_assistant', 'Yapay Zekâ Taslak Asistanı', 1, JSON.stringify(['all']), 'İlan, başvuru ve teknik rider için isteğe bağlı taslak önerileri');

    // 24. Initial Audit Log
    db.prepare(`
      INSERT OR IGNORE INTO audit_logs (id, user_id, action, resource_type, resource_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(newId('audit'), 'user_admin', 'SYSTEM_SEED', 'database', 'initial', JSON.stringify({ seededUsers: true }), now);
  });

  tx();
}
