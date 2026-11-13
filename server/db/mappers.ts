import { DbInstance, parseJson } from './database';
import {
  IndividualProfile,
  Ensemble,
  EnsembleMember,
  BusinessProfile,
  Listing,
  ListingApplication,
  Booking,
  Review,
  VerificationRequest,
  EventAnnouncement,
  Offer,
  OfferRevision,
  DigitalContract,
  DisputeRecord,
  FinancialLedgerEntry,
  Organization,
  OrganizationMember,
  Venue,
  VenueSpace,
  VenueAccessibility,
  AvailabilitySlot,
  TechnicalProvider,
  TechnicalEquipmentItem,
  TechnicalPackage,
  TechnicalRequest,
  TechnicalQuote,
  ProductionWorkspace,
  ProjectItem,
  ProjectApplication,
  OpportunityItem,
  OpportunityApplication,
  ArtistPortfolioVersion,
  CareerRecord,
  Conversation,
  NotificationItem,
  CulturalProgram,
  OriginalsProgram,
  FeatureFlag,
  AuditLogEntry,
  MusicGenre,
  Instrument,
  ArtDiscipline,
  BusinessType,
  EnsembleType,
} from '../../src/types';

export function mapIndividualProfile(row: any): IndividualProfile {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    fullName: row.full_name,
    stageName: row.stage_name ?? undefined,
    title: row.title,
    discipline: (row.discipline || 'Müzik') as ArtDiscipline,
    specialtyTags: parseJson<string[]>(row.specialty_tags_json, []),
    bioShort: row.bio_short,
    bioLong: row.bio_long,
    city: row.city,
    district: row.district,
    primaryInstrument: row.primary_instrument as Instrument,
    instruments: parseJson<Instrument[]>(row.instruments_json, []),
    genres: parseJson<MusicGenre[]>(row.genres_json, []),
    education: row.education,
    experienceYears: Number(row.experience_years || 0),
    repertoire: parseJson<string[]>(row.repertoire_json, []),
    videoUrls: parseJson<string[]>(row.video_urls_json, []),
    audioSamples: parseJson(row.audio_samples_json, []),
    cvUrl: row.cv_url ?? undefined,
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url ?? undefined,
    website: row.website ?? undefined,
    socialLinks: parseJson(row.social_links_json, {}),
    isVerified: Boolean(row.is_verified),
    verificationStatus: row.verification_status,
    verificationDocUrl: row.verification_doc_url ?? undefined,
    ratingAvg: Number(row.rating_avg || 0),
    ratingCount: Number(row.rating_count || 0),
    completedJobsCount: Number(row.completed_jobs_count || 0),
    cancellationRate: Number(row.cancellation_rate || 0),
    isRecommended: Boolean(row.is_recommended),
    recommendationPeriod: row.recommendation_period ?? undefined,
    recommendationBadge: row.recommendation_badge ?? undefined,
    educations: parseJson(row.educations_json, []),
    experiences: parseJson(row.experiences_json, []),
    mediaItems: parseJson(row.media_items_json, []),
    createdAt: row.created_at,
  };
}

