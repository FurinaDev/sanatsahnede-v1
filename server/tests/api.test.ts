import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import { createApp } from '../../server';

interface SessionClient {
  cookie: string;
  request: (urlPath: string, options?: { method?: string; body?: any }) => Promise<{ status: number; data: any; rawText: string; headers: Headers }>;
}

function createClient(baseUrl: string): SessionClient {
  const state = { cookie: '' };
  return {
    get cookie() {
      return state.cookie;
    },
    set cookie(v: string) {
      state.cookie = v;
    },
    async request(urlPath: string, options: { method?: string; body?: any } = {}) {
      const headers: Record<string, string> = {};
      if (state.cookie) headers['Cookie'] = state.cookie;
      if (options.body !== undefined) headers['Content-Type'] = 'application/json';

      const res = await fetch(`${baseUrl}${urlPath}`, {
        method: options.method || 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        const cookiePart = setCookie.split(';')[0];
        if (cookiePart.includes('=;') || cookiePart.endsWith('=')) {
          state.cookie = '';
        } else {
          state.cookie = cookiePart;
        }
      }

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }
      return { status: res.status, data, rawText, headers: res.headers };
    },
  };
}

function withTestServer() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanatsahnede-test-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const { app, db } = createApp({ dbPath });
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    baseUrl,
    db,
    cleanup: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      try {
        db.close();
      } catch {
        // ignore
      }
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}

test('Auth security: unauthenticated bootstrap, password check, privilege escalation & demo-login toggle', async () => {
  const ctx = withTestServer();
  try {
    const guest = createClient(ctx.baseUrl);
    const boot = await guest.request('/api/bootstrap');
    assert.equal(boot.status, 200);
    assert.equal(boot.data.currentUser, null);

    // Wrong password fails 401
    const badLogin = await guest.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'efeozkaniletisim@gmail.com', password: 'WrongPassword!' },
    });
    assert.equal(badLogin.status, 401);

    // Registering admin publicly is rejected (403)
    const adminReg = await guest.request('/api/auth/register', {
      method: 'POST',
      body: { email: 'hacker@test.com', password: 'Password123!', firstName: 'Hack', role: 'admin' },
    });
    assert.equal(adminReg.status, 403);

    // Registering normal artist starts unverified
    const regRes = await guest.request('/api/auth/register', {
      method: 'POST',
      body: { email: 'yeni.sanatci@test.com', password: 'Password123!', firstName: 'Ayşe', lastName: 'Yılmaz', role: 'artist' },
    });
    assert.equal(regRes.status, 201);
    assert.equal(regRes.data.user.isVerified, false);

    // Non-admin cannot access admin overview
    const forbiddenAdmin = await guest.request('/api/admin/overview');
    assert.equal(forbiddenAdmin.status, 403);

    // Demo login disabled check
    const prevFlag = process.env.ENABLE_DEMO_QUICK_LOGIN;
    process.env.ENABLE_DEMO_QUICK_LOGIN = 'false';
    try {
      const disabledDemo = await guest.request('/api/auth/demo-login', {
        method: 'POST',
        body: { email: 'admin@sahnesanat.com' },
      });
      assert.equal(disabledDemo.status, 403);
    } finally {
      if (prevFlag === undefined) delete process.env.ENABLE_DEMO_QUICK_LOGIN;
      else process.env.ENABLE_DEMO_QUICK_LOGIN = prevFlag;
    }
  } finally {
    await ctx.cleanup();
  }
});

