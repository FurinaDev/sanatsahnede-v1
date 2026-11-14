/**
 * Core type definitions for Kültür-Sanat Pazaryeri Platform
 */

export type RoleType =
  | 'artist'
  | 'ensemble_leader'
  | 'business_owner'
  | 'business_member'
  | 'venue_manager'
  | 'technical_provider'
  | 'organizer'
  | 'audience'
  | 'moderator'
  | 'finance_admin'
  | 'verification_officer'
  | 'support'
  | 'admin';

export type ArtDiscipline =
  | 'Müzik'
  | 'Görsel Sanatlar & Sergi'
  | 'Heykel & Enstalasyon'
  | 'Sahne & Tiyatro'
  | 'Edebiyat & Söyleşi'
  | 'Bileşik Sanatlar';

export type MusicGenre =
  | 'Klasik Müzik'
  | 'Caz Müzik'
  | 'Pop'
  | 'Rock'
  | 'Türk Sanat Müziği'
  | 'Türk Halk Müziği'
  | 'Oda Müziği'
  | 'Dünya Müziği';

export type EnsembleType =
  | 'Solo'
  | 'Duo'
  | 'Trio'
  | 'Quartet'
  | 'Quintet'
  | 'Sextet'
  | 'Chamber Ensemble'
  | 'Orkestra'
  | 'Koro'
  | 'Büyük Topluluk'
  | 'Sanat Kolektifi'
  | 'Tiyatro & Performans Ekibi'
  | 'Diğer';

export type Instrument =
  | 'Piyano'
  | 'Keman'
  | 'Viyola'
  | 'Viyolonsel (Çello)'
  | 'Kontrbas'
  | 'Flüt'
  | 'Klarnet'
  | 'Obua'
  | 'Fagot'
  | 'Trompet'
  | 'Trombon'
  | 'Saksafon'
  | 'Akustik Gitar'
  | 'Klasik Gitar'
  | 'Bas Gitar'
  | 'Davul'
  | 'Perküsyon'
  | 'Vokal'
  | 'Arp'
  | 'Kanun'
  | 'Ud'
  | 'Ney';

export type BusinessType =
  | 'Otel ve Konaklama'
  | 'Düğün ve Davet Mekânı'
  | 'Organizasyon Şirketi'
  | 'Festival ve Fuar Organizatörü'
  | 'Restoran ve Kafe'
  | 'Eğlence ve Etkinlik Mekânı'
  | 'Belediye ve Kamu Kurumu'
  | 'Üniversite ve Eğitim Kurumu'
  | 'Kültür Merkezi'
  | 'Konser Salonu'
  | 'Sanat Galerisi & Müze'
  | 'Edebiyat & Sahne Evi'
  | 'Özel Şirket / Kurumsal'
  | 'Bireysel İşveren';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'revision_needed';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
  roles: RoleType[];
  activeRole: RoleType;
  activeOrganizationId?: string | null;
  isVerified: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  kycStatus?: VerificationStatus | 'unsubmitted';
  status?: 'active' | 'suspended';
  isDemo?: boolean;
  createdAt: string;
}

export interface IndividualProfile {
  id: string;
  userId: string;
  slug: string;
  fullName: string;
  stageName?: string;
  title: string;
  discipline?: ArtDiscipline;
  specialtyTags?: string[];
  bioShort: string;
  bioLong: string;
  city: string;
  district: string;
  primaryInstrument: Instrument;
  instruments: Instrument[];
  genres: MusicGenre[];
  education: string;
  experienceYears: number;
  repertoire: string[];
  videoUrls: string[];
  audioSamples: { title: string; duration: string; url: string }[];
  cvUrl?: string;
  avatarUrl: string;
  coverUrl?: string;
  website?: string;
  socialLinks?: { instagram?: string; youtube?: string; linkedin?: string };
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verificationDocUrl?: string;
  ratingAvg: number;
  ratingCount: number;
  completedJobsCount: number;
  cancellationRate: number; // percentage
  isRecommended?: boolean;
  recommendationPeriod?: 'weekly' | 'monthly';
  recommendationBadge?: string;
  educations?: EducationItem[];
  experiences?: ExperienceItem[];
  mediaItems?: MediaItem[];
  createdAt: string;
}

