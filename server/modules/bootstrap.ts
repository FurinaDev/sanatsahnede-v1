import { Router } from 'express';
import { DbInstance, parseJson } from '../db/database';
import { AuthedRequest } from '../middleware/auth';
import {
  mapApplication,
  mapAvailabilitySlot,
  mapBooking,
  mapBusinessProfile,
  mapCareerRecord,
  mapContract,
  mapConversation,
  mapCulturalProgram,
  mapDispute,
  mapEnsemble,
  mapEvent,
  mapFeatureFlag,
  mapIndividualProfile,
  mapLedgerEntry,
  mapListing,
  mapNotification,
  mapOffer,
  mapOpportunity,
  mapOpportunityApplication,
  mapOrganization,
  mapOrganizationMember,
  mapOriginalsProgram,
  mapPortfolio,
  mapProductionWorkspace,
  mapProject,
  mapProjectApplication,
  mapReview,
  mapTechnicalProvider,
  mapTechnicalQuote,
  mapTechnicalRequest,
  mapVenue,
  mapVerification,
} from '../db/mappers';
import { INITIAL_SETTINGS } from '../../src/data/seedData';
import { isDemoQuickLoginEnabled } from './auth';
import { getPaymentMode } from '../services/paymentAdapter';

export function createBootstrapRouter(db: DbInstance): Router {
  const router = Router();

  router.get('/bootstrap', (req: AuthedRequest, res) => {
    const user = req.user || null;
    const isStaff =
      user &&
      ['admin', 'moderator', 'finance_admin', 'verification_officer', 'support'].includes(
        user.activeRole
      );

    const settingRow = db
      .prepare('SELECT setting_value FROM platform_settings WHERE setting_key = ?')
      .get('settings') as { setting_value: string } | undefined;
    const settings = settingRow ? parseJson(settingRow.setting_value, INITIAL_SETTINGS) : INITIAL_SETTINGS;

    const featureFlags = (db.prepare('SELECT * FROM feature_flags').all() as any[]).map(mapFeatureFlag);
    const artists = (db.prepare('SELECT * FROM individual_profiles ORDER BY rating_avg DESC').all() as any[]).map(mapIndividualProfile);
    const ensembles = (db.prepare('SELECT * FROM ensembles ORDER BY rating_avg DESC').all() as any[]).map((r) => mapEnsemble(db, r));
    const bizRows = db.prepare('SELECT * FROM business_profiles ORDER BY rating_avg DESC').all() as any[];

    const activeListingsCountByBiz = new Map<string, number>();
    for (const row of db.prepare(`SELECT business_id, COUNT(*) as cnt FROM listings WHERE status = 'active' GROUP BY business_id`).all() as any[]) {
      activeListingsCountByBiz.set(row.business_id, Number(row.cnt));
    }
    const businesses = bizRows.map((b) => mapBusinessProfile(b, activeListingsCountByBiz.get(b.id) || 0));

    // Listings: public only sees active/assigned/completed; owner & staff see pending_moderation/draft
    const myBizIds = user
      ? bizRows.filter((b) => b.user_id === user.id).map((b) => b.id)
      : [];
    const allListingRows = db.prepare('SELECT * FROM listings ORDER BY created_at DESC').all() as any[];
    const listings = allListingRows
      .filter((l) => {
        if (isStaff) return true;
        if (['active', 'assigned', 'completed'].includes(l.status)) return true;
        if (myBizIds.includes(l.business_id)) return true;
        return false;
      })
      .map(mapListing);

    // Events: strictly published publicly; creator & staff see pending_moderation
    const allEventRows = db.prepare('SELECT * FROM events ORDER BY event_date ASC').all() as any[];
    const events = allEventRows
      .filter((e) => {
        if (isStaff) return true;
        if (e.status === 'published') return true;
        if (user && e.creator_user_id === user.id) return true;
        return false;
      })
      .map(mapEvent);

    const reviews = (db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all() as any[]).map(mapReview);
    const venues = (db.prepare('SELECT * FROM venues ORDER BY created_at DESC').all() as any[]).map((v) => mapVenue(db, v));
    const availabilitySlots = (db.prepare('SELECT * FROM availability_slots ORDER BY slot_date ASC').all() as any[]).map(mapAvailabilitySlot);
    const technicalProviders = (db.prepare('SELECT * FROM technical_providers ORDER BY rating_avg DESC').all() as any[]).map((tp) => mapTechnicalProvider(db, tp));
    const projects = (db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as any[]).map(mapProject);
    const originalsPrograms = (db.prepare('SELECT * FROM originals_programs').all() as any[]).map(mapOriginalsProgram);

    const allOppRows = db.prepare('SELECT * FROM opportunities ORDER BY deadline ASC').all() as any[];
    const opportunities = allOppRows
      .filter((o) => isStaff || o.status === 'published' || (user && o.creator_user_id === user.id))
      .map(mapOpportunity);

    const publicPortfolios = (db.prepare(`SELECT * FROM artist_portfolios WHERE visibility = 'public'`).all() as any[]).map(mapPortfolio);
    const careerRecords = (db.prepare('SELECT * FROM career_records ORDER BY event_date DESC').all() as any[]).map(mapCareerRecord);

    // Auth-scoped collections
    let applications: ReturnType<typeof mapApplication>[] = [];
    let offers: ReturnType<typeof mapOffer>[] = [];
    let bookings: ReturnType<typeof mapBooking>[] = [];
    let contracts: ReturnType<typeof mapContract>[] = [];
    let disputes: ReturnType<typeof mapDispute>[] = [];
    let verifications: ReturnType<typeof mapVerification>[] = [];
    let ledger: ReturnType<typeof mapLedgerEntry>[] = [];
    let technicalRequests: ReturnType<typeof mapTechnicalRequest>[] = [];
    let technicalQuotes: ReturnType<typeof mapTechnicalQuote>[] = [];
    let productionWorkspaces: ReturnType<typeof mapProductionWorkspace>[] = [];
    let projectApplications: ReturnType<typeof mapProjectApplication>[] = [];
    let opportunityApplications: ReturnType<typeof mapOpportunityApplication>[] = [];
    let bookmarks: Array<{ id: string; itemType: string; itemId: string }> = [];
    let portfolios = publicPortfolios;
    let conversations: ReturnType<typeof mapConversation>[] = [];
    let notifications: ReturnType<typeof mapNotification>[] = [];
    let organizations: ReturnType<typeof mapOrganization>[] = [];
    let organizationMembers: ReturnType<typeof mapOrganizationMember>[] = [];
    let culturalPrograms: ReturnType<typeof mapCulturalProgram>[] = [];

    if (user) {
      const myArtistIds = artists.filter((a) => a.userId === user.id).map((a) => a.id);
      const myEnsembleIds = ensembles.filter((e) => e.leaderUserId === user.id).map((e) => e.id);
      const myPerformerIds = new Set([...myArtistIds, ...myEnsembleIds]);

      const appRows = db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all() as any[];
      applications = appRows
        .filter((a) => isStaff || a.applicant_user_id === user.id || myBizIds.includes(allListingRows.find((l) => l.id === a.listing_id)?.business_id))
        .map(mapApplication);

      const offerRows = db.prepare('SELECT * FROM offers ORDER BY updated_at DESC').all() as any[];
      offers = offerRows
        .filter((o) => isStaff || o.employer_user_id === user.id || o.performer_user_id === user.id)
        .map((o) => mapOffer(db, o));

      const bookingRows = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all() as any[];
      bookings = bookingRows
        .filter((b) => isStaff || myBizIds.includes(b.business_id) || myPerformerIds.has(b.performer_id) || b.performer_user_id === user.id)
        .map(mapBooking);

      const bookingIds = new Set(bookings.map((b) => b.id));
      contracts = (db.prepare('SELECT * FROM contracts').all() as any[])
        .filter((c) => isStaff || bookingIds.has(c.booking_id))
        .map(mapContract);

      disputes = (db.prepare('SELECT * FROM disputes ORDER BY updated_at DESC').all() as any[])
        .filter((d) => isStaff || bookingIds.has(d.booking_id))
        .map(mapDispute);

      verifications = (db.prepare('SELECT * FROM verification_requests ORDER BY submitted_at DESC').all() as any[])
        .filter((v) => isStaff || v.user_id === user.id)
        .map(mapVerification);

      if (isStaff || user.roles.includes('finance_admin')) {
        ledger = (db.prepare('SELECT * FROM financial_ledger ORDER BY created_at DESC').all() as any[]).map(mapLedgerEntry);
      }

      const myTech = technicalProviders.find((t) => t.userId === user.id);
      technicalRequests = (db.prepare('SELECT * FROM technical_requests ORDER BY created_at DESC').all() as any[])
        .filter((tr) => isStaff || tr.requester_user_id === user.id || Boolean(myTech))
        .map(mapTechnicalRequest);

      const visibleReqIds = new Set(technicalRequests.map((tr) => tr.id));
      technicalQuotes = (db.prepare('SELECT * FROM technical_quotes ORDER BY created_at DESC').all() as any[])
        .filter((tq) => isStaff || visibleReqIds.has(tq.request_id) || (myTech && tq.provider_id === myTech.id))
        .map(mapTechnicalQuote);

      const myProjectIds = new Set(
        projects
          .filter((p) => p.ownerUserId === user.id || p.members.some((m) => m.userId === user.id))
          .map((p) => p.id)
      );
      productionWorkspaces = (db.prepare('SELECT * FROM production_workspaces').all() as any[])
        .filter((pw) => isStaff || (pw.context_type === 'booking' && bookingIds.has(pw.context_id)) || (pw.context_type === 'project' && myProjectIds.has(pw.context_id)))
        .map(mapProductionWorkspace);

      projectApplications = (db.prepare('SELECT * FROM project_applications ORDER BY created_at DESC').all() as any[])
        .filter((pa) => isStaff || pa.applicant_user_id === user.id || myProjectIds.has(pa.project_id))
        .map(mapProjectApplication);

      opportunityApplications = (db.prepare('SELECT * FROM opportunity_applications ORDER BY created_at DESC').all() as any[])
        .filter((oa) => isStaff || oa.user_id === user.id)
        .map(mapOpportunityApplication);

      bookmarks = (db.prepare('SELECT id, item_type, item_id FROM user_bookmarks WHERE user_id = ?').all(user.id) as any[]).map((b) => ({
        id: b.id,
        itemType: b.item_type,
        itemId: b.item_id,
      }));

      const myPorts = (db.prepare('SELECT * FROM artist_portfolios WHERE user_id = ?').all(user.id) as any[]).map(mapPortfolio);
      const portMap = new Map(publicPortfolios.map((p) => [p.id, p]));
      myPorts.forEach((p) => portMap.set(p.id, p));
      portfolios = Array.from(portMap.values());

      conversations = (db.prepare('SELECT * FROM conversations ORDER BY last_message_at DESC').all() as any[])
        .filter((c) => {
          const participants = parseJson<string[]>(c.participant_user_ids_json, []);
          return isStaff || participants.includes(user.id);
        })
        .map((c) => mapConversation(db, c));

      notifications = (db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 40').all(user.id) as any[]).map(mapNotification);

      const allOrgs = (db.prepare('SELECT * FROM organizations').all() as any[]).map(mapOrganization);
      const allOrgMembers = (db.prepare('SELECT * FROM organization_members').all() as any[]).map(mapOrganizationMember);
      organizations = allOrgs.filter(
        (org) =>
          isStaff ||
          org.ownerUserId === user.id ||
          allOrgMembers.some((m) => m.organizationId === org.id && m.userId === user.id)
      );
      const myOrgIds = new Set(organizations.map((o) => o.id));
      organizationMembers = allOrgMembers.filter((m) => isStaff || myOrgIds.has(m.organizationId));
      culturalPrograms = (db.prepare('SELECT * FROM cultural_programs ORDER BY year DESC').all() as any[])
        .filter((cp) => isStaff || myOrgIds.has(cp.organization_id))
        .map(mapCulturalProgram);
    }

    return res.json({
      user,
      settings,
      featureFlags,
      runtimeConfig: {
        enableDemoQuickLogin: isDemoQuickLoginEnabled(),
        paymentMode: getPaymentMode(),
        hasGoogleMapsKey: Boolean(process.env.VITE_GOOGLE_MAPS_API_KEY),
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      },
      artists,
      ensembles,
      businesses,
      listings,
      applications,
      offers,
      bookings,
      contracts,
      disputes,
      ledger,
      reviews,
      verifications,
      events,
      venues,
      availabilitySlots,
      technicalProviders,
      technicalRequests,
      technicalQuotes,
      productionWorkspaces,
      projects,
      projectApplications,
      opportunities,
      opportunityApplications,
      bookmarks,
      portfolios,
      careerRecords,
      conversations,
      notifications,
      organizations,
      organizationMembers,
      culturalPrograms,
      originalsPrograms,
    });
  });

  return router;
}