test('IDOR protection & moderation isolation', async () => {
  const ctx = withTestServer();
  try {
    const artistA = createClient(ctx.baseUrl);
    const loginA = await artistA.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'efeozkaniletisim@gmail.com', password: 'DemoSanat123!' },
    });
    assert.equal(loginA.status, 200);

    // Artist A tries to mutate Selin's ensemble -> 403
    const ensPatch = await artistA.request('/api/ensembles/ensemble_istanbul_string_trio/members', {
      method: 'POST',
      body: { name: 'Yetkisiz Üye', instrument: 'Keman' },
    });
    assert.equal(ensPatch.status, 403);

    // Artist submits event -> stays pending_moderation and is hidden from anonymous GET /api/events
    const evCreate = await artistA.request('/api/events', {
      method: 'POST',
      body: {
        title: 'Moderasyon Bekleyen Gizli Konser',
        category: 'Müzik & Konser',
        organizerName: 'Efe Özkan',
        venueName: 'Kadıköy Salon',
        city: 'İstanbul',
        eventDate: '2027-05-01',
        startTime: '20:00',
        description: 'Onay öncesi gizli etkinlik',
      },
    });
    assert.equal(evCreate.status, 201);
    assert.equal(evCreate.data.event.status, 'pending_moderation');

    const anon = createClient(ctx.baseUrl);
    const anonEvents = await anon.request('/api/events');
    assert.equal(anonEvents.status, 200);
    assert.equal(
      anonEvents.data.events.some((e: any) => e.id === evCreate.data.event.id),
      false
    );
  } finally {
    await ctx.cleanup();
  }
});

test('Full cross-account marketplace flow: listing -> moderation -> apply -> select -> contract -> escrow hold -> dual confirmation -> verified career record & review', async () => {
  const ctx = withTestServer();
  try {
    const biz = createClient(ctx.baseUrl);
    const artist = createClient(ctx.baseUrl);
    const mod = createClient(ctx.baseUrl);

    await biz.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'etkinlik@grandbosphorus.com', password: 'DemoSanat123!' },
    });
    await artist.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'efeozkaniletisim@gmail.com', password: 'DemoSanat123!' },
    });
    await mod.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'moderator@sanatsahnede.com', password: 'DemoSanat123!' },
    });

    // 1. Business creates listing -> pending_moderation
    const createListRes = await biz.request('/api/listings', {
      method: 'POST',
      body: {
        title: 'Boğaz Akşamı Solo Piyano Gala',
        description: 'Grand Bosphorus balo salonu için piyano resitali.',
        city: 'İstanbul',
        venueName: 'Grand Bosphorus Balo Salonu',
        eventDate: '2027-06-15',
        budgetAmount: 30000,
      },
    });
    assert.equal(createListRes.status, 201);
    const listingId = createListRes.data.listing.id;
    assert.equal(createListRes.data.listing.status, 'pending_moderation');

    // 2. Moderator approves listing
    const modRes = await mod.request(`/api/admin/moderation/listing/${listingId}`, {
      method: 'POST',
      body: { decision: 'approve' },
    });
    assert.equal(modRes.status, 200);
    assert.equal(modRes.data.listing.status, 'active');

    // 3. Verified Artist applies
    const applyRes = await artist.request('/api/applications', {
      method: 'POST',
      body: {
        listingId,
        applicantType: 'individual',
        message: 'Klasik ve caz repertuvarımla bu sahneye hazırım.',
      },
    });
    assert.equal(applyRes.status, 201);
    const appId = applyRes.data.application.id;

    // 4. Business selects applicant -> booking agreement_pending + contract + production workspace
    const selectRes = await biz.request(`/api/applications/${appId}/status`, {
      method: 'PATCH',
      body: { status: 'selected' },
    });
    assert.equal(selectRes.status, 200);
    const bookingId = selectRes.data.booking.id;
    assert.equal(selectRes.data.booking.status, 'agreement_pending');

    // 5. Artist accepts contract -> payment_pending
    const acceptContractRes = await artist.request(`/api/bookings/${bookingId}/accept-contract`, { method: 'POST' });
    assert.equal(acceptContractRes.status, 200);
    assert.equal(acceptContractRes.data.booking.status, 'payment_pending');

    // 6. Business pays via sandbox iyzico checkout -> confirmed + held_sandbox
    const checkoutRes = await biz.request(`/api/bookings/${bookingId}/checkout`, {
      method: 'POST',
      body: { confirmSandboxNow: true },
    });
    assert.equal(checkoutRes.status, 200);
    assert.equal(checkoutRes.data.booking.status, 'confirmed');
    assert.equal(checkoutRes.data.booking.paymentStatus, 'held_sandbox');

    // Review before completion MUST be rejected (400)
    const prematureReview = await biz.request(`/api/bookings/${bookingId}/reviews`, {
      method: 'POST',
      body: { scoreOverall: 5, scoreQuality: 5, scoreCommunication: 5, scoreProfessionalism: 5, comment: 'Erken yorum' },
    });
    assert.equal(prematureReview.status, 400);

    // 7. Single completion by performer does NOT release escrow
    const perfDone = await artist.request(`/api/bookings/${bookingId}/complete`, { method: 'POST' });
    assert.equal(perfDone.status, 200);
    assert.equal(perfDone.data.booking.status, 'performer_completed');
    assert.equal(perfDone.data.booking.paymentStatus, 'held_sandbox');

    // 8. Second completion by employer releases payout + creates verified career record
    const empDone = await biz.request(`/api/bookings/${bookingId}/complete`, { method: 'POST' });
    assert.equal(empDone.status, 200);
    assert.equal(empDone.data.booking.status, 'completed');
    assert.equal(empDone.data.booking.paymentStatus, 'released');

    // 9. Career passport now contains verified booking record
    const passportRes = await artist.request('/api/career-passport?artistId=artist_efe_ozkan');
    assert.equal(passportRes.status, 200);
    assert.ok(
      passportRes.data.records.some((r: any) => r.sourceType === 'booking' && r.sourceId === bookingId && r.isVerifiedRecord)
    );

    // 10. Verified review succeeds after completion
    const validReview = await biz.request(`/api/bookings/${bookingId}/reviews`, {
      method: 'POST',
      body: { scoreOverall: 5, scoreQuality: 5, scoreCommunication: 5, scoreProfessionalism: 5, comment: 'Kusursuz performans.' },
    });
    assert.equal(validReview.status, 201);

    // 11. Participant can access Production Desk, unrelated third user is blocked 403
    const prodOk = await artist.request(`/api/production/booking/${bookingId}`);
    assert.equal(prodOk.status, 200);

    const outsider = createClient(ctx.baseUrl);
    await outsider.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'izleyici@sanatsever.com', password: 'DemoSanat123!' },
    });
    const prodBlocked = await outsider.request(`/api/production/booking/${bookingId}`);
    assert.equal(prodBlocked.status, 403);
  } finally {
    await ctx.cleanup();
  }
});

