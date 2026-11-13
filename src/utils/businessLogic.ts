/**
 * Business logic and pure calculations for Kültür-Sanat Pazaryeri Platform
 * Includes commission models (Model A & Model B), cancellation rate algorithms,
 * and booking state transitions.
 */

export type CommissionModel = 'A_EMPLOYER_PAYS' | 'B_ARTIST_DEDUCTS';

export interface CommissionCalculation {
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  performerPayout: number;
  employerTotal: number;
  model: CommissionModel;
}

/**
 * Calculates commission and net payouts based on platform commission model.
 * Model A: Employer pays commission on top of performer's net quote.
 * Model B: Commission is deducted from the total paid by the employer.
 */
export function calculateCommission(
  baseAmount: number,
  commissionRatePct: number = 10,
  model: CommissionModel = 'A_EMPLOYER_PAYS'
): CommissionCalculation {
  if (baseAmount < 0) {
    throw new Error('Amount cannot be negative');
  }
  const rate = Math.max(0, Math.min(100, commissionRatePct));
  const commissionAmount = Math.round((baseAmount * rate) / 100);

  if (model === 'A_EMPLOYER_PAYS') {
    return {
      grossAmount: baseAmount + commissionAmount,
      commissionRate: rate,
      commissionAmount,
      performerPayout: baseAmount,
      employerTotal: baseAmount + commissionAmount,
      model: 'A_EMPLOYER_PAYS',
    };
  } else {
    return {
      grossAmount: baseAmount,
      commissionRate: rate,
      commissionAmount,
      performerPayout: baseAmount - commissionAmount,
      employerTotal: baseAmount,
      model: 'B_ARTIST_DEDUCTS',
    };
  }
}

/**
 * Calculates performer's cancellation rate as a percentage.
 * Only performer-initiated cancellations for confirmed bookings count.
 */
export function calculateCancellationRate(
  performerCancelledCount: number,
  totalConfirmedBookings: number
): number {
  if (totalConfirmedBookings <= 0) return 0;
  if (performerCancelledCount <= 0) return 0;
  const rate = (performerCancelledCount / totalConfirmedBookings) * 100;
  return Math.min(100, Math.round(rate * 10) / 10);
}

export type BookingStatus =
  | 'application_received'
  | 'shortlisted'
  | 'selected'
  | 'agreement_pending'
  | 'payment_pending'
  | 'confirmed'
  | 'performer_completed'
  | 'employer_completed'
  | 'payout_processing'
  | 'completed'
  | 'cancelled'
  | 'in_dispute'
  | 'refund_in_progress';

export type UserRole = 'artist' | 'ensemble_leader' | 'business_owner' | 'admin';

/**
 * Validates whether a state transition is allowed in the booking state machine.
 */
export function canTransitionBookingStatus(
  current: BookingStatus,
  target: BookingStatus,
  role: UserRole
): boolean {
  if (role === 'admin') return true;

  switch (current) {
    case 'selected':
      return target === 'agreement_pending';

    case 'agreement_pending':
      // Both sides can accept agreement to advance to payment
      return target === 'payment_pending' || target === 'cancelled';

    case 'payment_pending':
      // Employer pays to confirm booking
      if (role === 'business_owner') {
        return target === 'confirmed' || target === 'cancelled';
      }
      return false;

    case 'confirmed':
      // Either side can report completion, or report cancellation / dispute
      if (role === 'artist' || role === 'ensemble_leader') {
        return target === 'performer_completed' || target === 'cancelled' || target === 'in_dispute';
      }
      if (role === 'business_owner') {
        return target === 'employer_completed' || target === 'cancelled' || target === 'in_dispute';
      }
      return false;

    case 'performer_completed':
      // Waiting for employer to confirm, which finishes the service
      if (role === 'business_owner') {
        return target === 'completed' || target === 'in_dispute';
      }
      return false;

    case 'employer_completed':
      // Waiting for performer to confirm
      if (role === 'artist' || role === 'ensemble_leader') {
        return target === 'completed' || target === 'in_dispute';
      }
      return false;

    default:
      return false;
  }
}

/**
 * Checks if a business profile is verified and authorized to publish listings.
 */
export function canBusinessCreateListing(profile: { isVerified: boolean; verificationStatus: string }): boolean {
  return profile.isVerified === true && profile.verificationStatus === 'approved';
}

