import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCommission,
  calculateCancellationRate,
  canTransitionBookingStatus,
  canBusinessCreateListing,
  hasTimeConflict,
  canReleaseEscrowPayout,
  explainArtistListingMatch,
} from './businessLogic';

test('calculateCommission Model A (Employer pays on top)', () => {
  const result = calculateCommission(20000, 10, 'A_EMPLOYER_PAYS');
  assert.equal(result.performerPayout, 20000);
  assert.equal(result.commissionAmount, 2000);
  assert.equal(result.employerTotal, 22000);
  assert.equal(result.model, 'A_EMPLOYER_PAYS');
});

test('calculateCommission Model B (Artist deducts commission)', () => {
  const result = calculateCommission(20000, 10, 'B_ARTIST_DEDUCTS');
  assert.equal(result.employerTotal, 20000);
  assert.equal(result.commissionAmount, 2000);
  assert.equal(result.performerPayout, 18000);
  assert.equal(result.model, 'B_ARTIST_DEDUCTS');
});

test('calculateCancellationRate calculates correctly', () => {
  assert.equal(calculateCancellationRate(1, 10), 10);
  assert.equal(calculateCancellationRate(0, 15), 0);
  assert.equal(calculateCancellationRate(2, 20), 10);
  assert.equal(calculateCancellationRate(0, 0), 0);
  assert.equal(calculateCancellationRate(3, 7), 42.9);
});

test('canTransitionBookingStatus protects states', () => {
  assert.equal(
    canTransitionBookingStatus('confirmed', 'performer_completed', 'business_owner'),
    false
  );
  assert.equal(
    canTransitionBookingStatus('confirmed', 'performer_completed', 'artist'),
    true
  );
  assert.equal(
    canTransitionBookingStatus('performer_completed', 'completed', 'business_owner'),
    true
  );
});

test('canBusinessCreateListing requires verified status', () => {
  assert.equal(canBusinessCreateListing({ isVerified: true, verificationStatus: 'approved' }), true);
  assert.equal(canBusinessCreateListing({ isVerified: false, verificationStatus: 'pending' }), false);
  assert.equal(canBusinessCreateListing({ isVerified: false, verificationStatus: 'rejected' }), false);
});

test('hasTimeConflict detects overlapping intervals on same day only', () => {
  assert.equal(
    hasTimeConflict(
      { date: '2027-01-15', startTime: '14:00', endTime: '16:00' },
      { date: '2027-01-15', startTime: '15:00', endTime: '17:00' }
    ),
    true
  );
  // Touching boundary 16:00 -> 16:00 should not conflict
  assert.equal(
    hasTimeConflict(
      { date: '2027-01-15', startTime: '14:00', endTime: '16:00' },
      { date: '2027-01-15', startTime: '16:00', endTime: '18:00' }
    ),
    false
  );
  // Different date should not conflict
  assert.equal(
    hasTimeConflict(
      { date: '2027-01-15', startTime: '14:00', endTime: '16:00' },
      { date: '2027-01-16', startTime: '14:00', endTime: '16:00' }
    ),
    false
  );
});

test('canReleaseEscrowPayout requires dual completion and no open dispute', () => {
  assert.equal(
    canReleaseEscrowPayout({
      performerCompletedAt: '2027-01-01T10:00:00Z',
      employerCompletedAt: null,
      disputeStatus: 'none',
      paymentStatus: 'held_sandbox',
    }),
    false
  );
  assert.equal(
    canReleaseEscrowPayout({
      performerCompletedAt: '2027-01-01T10:00:00Z',
      employerCompletedAt: '2027-01-01T11:00:00Z',
      disputeStatus: 'open',
      paymentStatus: 'held_sandbox',
    }),
    false
  );
  assert.equal(
    canReleaseEscrowPayout({
      performerCompletedAt: '2027-01-01T10:00:00Z',
      employerCompletedAt: '2027-01-01T11:00:00Z',
      disputeStatus: 'none',
      paymentStatus: 'held_sandbox',
    }),
    true
  );
});

test('explainArtistListingMatch produces explainable criteria without single opaque score', () => {
  const explanation = explainArtistListingMatch(
    {
      city: 'İstanbul',
      genres: ['Caz Müzik'],
      requiredInstruments: ['Piyano'],
      eventDate: '2027-02-10',
      soundSystemProvided: true,
    },
    {
      id: 'artist_1',
      fullName: 'Efe Özkan',
      city: 'İstanbul',
      genres: ['Caz Müzik', 'Klasik Müzik'],
      instruments: ['Piyano'],
      isVerified: true,
      completedJobsCount: 4,
    },
    false
  );

  assert.equal(explanation.criteria.length, 4);
  assert.equal(explanation.matchedCriteriaCount, 4);
  assert.ok(explanation.criteria.some((c) => c.label === 'Konum Uyumu' && c.level === 'tam'));
});