test('Offers negotiation, Dispute freeze/resolve & Admin Feature Flag kill-switch', async () => {
  const ctx = withTestServer();
  try {
    const biz = createClient(ctx.baseUrl);
    const artist = createClient(ctx.baseUrl);
    const admin = createClient(ctx.baseUrl);

    await biz.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'etkinlik@grandbosphorus.com', password: 'DemoSanat123!' },
    });
    await artist.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'efeozkaniletisim@gmail.com', password: 'DemoSanat123!' },
    });
    await admin.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@sahnesanat.com', password: 'DemoSanat123!' },
    });

    // Offer -> Counter -> Accept creates booking
    const boot = await biz.request('/api/bootstrap');
    const activeListing = boot.data.listings[0];
    assert.ok(activeListing);

    const offerRes = await biz.request('/api/offers', {
      method: 'POST',
      body: {
        listingId: activeListing.id,
        performerId: 'artist_efe_ozkan',
        performerType: 'individual',
        proposedAmount: 24000,
        scopeNotes: 'İlk teklif',
      },
    });
    assert.equal(offerRes.status, 201);
    const offerId = offerRes.data.offer.id;

    const counterRes = await artist.request(`/api/offers/${offerId}/counter`, {
      method: 'POST',
      body: { proposedAmount: 26000, scopeNotes: 'Ek repertuvar ile karşı teklif' },
    });
    assert.equal(counterRes.status, 200);
    assert.equal(counterRes.data.offer.status, 'countered');

    const acceptRes = await biz.request(`/api/offers/${offerId}/accept`, { method: 'POST' });
    assert.equal(acceptRes.status, 200);
    const offerBookingId = acceptRes.data.booking.id;

    // Accept contract & pay -> open dispute freezes booking -> admin resolves refund
    await artist.request(`/api/bookings/${offerBookingId}/accept-contract`, { method: 'POST' });
    await biz.request(`/api/bookings/${offerBookingId}/checkout`, { method: 'POST', body: { confirmSandboxNow: true } });

    const dispRes = await biz.request(`/api/bookings/${offerBookingId}/dispute`, {
      method: 'POST',
      body: { reason: 'Saat gecikmesi uyuşmazlığı', evidenceNotes: 'Sahne giriş kaydı' },
    });
    assert.equal(dispRes.status, 201);
    assert.equal(dispRes.data.booking.status, 'in_dispute');

    const resolvedRes = await admin.request(`/api/admin/disputes/${dispRes.data.dispute.id}/resolve`, {
      method: 'POST',
      body: { outcome: 'resolved_refund', resolutionNote: 'İnceleme sonucu işverene iade' },
    });
    assert.equal(resolvedRes.status, 200);
    assert.equal(resolvedRes.data.booking.paymentStatus, 'refunded');

    // Feature flag toggle blocks module with 403
    const flagOff = await admin.request('/api/admin/feature-flags/project_lab', {
      method: 'PATCH',
      body: { enabled: false },
    });
    assert.equal(flagOff.status, 200);

    const blockedProj = await artist.request('/api/projects');
    assert.equal(blockedProj.status, 403);
  } finally {
    await ctx.cleanup();
  }
});