/**
 * Currency formatter for Turkish Lira
 */
export function formatCurrencyTRY(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Checks whether two date+time ranges overlap on the same calendar day.
 */
export function hasTimeConflict(
  slotA: { date: string; startTime: string; endTime: string },
  slotB: { date: string; startTime: string; endTime: string }
): boolean {
  if (slotA.date !== slotB.date) return false;
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map((n) => Number(n) || 0);
    return h * 60 + m;
  };
  const startA = toMinutes(slotA.startTime);
  const endA = toMinutes(slotA.endTime);
  const startB = toMinutes(slotB.startTime);
  const endB = toMinutes(slotB.endTime);
  return startA < endB && startB < endA;
}

/**
 * Dual-confirmation payout guard: both performer and employer must confirm
 * completion and there must be no active dispute.
 */
export function canReleaseEscrowPayout(input: {
  performerCompletedAt?: string | null;
  employerCompletedAt?: string | null;
  disputeStatus?: string;
  paymentStatus?: string;
}): boolean {
  if (!input.performerCompletedAt || !input.employerCompletedAt) return false;
  if (input.disputeStatus === 'open') return false;
  if (input.paymentStatus === 'released' || input.paymentStatus === 'refunded') return false;
  return true;
}

export interface SmartMatchExplanation {
  entityId: string;
  entityName: string;
  criteria: {
    label: string;
    level: 'tam' | 'yüksek' | 'uygun' | 'kısmi';
    reason: string;
  }[];
  matchedCriteriaCount: number;
}

/**
 * Explainable, auditable smart match helper (never reduces a human artist to a single opaque score).
 */
export function explainArtistListingMatch(
  listing: {
    city: string;
    discipline?: string;
    genres: string[];
    requiredInstruments: string[];
    eventDate: string;
    soundSystemProvided: boolean;
  },
  artist: {
    id: string;
    fullName: string;
    city: string;
    discipline?: string;
    genres: string[];
    instruments: string[];
    isVerified: boolean;
    completedJobsCount: number;
  },
  hasCalendarConflict: boolean
): SmartMatchExplanation {
  const criteria: SmartMatchExplanation['criteria'] = [];

  criteria.push({
    label: 'Tarih Uygunluğu',
    level: hasCalendarConflict ? 'kısmi' : 'yüksek',
    reason: hasCalendarConflict
      ? `${listing.eventDate} tarihinde takvim çakışması mevcut`
      : `${listing.eventDate} tarihinde takvim müsait`,
  });

  const cityMatch = artist.city.toLowerCase() === listing.city.toLowerCase();
  criteria.push({
    label: 'Konum Uyumu',
    level: cityMatch ? 'tam' : 'uygun',
    reason: cityMatch
      ? `Aynı şehir (${listing.city})`
      : `${artist.city} merkezli — seyahat planlaması gerekir`,
  });

  const genreOverlap = artist.genres.filter((g) => listing.genres.includes(g));
  const instOverlap = artist.instruments.filter((i) => listing.requiredInstruments.includes(i));
  criteria.push({
    label: 'Repertuvar & Enstrüman Uyumu',
    level: genreOverlap.length > 0 && instOverlap.length > 0 ? 'tam' : genreOverlap.length > 0 || instOverlap.length > 0 ? 'yüksek' : 'kısmi',
    reason:
      instOverlap.length > 0 || genreOverlap.length > 0
        ? `Eşleşen alanlar: ${[...instOverlap, ...genreOverlap].join(', ')}`
        : 'Alternatif disiplin / repertuvar uyarlaması gerekir',
  });

  criteria.push({
    label: 'Doğrulama & Tecrübe',
    level: artist.isVerified && artist.completedJobsCount > 0 ? 'yüksek' : 'uygun',
    reason: artist.isVerified
      ? `Doğrulanmış profil · ${artist.completedJobsCount} tamamlanan sahne`
      : 'Doğrulama süreci tamamlanmamış',
  });

  const matchedCriteriaCount = criteria.filter((c) => c.level === 'tam' || c.level === 'yüksek').length;

  return {
    entityId: artist.id,
    entityName: artist.fullName,
    criteria,
    matchedCriteriaCount,
  };
}