export function mapEnsemble(db: DbInstance, row: any): Ensemble {
  const memberRows = db
    .prepare('SELECT * FROM ensemble_members WHERE ensemble_id = ?')
    .all(row.id) as any[];

  const members: EnsembleMember[] = memberRows.map((m) => ({
    id: m.id,
    userId: m.user_id ?? undefined,
    name: m.name,
    instrument: m.instrument as Instrument,
    roleTitle: m.role_title,
    joinedYear: Number(m.joined_year || 2024),
    avatarUrl: m.avatar_url,
  }));

  return {
    id: row.id,
    leaderUserId: row.leader_user_id,
    name: row.name,
    slug: row.slug,
    discipline: (row.discipline || 'Müzik') as ArtDiscipline,
    specialtyTags: parseJson<string[]>(row.specialty_tags_json, []),
    ensembleType: row.ensemble_type as EnsembleType,
    bio: row.bio,
    foundedYear: Number(row.founded_year || 2020),
    city: row.city,
    genres: parseJson<MusicGenre[]>(row.genres_json, []),
    members,
    repertoire: parseJson<string[]>(row.repertoire_json, []),
    videoUrls: parseJson<string[]>(row.video_urls_json, []),
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url ?? undefined,
    website: row.website ?? undefined,
    isVerified: Boolean(row.is_verified),
    verificationStatus: row.verification_status,
    ratingAvg: Number(row.rating_avg || 0),
    ratingCount: Number(row.rating_count || 0),
    completedJobsCount: Number(row.completed_jobs_count || 0),
    cancellationRate: Number(row.cancellation_rate || 0),
    isRecommended: Boolean(row.is_recommended),
    recommendationPeriod: row.recommendation_period ?? undefined,
    recommendationBadge: row.recommendation_badge ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapBusinessProfile(row: any, activeListingsCount = 0): BusinessProfile {
  return {
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    slug: row.slug,
    businessType: row.business_type as BusinessType,
    disciplines: parseJson<ArtDiscipline[]>(row.disciplines_json, ['Müzik']),
    facilities: parseJson<string[]>(row.facilities_json, []),
    description: row.description,
    city: row.city,
    district: row.district,
    address: row.address,
    website: row.website ?? undefined,
    phone: row.phone,
    email: row.email,
    taxNumber: row.tax_number ?? undefined,
    taxOffice: row.tax_office ?? undefined,
    officialTitle: row.official_title ?? undefined,
    logoUrl: row.logo_url,
    coverUrl: row.cover_url ?? undefined,
    isVerified: Boolean(row.is_verified),
    verificationStatus: row.verification_status,
    verificationDocUrl: row.verification_doc_url ?? undefined,
    ratingAvg: Number(row.rating_avg || 0),
    ratingCount: Number(row.rating_count || 0),
    completedBookingsCount: Number(row.completed_bookings_count || 0),
    isRecommended: Boolean(row.is_recommended),
    recommendationPeriod: row.recommendation_period ?? undefined,
    recommendationBadge: row.recommendation_badge ?? undefined,
    activeListingsCount,
    createdAt: row.created_at,
  };
}

export function mapListing(row: any): Listing {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    businessType: row.business_type as BusinessType,
    businessLogo: row.business_logo,
    businessVerified: Boolean(row.business_verified),
    title: row.title,
    slug: row.slug,
    description: row.description,
    discipline: (row.discipline || 'Müzik') as ArtDiscipline,
    specialtyTags: parseJson<string[]>(row.specialty_tags_json, []),
    eventType: row.event_type,
    genres: parseJson<MusicGenre[]>(row.genres_json, []),
    targetEnsembleType: row.target_ensemble_type as EnsembleType,
    requiredInstruments: parseJson<Instrument[]>(row.required_instruments_json, []),
    performerCount: Number(row.performer_count || 1),
    durationMins: Number(row.duration_mins || 60),
    eventDate: row.event_date,
    startTime: row.start_time,
    endTime: row.end_time,
    applicationDeadline: row.application_deadline,
    city: row.city,
    district: row.district,
    venueName: row.venue_name,
    isOutdoor: Boolean(row.is_outdoor),
    repertoireExpectation: row.repertoire_expectation,
    dressCode: row.dress_code,
    soundSystemProvided: Boolean(row.sound_system_provided),
    transportationProvided: Boolean(row.transportation_provided),
    accommodationProvided: Boolean(row.accommodation_provided),
    budgetAmount: Number(row.budget_amount || 0),
    currency: 'TRY',
    status: row.status,
    isReplacement: Boolean(row.is_replacement),
    originalListingId: row.original_listing_id ?? undefined,
    urgentReason: row.urgent_reason ?? undefined,
    applicationsCount: Number(row.applications_count || 0),
    createdAt: row.created_at,
  };
}

export function mapApplication(row: any): ListingApplication {
  return {
    id: row.id,
    listingId: row.listing_id,
    applicantType: row.applicant_type,
    applicantId: row.applicant_id,
    applicantUserId: row.applicant_user_id,
    applicantName: row.applicant_name,
    applicantAvatar: row.applicant_avatar,
    applicantRating: Number(row.applicant_rating || 0),
    applicantCompletedJobs: Number(row.applicant_completed_jobs || 0),
    applicantCancellationRate: Number(row.applicant_cancellation_rate || 0),
    applicantIsVerified: Boolean(row.applicant_is_verified),
    instrumentsOrType: row.instruments_or_type,
    genres: parseJson<MusicGenre[]>(row.genres_json, []),
    message: row.message,
    participatingMembers: parseJson<string[]>(row.participating_members_json, []),
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapBooking(row: any): Booking {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    businessId: row.business_id,
    businessName: row.business_name,
    applicationId: row.application_id,
    performerType: row.performer_type,
    performerId: row.performer_id,
    performerName: row.performer_name,
    performerAvatar: row.performer_avatar,
    eventDate: row.event_date,
    venueName: row.venue_name,
    city: row.city,
    netPayoutAmount: Number(row.net_payout_amount || 0),
    commissionAmount: Number(row.commission_amount || 0),
    grossAmount: Number(row.gross_amount || 0),
    commissionModel: row.commission_model,
    commissionRate: Number(row.commission_rate || 10),
    status: row.status,
    performerCompletedAt: row.performer_completed_at ?? null,
    employerCompletedAt: row.employer_completed_at ?? null,
    contractTermsAcceptedByPerformer: Boolean(row.contract_terms_accepted_by_performer),
    contractTermsAcceptedByEmployer: Boolean(row.contract_terms_accepted_by_employer),
    paymentStatus: row.payment_status,
    paymentProvider: row.payment_provider ?? undefined,
    paymentRef: row.payment_ref ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    cancelledByRole: row.cancelled_by_role ?? undefined,
    disputeStatus: row.dispute_status ?? 'none',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOffer(db: DbInstance, row: any): Offer {
  const revRows = db
    .prepare('SELECT * FROM offer_revisions WHERE offer_id = ? ORDER BY created_at ASC')
    .all(row.id) as any[];
  const revisions: OfferRevision[] = revRows.map((r) => ({
    id: r.id,
    offerId: r.offer_id,
    actorUserId: r.actor_user_id,
    actorRole: r.actor_role,
    proposedAmount: Number(r.proposed_amount),
    commissionModel: r.commission_model,
    commissionRate: Number(r.commission_rate),
    netPayoutAmount: Number(r.net_payout_amount),
    commissionAmount: Number(r.commission_amount),
    grossAmount: Number(r.gross_amount),
    scopeNotes: r.scope_notes,
    createdAt: r.created_at,
  }));
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    applicationId: row.application_id ?? undefined,
    employerUserId: row.employer_user_id,
    businessId: row.business_id,
    performerType: row.performer_type,
    performerId: row.performer_id,
    performerUserId: row.performer_user_id,
    performerName: row.performer_name,
    proposedAmount: Number(row.proposed_amount),
    commissionModel: row.commission_model,
    commissionRate: Number(row.commission_rate),
    netPayoutAmount: Number(row.net_payout_amount),
    commissionAmount: Number(row.commission_amount),
    grossAmount: Number(row.gross_amount),
    eventDate: row.event_date,
    startTime: row.start_time,
    endTime: row.end_time,
    expiresAt: row.expires_at,
    lastActorUserId: row.last_actor_user_id,
    status: row.status,
    revisions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapContract(row: any): DigitalContract {
  return {
    id: row.id,
    bookingId: row.booking_id,
    version: row.version,
    title: row.title,
    termsText: row.terms_text,
    disclaimer: row.disclaimer,
    employerAcceptedAt: row.employer_accepted_at ?? null,
    performerAcceptedAt: row.performer_accepted_at ?? null,
    createdAt: row.created_at,
  };
}

export function mapDispute(row: any): DisputeRecord {
  return {
    id: row.id,
    bookingId: row.booking_id,
    openedByUserId: row.opened_by_user_id,
    openedByRole: row.opened_by_role,
    reason: row.reason,
    evidenceNotes: row.evidence_notes,
    status: row.status,
    resolutionNote: row.resolution_note ?? undefined,
    resolvedByUserId: row.resolved_by_user_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLedgerEntry(row: any): FinancialLedgerEntry {
  return {
    id: row.id,
    bookingId: row.booking_id,
    entryType: row.entry_type,
    amount: Number(row.amount),
    currency: 'TRY',
    provider: row.provider,
    providerRef: row.provider_ref,
    mode: row.mode,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapReview(row: any): Review {
  return {
    id: row.id,
    bookingId: row.booking_id,
    reviewerId: row.reviewer_id,
    reviewerName: row.reviewer_name,
    reviewerRole: row.reviewer_role,
    targetId: row.target_id,
    targetName: row.target_name,
    scoreOverall: Number(row.score_overall),
    scoreCommunication: Number(row.score_communication),
    scoreProfessionalism: Number(row.score_professionalism),
    scoreQuality: Number(row.score_quality),
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export function mapVerification(row: any): VerificationRequest {
  return {
    id: row.id,
    userId: row.user_id,
    entityName: row.entity_name,
    accountType: row.account_type,
    documents: parseJson(row.documents_json, []),
    portfolioUrl: row.portfolio_url ?? undefined,
    videoUrl: row.video_url ?? undefined,
    status: row.status,
    adminNote: row.admin_note ?? undefined,
    submittedAt: row.submitted_at,
  };
}

export function mapEvent(row: any): EventAnnouncement {
  return {
    id: row.id,
    title: row.title,
    discipline: (row.discipline || 'Müzik') as ArtDiscipline,
    category: row.category,
    organizerName: row.organizer_name,
    organizerContact: row.organizer_contact ?? undefined,
    venueName: row.venue_name,
    city: row.city,
    district: row.district ?? undefined,
    eventDate: row.event_date,
    startTime: row.start_time,
    endTime: row.end_time ?? undefined,
    genres: parseJson<MusicGenre[]>(row.genres_json, []),
    performers: row.performers,
    ticketPrice: Number(row.ticket_price || 0),
    isFree: Boolean(row.is_free),
    ticketUrl: row.ticket_url ?? undefined,
    description: row.description,
    posterUrl: row.poster_url ?? undefined,
    status: row.status,
    isOriginals: Boolean(row.is_originals),
    accessibilitySummary: parseJson<string[]>(row.accessibility_summary_json, []),
    accessibilityVerifiedBy: row.accessibility_verified_by ?? undefined,
    accessibilityVerifiedAt: row.accessibility_verified_at ?? undefined,
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
    createdAt: row.created_at,
  };
}

export function mapVenue(db: DbInstance, row: any): Venue {
  const spaceRows = db.prepare('SELECT * FROM venue_spaces WHERE venue_id = ?').all(row.id) as any[];
  const spaces: VenueSpace[] = spaceRows.map((s) => ({
    id: s.id,
    venueId: s.venue_id,
    name: s.name,
    seatedCapacity: Number(s.seated_capacity || 0),
    standingCapacity: Number(s.standing_capacity || 0),
    stageDimensions: s.stage_dimensions,
    technicalEquipment: parseJson<string[]>(s.technical_equipment_json, []),
  }));
  return {
    id: row.id,
    organizationId: row.organization_id ?? undefined,
    managerUserId: row.manager_user_id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    district: row.district,
    address: row.address,
    description: row.description,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    isVerified: Boolean(row.is_verified),
    spaces,
    accessibility: parseJson<VenueAccessibility>(row.accessibility_json, {
      wheelchairAccess: false,
      stepFreeEntrance: false,
      accessibleRestroom: false,
      elevatorOrRamp: false,
      signLanguageInterpretation: false,
      liveCaptions: false,
      audioDescription: false,
      brailleProgram: false,
      hearingLoop: false,
      companionSupport: false,
      accessibleSeating: false,
      sensoryFriendly: false,
      accessibleTransitInfo: '',
    }),
    createdAt: row.created_at,
  };
}

export function mapAvailabilitySlot(row: any): AvailabilitySlot {
  return {
    id: row.id,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    title: row.title,
    slotDate: row.slot_date,
    startTime: row.start_time,
    endTime: row.end_time,
    recurrence: row.recurrence,
    slotKind: row.slot_kind,
    isFree: Boolean(row.is_free),
    feeAmount: Number(row.fee_amount || 0),
    city: row.city,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapTechnicalProvider(db: DbInstance, row: any): TechnicalProvider {
  const eqRows = db.prepare('SELECT * FROM equipment_inventory WHERE provider_id = ?').all(row.id) as any[];
  const pkgRows = db.prepare('SELECT * FROM service_packages WHERE provider_id = ?').all(row.id) as any[];
  const equipment: TechnicalEquipmentItem[] = eqRows.map((e) => ({
    id: e.id,
    providerId: e.provider_id,
    category: e.category,
    name: e.name,
    brandModel: e.brand_model,
    quantity: Number(e.quantity || 1),
    dailyRate: Number(e.daily_rate || 0),
    mode: e.mode,
    isAvailable: Boolean(e.is_available),
  }));
  const packages: TechnicalPackage[] = pkgRows.map((p) => ({
    id: p.id,
    providerId: p.provider_id,
    title: p.title,
    description: p.description,
    priceAmount: Number(p.price_amount || 0),
    includedItems: parseJson<string[]>(p.included_items_json, []),
  }));
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    city: row.city,
    serviceAreas: parseJson<string[]>(row.service_areas_json, []),
    categories: parseJson<string[]>(row.categories_json, []),
    description: row.description,
    staffCapacity: Number(row.staff_capacity || 1),
    isVerified: Boolean(row.is_verified),
    ratingAvg: Number(row.rating_avg || 0),
    completedJobsCount: Number(row.completed_jobs_count || 0),
    equipment,
    packages,
    createdAt: row.created_at,
  };
}

export function mapTechnicalRequest(row: any): TechnicalRequest {
  return {
    id: row.id,
    requesterUserId: row.requester_user_id,
    contextType: row.context_type,
    contextId: row.context_id,
    title: row.title,
    city: row.city,
    eventDate: row.event_date,
    requiredEquipment: parseJson<string[]>(row.required_equipment_json, []),
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapTechnicalQuote(row: any): TechnicalQuote {
  return {
    id: row.id,
    requestId: row.request_id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    amount: Number(row.amount || 0),
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapProductionWorkspace(row: any): ProductionWorkspace {
  return {
    id: row.id,
    contextType: row.context_type,
    contextId: row.context_id,
    title: row.title,
    eventDate: row.event_date,
    venueName: row.venue_name,
    rider: parseJson(row.rider_json, {
      stageSize: '',
      soundRequirements: '',
      lightRequirements: '',
      microphones: [],
      backline: [],
      monitors: '',
      ioPatchList: '',
      specialNotes: '',
    }),
    stagePlot: parseJson(row.stage_plot_json, []),
    schedule: parseJson(row.schedule_json, []),
    tasks: parseJson(row.tasks_json, []),
    logistics: parseJson(row.logistics_json, {
      travelSummary: '',
      accommodationSummary: '',
      transferNotes: '',
      arrivalTime: '',
    }),
    updatedAt: row.updated_at,
  };
}

export function mapProject(row: any): ProjectItem {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name,
    title: row.title,
    description: row.description,
    disciplines: parseJson<ArtDiscipline[]>(row.disciplines_json, ['Müzik']),
    projectType: row.project_type,
    city: row.city,
    isRemote: Boolean(row.is_remote),
    budgetAmount: Number(row.budget_amount || 0),
    isVolunteer: Boolean(row.is_volunteer),
    applicationDeadline: row.application_deadline,
    deliveryDate: row.delivery_date,
    status: row.status,
    rolesNeeded: parseJson(row.roles_needed_json, []),
    members: parseJson(row.members_json, []),
    tasks: parseJson(row.tasks_json, []),
    meetings: parseJson(row.meetings_json, []),
    expenses: parseJson(row.expenses_json, []),
    files: parseJson(row.files_json, []),
    rightsAgreement: row.rights_agreement,
    createdAt: row.created_at,
  };
}

export function mapProjectApplication(row: any): ProjectApplication {
  return {
    id: row.id,
    projectId: row.project_id,
    applicantUserId: row.applicant_user_id,
    applicantName: row.applicant_name,
    roleTitle: row.role_title,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapOpportunity(row: any): OpportunityItem {
  return {
    id: row.id,
    creatorUserId: row.creator_user_id,
    title: row.title,
    organizerName: row.organizer_name,
    category: row.category,
    discipline: row.discipline as ArtDiscipline,
    city: row.city,
    country: row.country,
    rewardInfo: row.reward_info,
    deadline: row.deadline,
    requirements: row.requirements,
    applicationMethod: row.application_method,
    externalUrl: row.external_url ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapOpportunityApplication(row: any): OpportunityApplication {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    userId: row.user_id,
    applicantName: row.applicant_name,
    portfolioLabel: row.portfolio_label,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapPortfolio(row: any): ArtistPortfolioVersion {
  return {
    id: row.id,
    artistId: row.artist_id,
    userId: row.user_id,
    title: row.title,
    audienceType: row.audience_type,
    identityRole: row.identity_role,
    language: row.language,
    visibility: row.visibility,
    summary: row.summary,
    worksList: parseJson<string[]>(row.works_list_json, []),
    pressQuotes: parseJson<string[]>(row.press_quotes_json, []),
    awards: parseJson<string[]>(row.awards_json, []),
    slug: row.slug,
    createdAt: row.created_at,
  };
}

export function mapCareerRecord(row: any): CareerRecord {
  return {
    id: row.id,
    artistId: row.artist_id,
    userId: row.user_id,
    title: row.title,
    organizationName: row.organization_name,
    venueName: row.venue_name,
    roleTitle: row.role_title,
    eventDate: row.event_date,
    sourceType: row.source_type,
    sourceId: row.source_id ?? undefined,
    isVerifiedRecord: Boolean(row.is_verified_record),
    createdAt: row.created_at,
  };
}

export function mapConversation(db: DbInstance, row: any): Conversation {
  const msgRows = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(row.id) as any[];
  return {
    id: row.id,
    contextType: row.context_type,
    contextId: row.context_id,
    title: row.title,
    participantUserIds: parseJson<string[]>(row.participant_user_ids_json, []),
    lastMessageAt: row.last_message_at,
    messages: msgRows.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderUserId: m.sender_user_id,
      senderName: m.sender_name,
      body: m.body,
      attachmentUrl: m.attachment_url ?? undefined,
      createdAt: m.created_at,
    })),
  };
}

export function mapNotification(row: any): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkView: row.link_view ?? undefined,
    linkEntityId: row.link_entity_id ?? undefined,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

export function mapOrganization(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    orgType: row.org_type as BusinessType,
    ownerUserId: row.owner_user_id,
    city: row.city,
    taxNumber: row.tax_number ?? undefined,
    isVerified: Boolean(row.is_verified),
    managedServiceEnabled: Boolean(row.managed_service_enabled),
    createdAt: row.created_at,
  };
}

export function mapOrganizationMember(row: any): OrganizationMember {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    userName: row.user_name,
    email: row.email,
    roleTitle: row.role_title,
    permissions: parseJson<string[]>(row.permissions_json, []),
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapCulturalProgram(row: any): CulturalProgram {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    title: row.title,
    year: Number(row.year),
    serviceMode: row.service_mode,
    assignedCoordinatorName: row.assigned_coordinator_name ?? undefined,
    totalBudget: Number(row.total_budget || 0),
    events: parseJson(row.events_json, []),
    createdAt: row.created_at,
  };
}

export function mapOriginalsProgram(row: any): OriginalsProgram {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    tagline: row.tagline,
    description: row.description,
    seasonTitle: row.season_title,
    city: row.city,
    applicationDeadline: row.application_deadline,
    eventDate: row.event_date,
    status: row.status,
    juryMembers: parseJson<string[]>(row.jury_members_json, []),
    sponsors: parseJson<string[]>(row.sponsors_json, []),
    applications: parseJson(row.applications_json, []),
  };
}

export function mapFeatureFlag(row: any): FeatureFlag {
  return {
    flagKey: row.flag_key,
    label: row.label,
    enabled: Boolean(row.enabled),
    allowedRoles: parseJson<string[]>(row.allowed_roles_json, ['all']),
    description: row.description,
  };
}

export function mapAuditLog(row: any): AuditLogEntry {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    details: row.details,
    createdAt: row.created_at,
  };
}