test('Ecosystem endpoints: Open Stage 409 conflict, .ics export, Project Lab, Technical Match, Artist Studio QR, Culture Desk & Originals', async () => {
  const ctx = withTestServer();
  try {
    const venueUser = createClient(ctx.baseUrl);
    const artist = createClient(ctx.baseUrl);
    const tech = createClient(ctx.baseUrl);
    const organizer = createClient(ctx.baseUrl);

    await venueUser.request('/api/auth/login', { method: 'POST', body: { email: 'sahne@kadikoyakustik.com', password: 'DemoSanat123!' } });
    await artist.request('/api/auth/login', { method: 'POST', body: { email: 'efeozkaniletisim@gmail.com', password: 'DemoSanat123!' } });
    await tech.request('/api/auth/login', { method: 'POST', body: { email: 'teknik@sesvesahne.com', password: 'DemoSanat123!' } });
    await organizer.request('/api/auth/login', { method: 'POST', body: { email: 'festival@istanbuloda.org', password: 'DemoSanat123!' } });

    const boot = await venueUser.request('/api/bootstrap');
    const myVenue = boot.data.venues.find((v: any) => v.managerUserId === 'user_venue_akm');
    assert.ok(myVenue);

    // Open stage slot creation + 409 overlap protection
    const slot1 = await venueUser.request('/api/availability', {
      method: 'POST',
      body: {
        ownerType: 'venue',
        ownerId: myVenue.id,
        title: 'Genç Oda Müziği Provası',
        slotDate: '2027-08-10',
        startTime: '14:00',
        endTime: '16:00',
        slotKind: 'free_rehearsal',
        isFree: true,
        city: 'İstanbul',
      },
    });
    assert.equal(slot1.status, 201);

    const slotConflict = await venueUser.request('/api/availability', {
      method: 'POST',
      body: {
        ownerType: 'venue',
        ownerId: myVenue.id,
        title: 'Çakışan Kayıt',
        slotDate: '2027-08-10',
        startTime: '15:00',
        endTime: '17:00',
        slotKind: 'open_stage',
        isFree: true,
        city: 'İstanbul',
      },
    });
    assert.equal(slotConflict.status, 409);

    // .ics export returns text/calendar
    const firstEvent = boot.data.events[0];
    const icsRes = await artist.request(`/api/events/${firstEvent.id}/ics`);
    assert.equal(icsRes.status, 200);
    assert.ok((icsRes.headers.get('content-type') || '').includes('text/calendar'));
    assert.ok(icsRes.rawText.includes('BEGIN:VCALENDAR'));

    // Project Lab apply + decide adds member
    const projCreate = await organizer.request('/api/projects', {
      method: 'POST',
      body: {
        title: 'Anadolu Caz Köprüleri',
        description: 'Ortak üretim sahne projesi.',
        rolesNeeded: [{ id: 'r1', roleTitle: 'Piyanist', discipline: 'Müzik', count: 1 }],
      },
    });
    assert.equal(projCreate.status, 201);
    const projId = projCreate.data.project.id;

    const projApply = await artist.request(`/api/projects/${projId}/apply`, {
      method: 'POST',
      body: { roleTitle: 'Piyanist', message: 'Katılmak istiyorum' },
    });
    assert.equal(projApply.status, 201);

    const projDecide = await organizer.request(`/api/projects/${projId}/applications/${projApply.data.application.id}/decide`, {
      method: 'POST',
      body: { decision: 'accepted' },
    });
    assert.equal(projDecide.status, 200);
    assert.ok(projDecide.data.project.members.some((m: any) => m.userId === 'user_artist_efe'));

    // Technical Match: request -> quote -> accept creates booked slot
    const treq = await organizer.request('/api/technical-requests', {
      method: 'POST',
      body: {
        title: 'Açılış Konseri Ses Sistemi',
        city: 'İstanbul',
        eventDate: '2027-09-12',
        requiredEquipment: ['Dijital Mikser'],
      },
    });
    assert.equal(treq.status, 201);
    const tquote = await tech.request(`/api/technical-requests/${treq.data.request.id}/quotes`, {
      method: 'POST',
      body: { amount: 15000, notes: 'Kurulum dahil' },
    });
    assert.equal(tquote.status, 201);
    const taccept = await organizer.request(`/api/technical-quotes/${tquote.data.quote.id}/accept`, { method: 'POST' });
    assert.equal(taccept.status, 200);
    assert.equal(taccept.data.request.status, 'accepted');

    // Artist Studio EPK & live PNG QR generation
    const epkRes = await artist.request('/api/artist-studio', {
      method: 'POST',
      body: { title: 'Test Festival EPK', summary: 'Piyanist EPK özeti' },
    });
    assert.equal(epkRes.status, 201);
    const qrRes = await artist.request(`/api/artist-studio/${epkRes.data.portfolio.id}/qr`);
    assert.equal(qrRes.status, 200);
    assert.ok(qrRes.data.qrDataUrl.startsWith('data:image/png;base64,'));

    // Culture Desk managed_service switch
    const orgId = boot.data.organizations[0].id;
    const progRes = await organizer.request('/api/culture-desk/programs', {
      method: 'POST',
      body: { organizationId: orgId, title: '2027 Oda Müziği Programı', serviceMode: 'self_service', totalBudget: 200000 },
    });
    assert.equal(progRes.status, 201);
    const switchMode = await organizer.request(`/api/culture-desk/programs/${progRes.data.program.id}/service-mode`, {
      method: 'PATCH',
      body: { serviceMode: 'managed_service' },
    });
    assert.equal(switchMode.status, 200);
    assert.equal(switchMode.data.program.serviceMode, 'managed_service');

    // Originals application
    const origId = boot.data.originalsPrograms[0].id;
    const origApply = await artist.request(`/api/originals/${origId}/apply`, {
      method: 'POST',
      body: { discipline: 'Müzik', pitch: 'Yeni nesil akustik trio projemizle başvuruyoruz.' },
    });
    assert.equal(origApply.status, 201);
    assert.ok(origApply.data.program.applications.some((a: any) => a.userId === 'user_artist_efe'));
  } finally {
    await ctx.cleanup();
  }
});