export interface EnsembleMember {
  id: string;
  userId?: string;
  email?: string;
  name: string;
  instrument: Instrument;
  roleTitle: string; // e.g. "1. Keman & Topluluk Lideri"
  joinedYear: number;
  avatarUrl: string;
  status?: 'active' | 'invited' | 'declined';
}

export interface Ensemble {
  id: string;
  leaderUserId: string;
  name: string;
  slug: string;
  discipline?: ArtDiscipline;
  specialtyTags?: string[];
  ensembleType: EnsembleType;
  bio: string;
  foundedYear: number;
  city: string;
  genres: MusicGenre[];
  members: EnsembleMember[];
  repertoire: string[];
  videoUrls: string[];
  avatarUrl: string;
  coverUrl?: string;
  website?: string;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  ratingAvg: number;
  ratingCount: number;
  completedJobsCount: number;
  cancellationRate: number;
  isRecommended?: boolean;
  recommendationPeriod?: 'weekly' | 'monthly';
  recommendationBadge?: string;
  createdAt: string;
}

export interface BusinessProfile {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  businessType: BusinessType;
  disciplines?: ArtDiscipline[];
  facilities?: string[];
  description: string;
  city: string;
  district: string;
  address: string;
  website?: string;
  phone: string;
  email: string;
  taxNumber?: string;
  taxOffice?: string;
  officialTitle?: string;
  logoUrl: string;
  coverUrl?: string;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verificationDocUrl?: string;
  ratingAvg: number;
  ratingCount: number;
  completedBookingsCount: number;
  isRecommended?: boolean;
  recommendationPeriod?: 'weekly' | 'monthly';
  recommendationBadge?: string;
  activeListingsCount?: number;
  createdAt: string;
}

export type ListingStatus =
  | 'draft'
  | 'pending_moderation'
  | 'active'
  | 'assigned'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface Listing {
  id: string;
  businessId: string;
  businessName: string;
  businessType: BusinessType;
  businessLogo: string;
  businessVerified: boolean;
  title: string;
  slug: string;
  description: string;
  discipline?: ArtDiscipline;
  specialtyTags?: string[];
  eventType: string; // e.g. "Lobi Konseri", "Gala Gecesi", "Sergi Açılışı"
  genres: MusicGenre[];
  targetEnsembleType: EnsembleType;
  requiredInstruments: Instrument[];
  performerCount: number;
  durationMins: number;
  eventDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  applicationDeadline: string; // YYYY-MM-DD
  city: string;
  district: string;
  venueName: string;
  isOutdoor: boolean;
  repertoireExpectation: string;
  dressCode: string;
  soundSystemProvided: boolean;
  transportationProvided: boolean;
  accommodationProvided: boolean;
  budgetAmount: number; // TRY
  currency: 'TRY';
  status: ListingStatus;
  isReplacement: boolean;
  originalListingId?: string;
  urgentReason?: string;
  applicationsCount: number;
  createdAt: string;
}

export type ApplicationStatus = 'submitted' | 'shortlisted' | 'selected' | 'rejected' | 'withdrawn';

export interface ListingApplication {
  id: string;
  listingId: string;
  applicantType: 'individual' | 'ensemble';
  applicantId: string; // individualProfile.id or ensemble.id
  applicantUserId: string;
  applicantName: string;
  applicantAvatar: string;
  applicantRating: number;
  applicantCompletedJobs: number;
  applicantCancellationRate: number;
  applicantIsVerified: boolean;
  instrumentsOrType: string;
  genres: MusicGenre[];
  message: string;
  participatingMembers?: string[]; // for ensembles
  status: ApplicationStatus;
  createdAt: string;
}

export type BookingStatus =
  | 'agreement_pending'
  | 'payment_pending'
  | 'confirmed'
  | 'performer_completed'
  | 'employer_completed'
  | 'completed'
  | 'cancelled'
  | 'in_dispute';

export interface Booking {
  id: string;
  listingId: string;
  listingTitle: string;
  businessId: string;
  businessName: string;
  applicationId: string;
  performerType: 'individual' | 'ensemble';
  performerId: string;
  performerName: string;
  performerAvatar: string;
  eventDate: string;
  venueName: string;
  city: string;
  netPayoutAmount: number; // What artist gets
  commissionAmount: number; // Platform fee
  grossAmount: number; // Total paid by business
  commissionModel: 'A_EMPLOYER_PAYS' | 'B_ARTIST_DEDUCTS';
  commissionRate: number; // e.g. 10
  status: BookingStatus;
  performerCompletedAt?: string | null;
  employerCompletedAt?: string | null;
  contractTermsAcceptedByPerformer: boolean;
  contractTermsAcceptedByEmployer: boolean;
  paymentStatus: 'unpaid' | 'held_sandbox' | 'held_live' | 'released' | 'refunded' | 'partially_refunded';
  paymentProvider?: string;
  paymentRef?: string;
  cancellationReason?: string;
  cancelledByRole?: 'performer' | 'employer' | 'admin';
  disputeStatus?: 'none' | 'open' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'employer' | 'performer';
  targetId: string;
  targetName: string;
  scoreOverall: number;
  scoreCommunication: number;
  scoreProfessionalism: number;
  scoreQuality: number;
  comment: string;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  entityName: string;
  accountType: 'artist' | 'ensemble' | 'business';
  documents: { title: string; url: string; type: string }[];
  portfolioUrl?: string;
  videoUrl?: string;
  status: VerificationStatus;
  submittedAt: string;
  adminNote?: string;
}

export type EventCategory =
  | 'Müzik & Konser'
  | 'Sergi & Galeri'
  | 'Atölye & Masterclass'
  | 'Tiyatro & Sahne'
  | 'Festival'
  | 'Diğer';

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  field: string;
  yearStart: string;
  yearEnd: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  organization: string;
  year: string;
  description: string;
}

export interface MediaItem {
  id: string;
  title: string;
  url: string;
  type: 'video' | 'audio';
}

export type AuthModalMode = 'login' | 'register' | 'forgot_password' | null;

export interface PlatformSettings {
  brandName: string;
  tagline: string;
  commissionRate: number; // Default 10%
  commissionModel: 'A_EMPLOYER_PAYS' | 'B_ARTIST_DEDUCTS';
  requireVerificationForListing: boolean;
  autoApproveArtistThreshold: number;
}

export interface EventAnnouncement {
  id: string;
  creatorUserId?: string;
  title: string;
  discipline?: ArtDiscipline;
  category: EventCategory;
  organizerName: string;
  organizerContact?: string;
  venueName: string;
  city: string;
  district?: string;
  eventDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime?: string;
  genres: MusicGenre[];
  performers: string;
  ticketPrice: number; // 0 for free
  isFree: boolean;
  ticketUrl?: string;
  description: string;
  posterUrl?: string;
  status: 'published' | 'pending_moderation' | 'rejected';
  isOriginals?: boolean;
  accessibilitySummary?: string[];
  accessibilityVerifiedBy?: string;
  accessibilityVerifiedAt?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

// ============================================================================
// EXTENDED ECOSYSTEM DOMAIN TYPES (Stages 1-5)
// ============================================================================

export type OfferStatus = 'pending' | 'countered' | 'accepted' | 'rejected' | 'expired';

export interface OfferRevision {
  id: string;
  offerId: string;
  actorUserId: string;
  actorRole: RoleType;
  proposedAmount: number;
  commissionModel: 'A_EMPLOYER_PAYS' | 'B_ARTIST_DEDUCTS';
  commissionRate: number;
  netPayoutAmount: number;
  commissionAmount: number;
  grossAmount: number;
  scopeNotes: string;
  createdAt: string;
}

export interface Offer {
  id: string;
  listingId: string;
  listingTitle?: string;
  applicationId?: string;
  employerUserId: string;
  businessId: string;
  performerType: 'individual' | 'ensemble';
  performerId: string;
  performerUserId: string;
  performerName?: string;
  proposedAmount: number;
  commissionModel: 'A_EMPLOYER_PAYS' | 'B_ARTIST_DEDUCTS';
  commissionRate: number;
  netPayoutAmount: number;
  commissionAmount: number;
  grossAmount: number;
  eventDate: string;
  startTime: string;
  endTime: string;
  expiresAt: string;
  lastActorUserId: string;
  status: OfferStatus;
  revisions?: OfferRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface DigitalContract {
  id: string;
  bookingId: string;
  version: string;
  title: string;
  termsText: string;
  disclaimer: string;
  employerAcceptedAt: string | null;
  performerAcceptedAt: string | null;
  createdAt: string;
}

export interface DisputeRecord {
  id: string;
  bookingId: string;
  openedByUserId: string;
  openedByRole: string;
  reason: string;
  evidenceNotes: string;
  status: 'open' | 'under_review' | 'resolved_refund' | 'resolved_release' | 'closed';
  resolutionNote?: string;
  resolvedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialLedgerEntry {
  id: string;
  bookingId: string;
  entryType: 'payment_hold' | 'commission_accrual' | 'payout_release' | 'refund' | 'partial_refund';
  amount: number;
  currency: 'TRY';
  provider: string;
  providerRef: string;
  mode: 'sandbox' | 'production';
  notes: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  orgType: BusinessType;
  ownerUserId: string;
  city: string;
  taxNumber?: string;
  isVerified: boolean;
  managedServiceEnabled: boolean;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  email: string;
  roleTitle: string;
  permissions: string[];
  status: 'active' | 'invited';
  createdAt: string;
}

export interface VenueAccessibility {
  wheelchairAccess: boolean;
  stepFreeEntrance: boolean;
  accessibleRestroom: boolean;
  elevatorOrRamp: boolean;
  signLanguageInterpretation: boolean;
  liveCaptions: boolean;
  audioDescription: boolean;
  brailleProgram: boolean;
  hearingLoop: boolean;
  companionSupport: boolean;
  accessibleSeating: boolean;
  sensoryFriendly: boolean;
  accessibleTransitInfo: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface VenueSpace {
  id: string;
  venueId: string;
  name: string;
  seatedCapacity: number;
  standingCapacity: number;
  stageDimensions: string;
  technicalEquipment: string[];
}

export interface Venue {
  id: string;
  organizationId?: string;
  managerUserId: string;
  name: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  isVerified: boolean;
  spaces: VenueSpace[];
  accessibility: VenueAccessibility;
  createdAt: string;
}

export interface AvailabilitySlot {
  id: string;
  ownerType: 'artist' | 'ensemble' | 'venue' | 'technical_provider';
  ownerId: string;
  ownerName?: string;
  title: string;
  slotDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  recurrence: 'once' | 'weekly' | 'monthly';
  slotKind: 'available' | 'open_stage' | 'free_rehearsal' | 'booked' | 'blocked';
  isFree: boolean;
  feeAmount: number;
  city: string;
  notes: string;
  createdAt: string;
}

export interface TechnicalProvider {
  id: string;
  userId: string;
  name: string;
  city: string;
  serviceAreas: string[];
  categories: string[];
  description: string;
  staffCapacity: number;
  isVerified: boolean;
  ratingAvg: number;
  completedJobsCount: number;
  equipment: TechnicalEquipmentItem[];
  packages: TechnicalPackage[];
  createdAt: string;
}

export interface TechnicalEquipmentItem {
  id: string;
  providerId: string;
  category: string;
  name: string;
  brandModel: string;
  quantity: number;
  dailyRate: number;
  mode: 'rental' | 'service' | 'sale';
  isAvailable: boolean;
}

export interface TechnicalPackage {
  id: string;
  providerId: string;
  title: string;
  description: string;
  priceAmount: number;
  includedItems: string[];
}

export interface TechnicalRequest {
  id: string;
  requesterUserId: string;
  contextType: 'booking' | 'project' | 'standalone';
  contextId: string;
  title: string;
  city: string;
  eventDate: string;
  requiredEquipment: string[];
  notes: string;
  status: 'open' | 'quoted' | 'accepted' | 'completed';
  createdAt: string;
}

export interface TechnicalQuote {
  id: string;
  requestId: string;
  providerId: string;
  providerName: string;
  amount: number;
  notes: string;
  status: 'submitted' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ProductionWorkspace {
  id: string;
  contextType: 'booking' | 'project';
  contextId: string;
  title: string;
  eventDate: string;
  venueName: string;
  rider: {
    stageSize: string;
    soundRequirements: string;
    lightRequirements: string;
    microphones: string[];
    backline: string[];
    monitors: string;
    ioPatchList: string;
    specialNotes: string;
  };
  stagePlot: {
    id: string;
    kind: 'musician' | 'instrument' | 'mic' | 'monitor' | 'stand' | 'speaker' | 'io';
    label: string;
    x: number;
    y: number;
  }[];
  schedule: {
    id: string;
    time: string;
    title: string;
    ownerRole: string;
  }[];
  tasks: {
    id: string;
    title: string;
    assigneeRole: string;
    dueDate: string;
    completed: boolean;
  }[];
  logistics: {
    travelSummary: string;
    accommodationSummary: string;
    transferNotes: string;
    arrivalTime: string;
  };
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  ownerUserId: string;
  ownerName: string;
  title: string;
  description: string;
  disciplines: ArtDiscipline[];
  projectType: string;
  city: string;
  isRemote: boolean;
  budgetAmount: number;
  isVolunteer: boolean;
  applicationDeadline: string;
  deliveryDate: string;
  status: 'draft' | 'pending_moderation' | 'published' | 'recruiting' | 'in_production' | 'rehearsal' | 'completed' | 'archived' | 'rejected';
  rolesNeeded: { id: string; roleTitle: string; discipline: string; count: number }[];
  members: { id: string; userId: string; name: string; roleTitle: string; status: 'invited' | 'active' | 'left' }[];
  tasks: { id: string; title: string; assigneeName: string; dueDate: string; status: 'todo' | 'doing' | 'done' }[];
  meetings: { id: string; title: string; meetingDate: string; notes: string }[];
  expenses: { id: string; title: string; amount: number; recordedAt: string }[];
  files: { id: string; name: string; url: string; uploadedBy: string }[];
  rightsAgreement: string;
  createdAt: string;
}

export interface ProjectApplication {
  id: string;
  projectId: string;
  applicantUserId: string;
  applicantName: string;
  roleTitle: string;
  message: string;
  status: 'submitted' | 'shortlisted' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface OpportunityItem {
  id: string;
  creatorUserId: string;
  title: string;
  organizerName: string;
  category: string;
  discipline: ArtDiscipline;
  city: string;
  country: string;
  rewardInfo: string;
  deadline: string;
  requirements: string;
  applicationMethod: 'internal' | 'external';
  externalUrl?: string;
  status: 'pending_moderation' | 'published' | 'rejected';
  createdAt: string;
}

export interface OpportunityApplication {
  id: string;
  opportunityId: string;
  userId: string;
  applicantName: string;
  portfolioLabel: string;
  note: string;
  status: 'submitted' | 'in_review' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ArtistPortfolioVersion {
  id: string;
  artistId: string;
  userId: string;
  title: string;
  audienceType: string; // Kurum, Festival, Akademik
  identityRole: string; // Bireysel Sanatçı, Besteci, Eğitmen, Küratör
  language: 'tr' | 'en';
  visibility: 'public' | 'unlisted' | 'private';
  summary: string;
  worksList: string[];
  pressQuotes: string[];
  awards: string[];
  slug: string;
  createdAt: string;
}

export interface CareerRecord {
  id: string;
  artistId: string;
  userId: string;
  title: string;
  organizationName: string;
  venueName: string;
  roleTitle: string;
  eventDate: string;
  sourceType: 'booking' | 'project' | 'manual';
  sourceId?: string;
  isVerifiedRecord: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  contextType: string;
  contextId: string;
  title: string;
  participantUserIds: string[];
  lastMessageAt: string;
  messages: {
    id: string;
    conversationId: string;
    senderUserId: string;
    senderName: string;
    body: string;
    attachmentUrl?: string;
    createdAt: string;
  }[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  linkView?: string;
  linkEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CulturalProgram {
  id: string;
  organizationId: string;
  organizationName: string;
  title: string;
  year: number;
  serviceMode: 'self_service' | 'managed_service';
  assignedCoordinatorName?: string;
  totalBudget: number;
  events: {
    id: string;
    month: string;
    title: string;
    discipline: ArtDiscipline;
    venueName: string;
    budget: number;
    status: 'planned' | 'recruiting' | 'confirmed' | 'completed';
  }[];
  createdAt: string;
}

export interface OriginalsProgram {
  id: string;
  code: string;
  title: string;
  tagline: string;
  description: string;
  seasonTitle: string;
  city: string;
  applicationDeadline: string;
  eventDate: string;
  status: 'open' | 'jury_review' | 'published' | 'archived';
  juryMembers: string[];
  sponsors: string[];
  applications: {
    id: string;
    userId: string;
    applicantName: string;
    discipline: string;
    pitch: string;
    juryScore?: number;
    status: 'submitted' | 'shortlisted' | 'selected' | 'rejected';
  }[];
}

export interface FeatureFlag {
  flagKey: string;
  label: string;
  enabled: boolean;
  allowedRoles: string[];
  description: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  createdAt: string;
}



