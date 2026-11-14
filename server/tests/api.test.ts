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
    assert.equal(boot.data.user, null);

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

    // Demo login with HTTPS proxy headers sets SameSite=None; Secure and returns Bearer sessionToken
    const demoRes = await fetch(`${ctx.baseUrl}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' },
      body: JSON.stringify({ email: 'efeozkaniletisim@gmail.com' }),
    });
    assert.equal(demoRes.status, 200);
    const demoSetCookie = demoRes.headers.get('set-cookie') || '';
    assert.match(demoSetCookie, /SameSite=None/i);
    assert.match(demoSetCookie, /Secure/i);
    const demoJson = await demoRes.json() as any;
    assert.ok(demoJson.sessionToken);

    // Cookie-less client using Authorization: Bearer <sessionToken> stays authenticated on /api/bootstrap
    const bearerBoot = await fetch(`${ctx.baseUrl}/api/bootstrap`, {
      headers: { Authorization: `Bearer ${demoJson.sessionToken}` },
    });
    assert.equal(bearerBoot.status, 200);
    const bearerData = await bearerBoot.json() as any;
    assert.equal(bearerData.user?.email, 'efeozkaniletisim@gmail.com');

    // Logout revokes Bearer token session as well
    await fetch(`${ctx.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${demoJson.sessionToken}` },
    });
    const postLogoutBoot = await fetch(`${ctx.baseUrl}/api/bootstrap`, {
      headers: { Authorization: `Bearer ${demoJson.sessionToken}` },
    });
    const postLogoutData = await postLogoutBoot.json() as any;
    assert.equal(postLogoutData.user, null);

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
    const myBiz = boot.data.businesses.find((b: any) => b.userId === 'user_hotel_mgr');
    const activeListing = boot.data.listings.find((l: any) => l.businessId === myBiz?.id && l.status === 'active');
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
    const orgBoot = await organizer.request('/api/bootstrap');
    const orgId = orgBoot.data.organizations[0].id;
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

test('Profile persistence, Culture Desk IDOR, Ensemble email invites, Events CRUD, Venues & Tech Provider CRUD', async () => {
  const ctx = withTestServer();
  try {
    const artist = createClient(ctx.baseUrl);
    const ensembleLeader = createClient(ctx.baseUrl);
    const outsider = createClient(ctx.baseUrl);
    const venueMgr = createClient(ctx.baseUrl);
    const tech = createClient(ctx.baseUrl);
    const organizer = createClient(ctx.baseUrl);

    await artist.request('/api/auth/login', { method: 'POST', body: { email: 'efeozkaniletisim@gmail.com', password: 'DemoSanat123!' } });
    await ensembleLeader.request('/api/auth/login', { method: 'POST', body: { email: 'selin@istanbulstringtrio.com', password: 'DemoSanat123!' } });
    await outsider.request('/api/auth/login', { method: 'POST', body: { email: 'izleyici@sanatsever.com', password: 'DemoSanat123!' } });
    await venueMgr.request('/api/auth/login', { method: 'POST', body: { email: 'sahne@kadikoyakustik.com', password: 'DemoSanat123!' } });
    await tech.request('/api/auth/login', { method: 'POST', body: { email: 'teknik@sesvesahne.com', password: 'DemoSanat123!' } });
    await organizer.request('/api/auth/login', { method: 'POST', body: { email: 'festival@istanbuloda.org', password: 'DemoSanat123!' } });

    // 1. Artist PATCH persists stageName, avatarUrl, coverUrl
    const patchArtist = await artist.request('/api/artists/me', {
      method: 'PATCH',
      body: {
        stageName: 'Efe Özkan Akustik',
        avatarUrl: '/src/assets/images/artist_jazz_pianist_1794440057025.jpg',
        coverUrl: '/src/assets/images/hero_culture_music_1794440056664.jpg',
      },
    });
    assert.equal(patchArtist.status, 200);
    assert.equal(patchArtist.data.artist.stageName, 'Efe Özkan Akustik');

    // 2. Culture Desk IDOR: unauthorized user cannot mutate organization's program
    const boot = await organizer.request('/api/bootstrap');
    const orgId = boot.data.organizations[0].id;
    const unauthProg = await outsider.request('/api/culture-desk/programs', {
      method: 'POST',
      body: { organizationId: orgId, title: 'Yetkisiz Program' },
    });
    assert.equal(unauthProg.status, 403);

    const createdProg = await organizer.request('/api/culture-desk/programs', {
      method: 'POST',
      body: { organizationId: orgId, title: 'IDOR Test Programı', serviceMode: 'self_service', totalBudget: 150000 },
    });
    assert.equal(createdProg.status, 201);
    const unauthMode = await outsider.request(`/api/culture-desk/programs/${createdProg.data.program.id}/service-mode`, {
      method: 'PATCH',
      body: { serviceMode: 'managed_service' },
    });
    assert.equal(unauthMode.status, 403);

    // 3. Ensemble email invite + respond (403 for outsider, 200 for invitee)
    const inviteRes = await ensembleLeader.request('/api/ensembles/ensemble_istanbul_string_trio/members', {
      method: 'POST',
      body: {
        name: 'Efe Özkan',
        instrument: 'Piyano',
        roleTitle: 'Konuk Piyanist',
        email: 'efeozkaniletisim@gmail.com',
      },
    });
    assert.equal(inviteRes.status, 201);
    const invitedMember = inviteRes.data.ensemble.members.find(
      (m: any) => m.email === 'efeozkaniletisim@gmail.com' && m.status === 'invited'
    );
    assert.ok(invitedMember);

    const outsiderResp = await outsider.request(
      `/api/ensembles/ensemble_istanbul_string_trio/members/${invitedMember.id}/respond`,
      { method: 'POST', body: { decision: 'accept' } }
    );
    assert.equal(outsiderResp.status, 403);

    const acceptInvite = await artist.request(
      `/api/ensembles/ensemble_istanbul_string_trio/members/${invitedMember.id}/respond`,
      { method: 'POST', body: { decision: 'accept' } }
    );
    assert.equal(acceptInvite.status, 200);
    assert.equal(
      acceptInvite.data.ensemble.members.find((m: any) => m.id === invitedMember.id)?.status,
      'active'
    );

    // 4. Venue edit & spaces CRUD
    const myVenue = boot.data.venues.find((v: any) => v.managerUserId === 'user_venue_akm');
    assert.ok(myVenue);
    const patchVenue = await venueMgr.request(`/api/venues/${myVenue.id}`, {
      method: 'PATCH',
      body: { name: `${myVenue.name} (Güncel)`, city: 'İzmir' },
    });
    assert.equal(patchVenue.status, 200);
    assert.equal(patchVenue.data.venue.city, 'İzmir');

    const addSpace = await venueMgr.request(`/api/venues/${myVenue.id}/spaces`, {
      method: 'POST',
      body: { name: 'Yeni Oda Salonu', seatedCapacity: 80, standingCapacity: 120 },
    });
    assert.equal(addSpace.status, 201);
    const addedSpace = addSpace.data.venue.spaces.find((s: any) => s.name === 'Yeni Oda Salonu');
    assert.ok(addedSpace);

    const delSpace = await venueMgr.request(`/api/venues/${myVenue.id}/spaces/${addedSpace.id}`, {
      method: 'DELETE',
    });
    assert.equal(delSpace.status, 200);
    assert.equal(delSpace.data.venue.spaces.some((s: any) => s.id === addedSpace.id), false);

    // 5. Technical provider edit, package delete & quote reject
    const patchTp = await tech.request('/api/technical-providers/me', {
      method: 'PATCH',
      body: { city: 'İzmir', description: 'Güncellenmiş ses ve ışık rider hizmeti.' },
    });
    assert.equal(patchTp.status, 200);
    assert.equal(patchTp.data.provider.city, 'İzmir');

    const pkgCreate = await tech.request('/api/technical-providers/packages', {
      method: 'POST',
      body: { title: 'Silinecek Paket', priceAmount: 9000, description: 'Test paketi' },
    });
    assert.equal(pkgCreate.status, 201);
    const newPkg = pkgCreate.data.provider.packages.find((p: any) => p.title === 'Silinecek Paket');
    assert.ok(newPkg);
    const pkgDel = await tech.request(`/api/technical-providers/packages/${newPkg.id}`, { method: 'DELETE' });
    assert.equal(pkgDel.status, 200);

    const treq = await organizer.request('/api/technical-requests', {
      method: 'POST',
      body: { title: 'Reddedilecek Teklif Talebi', city: 'İstanbul', eventDate: '2027-10-10', requiredEquipment: ['Mikser'] },
    });
    assert.equal(treq.status, 201);
    const tq = await tech.request(`/api/technical-requests/${treq.data.request.id}/quotes`, {
      method: 'POST',
      body: { amount: 18000, notes: 'İlk fiyat' },
    });
    assert.equal(tq.status, 201);
    const tReject = await organizer.request(`/api/technical-quotes/${tq.data.quote.id}/reject`, { method: 'POST' });
    assert.equal(tReject.status, 200);
    assert.equal(tReject.data.quote.status, 'rejected');

    // 6. Artist Studio PATCH & Career Passport DELETE (manual succeeds, verified booking returns 403)
    const epk = await artist.request('/api/artist-studio', {
      method: 'POST',
      body: { title: 'İlk EPK', summary: 'İlk özet' },
    });
    assert.equal(epk.status, 201);
    const epkPatch = await artist.request(`/api/artist-studio/${epk.data.portfolio.id}`, {
      method: 'PATCH',
      body: { title: 'Güncel EPK', summary: 'Güncel özet' },
    });
    assert.equal(epkPatch.status, 200);
    assert.equal(epkPatch.data.portfolio.title, 'Güncel EPK');

    const manualRec = await artist.request('/api/career-passport', {
      method: 'POST',
      body: {
        title: 'Silinecek Manuel Kayıt',
        organizationName: 'Özel Oda Orkestrası',
        roleTitle: 'Piyanist',
        venueName: 'Test Salonu',
        eventDate: '2026-03-01',
      },
    });
    assert.equal(manualRec.status, 201);
    const delManual = await artist.request(`/api/career-passport/${manualRec.data.record.id}`, { method: 'DELETE' });
    assert.equal(delManual.status, 200);

    ctx.db.prepare(`
      INSERT INTO career_records (
        id, artist_id, user_id, title, organization_name, venue_name, role_title,
        event_date, source_type, source_id, is_verified_record, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'booking', ?, 1, ?)
    `).run(
      'car_verified_test',
      'artist_efe_ozkan',
      'user_artist_efe',
      'Doğrulanmış Konser Kaydı',
      'Grand Bosphorus',
      'Balo Salonu',
      'Solist Piyanist',
      '2026-04-10',
      'booking_seed_verified',
      new Date().toISOString()
    );
    const delVerified = await artist.request('/api/career-passport/car_verified_test', { method: 'DELETE' });
    assert.equal(delVerified.status, 403);

    // 7. Events PATCH & DELETE
    const evCreate = await artist.request('/api/events', {
      method: 'POST',
      body: {
        title: 'Düzenlenecek Etkinlik',
        venueName: 'Moda Sahnesi',
        city: 'İstanbul',
        eventDate: '2027-11-12',
        description: 'İlk açıklama',
      },
    });
    assert.equal(evCreate.status, 201);
    const evId = evCreate.data.event.id;

    const evForbidden = await outsider.request(`/api/events/${evId}`, {
      method: 'PATCH',
      body: { title: 'Yetkisiz Başlık' },
    });
    assert.equal(evForbidden.status, 403);

    const evPatch = await artist.request(`/api/events/${evId}`, {
      method: 'PATCH',
      body: { title: 'Güncellenmiş Etkinlik' },
    });
    assert.equal(evPatch.status, 200);
    assert.equal(evPatch.data.event.title, 'Güncellenmiş Etkinlik');

    const evDel = await artist.request(`/api/events/${evId}`, { method: 'DELETE' });
    assert.equal(evDel.status, 200);
  } finally {
    await ctx.cleanup();
  }
});

test('Listing edit/close, Application withdraw & re-apply, Offer expires_at, 409 double-booking guard & Admin suspend/verify', async () => {
  const ctx = withTestServer();
  try {
    const biz = createClient(ctx.baseUrl);
    const artist = createClient(ctx.baseUrl);
    const mod = createClient(ctx.baseUrl);
    const admin = createClient(ctx.baseUrl);

    await biz.request('/api/auth/login', { method: 'POST', body: { email: 'etkinlik@grandbosphorus.com', password: 'DemoSanat123!' } });
    await artist.request('/api/auth/login', { method: 'POST', body: { email: 'efeozkaniletisim@gmail.com', password: 'DemoSanat123!' } });
    await mod.request('/api/auth/login', { method: 'POST', body: { email: 'moderator@sanatsahnede.com', password: 'DemoSanat123!' } });
    await admin.request('/api/auth/login', { method: 'POST', body: { email: 'admin@sahnesanat.com', password: 'DemoSanat123!' } });

    // 1. Listing PATCH & DELETE
    const l1 = await biz.request('/api/listings', {
      method: 'POST',
      body: {
        title: 'Kapatılacak İlan',
        description: 'Test ilanı açıklaması',
        city: 'İstanbul',
        venueName: 'Bosphorus Teras',
        eventDate: '2027-12-20',
        budgetAmount: 18000,
      },
    });
    assert.equal(l1.status, 201);
    const l1Patch = await biz.request(`/api/listings/${l1.data.listing.id}`, {
      method: 'PATCH',
      body: { title: 'Düzenlenmiş İlan', budgetAmount: 21000 },
    });
    assert.equal(l1Patch.status, 200);
    assert.equal(l1Patch.data.listing.budgetAmount, 21000);

    const l1Close = await biz.request(`/api/listings/${l1.data.listing.id}`, { method: 'DELETE' });
    assert.equal(l1Close.status, 200);
    assert.equal(l1Close.data.listing.status, 'cancelled');

    // 2. Two active listings on the same date/time -> test withdraw/re-apply, offer expiry, and 409 conflict
    const makeActiveListing = async (title: string) => {
      const cr = await biz.request('/api/listings', {
        method: 'POST',
        body: {
          title,
          description: 'Aynı tarih çakışma testi.',
          city: 'İstanbul',
          venueName: 'Ana Salon',
          eventDate: '2028-01-15',
          startTime: '20:00',
          endTime: '22:00',
          budgetAmount: 25000,
        },
      });
      assert.equal(cr.status, 201);
      const md = await mod.request(`/api/admin/moderation/listing/${cr.data.listing.id}`, {
        method: 'POST',
        body: { decision: 'approve' },
      });
      assert.equal(md.status, 200);
      return md.data.listing;
    };

    const listingA = await makeActiveListing('Konser A');
    const listingB = await makeActiveListing('Konser B');

    // Withdraw & re-apply
    const app1 = await artist.request('/api/applications', {
      method: 'POST',
      body: { listingId: listingA.id, applicantType: 'individual', message: 'İlk başvuru' },
    });
    assert.equal(app1.status, 201);
    const withdraw = await artist.request(`/api/applications/${app1.data.application.id}`, { method: 'DELETE' });
    assert.equal(withdraw.status, 200);
    assert.equal(withdraw.data.application.status, 'withdrawn');

    const app2 = await artist.request('/api/applications', {
      method: 'POST',
      body: { listingId: listingA.id, applicantType: 'individual', message: 'Yeniden başvuru' },
    });
    assert.equal(app2.status, 201);

    // Book artist on listingA -> pay to create confirmed booked slot
    const selA = await biz.request(`/api/applications/${app2.data.application.id}/status`, {
      method: 'PATCH',
      body: { status: 'selected' },
    });
    assert.equal(selA.status, 200);
    await artist.request(`/api/bookings/${selA.data.booking.id}/accept-contract`, { method: 'POST' });
    const payA = await biz.request(`/api/bookings/${selA.data.booking.id}/checkout`, {
      method: 'POST',
      body: { confirmSandboxNow: true },
    });
    assert.equal(payA.status, 200);

    // Double-booking 409 guard on listingB (same date 2028-01-15 20:00-22:00)
    const appB = await artist.request('/api/applications', {
      method: 'POST',
      body: { listingId: listingB.id, applicantType: 'individual', message: 'Çakışan tarih başvurusu' },
    });
    assert.equal(appB.status, 201);
    const selBConflict = await biz.request(`/api/applications/${appB.data.application.id}/status`, {
      method: 'PATCH',
      body: { status: 'selected' },
    });
    assert.equal(selBConflict.status, 409);

    // Offer expires_at enforcement (400 expired on /counter and /accept)
    const expOffer = await biz.request('/api/offers', {
      method: 'POST',
      body: { listingId: listingB.id, performerId: 'artist_efe_ozkan', performerType: 'individual', proposedAmount: 27000 },
    });
    assert.equal(expOffer.status, 201);
    ctx.db.prepare('UPDATE offers SET expires_at = ? WHERE id = ?').run('2020-01-01T00:00:00Z', expOffer.data.offer.id);

    const counterExp = await artist.request(`/api/offers/${expOffer.data.offer.id}/counter`, {
      method: 'POST',
      body: { proposedAmount: 29000 },
    });
    assert.equal(counterExp.status, 400);

    // Re-set a non-expired offer on listingB to test 409 conflict on offer accept
    const activeOffer = await biz.request('/api/offers', {
      method: 'POST',
      body: { listingId: listingB.id, performerId: 'artist_efe_ozkan', performerType: 'individual', proposedAmount: 27000 },
    });
    assert.equal(activeOffer.status, 201);
    const acceptConflictOffer = await artist.request(`/api/offers/${activeOffer.data.offer.id}/accept`, { method: 'POST' });
    assert.equal(acceptConflictOffer.status, 409);

    // 3. Admin reject verification syncs profile + suspend user invalidates session + verify venue/tech
    const targetArtist = createClient(ctx.baseUrl);
    const regRes = await targetArtist.request('/api/auth/register', {
      method: 'POST',
      body: { email: 'askiya@test.com', password: 'Password123!', firstName: 'Test', lastName: 'Sanatçı', role: 'artist' },
    });
    assert.equal(regRes.status, 201);
    const verifReq = await targetArtist.request('/api/auth/verifications', {
      method: 'POST',
      body: {
        accountType: 'artist',
        entityName: 'Test Sanatçı',
        documents: [{ title: 'Belge', url: 'https://example.com/doc.pdf', type: 'pdf' }],
      },
    });
    assert.equal(verifReq.status, 201);

    const rejVerif = await admin.request(`/api/admin/verifications/${verifReq.data.id}/reject`, {
      method: 'POST',
      body: { note: 'Belge okunamadı' },
    });
    assert.equal(rejVerif.status, 200);
    const profRow = ctx.db.prepare('SELECT is_verified, verification_status FROM individual_profiles WHERE user_id = ?').get(regRes.data.user.id) as any;
    assert.equal(profRow.is_verified, 0);
    assert.equal(profRow.verification_status, 'rejected');

    // Suspend user -> cleared session & cannot log back in (403)
    const susp = await admin.request(`/api/admin/users/${regRes.data.user.id}/status`, {
      method: 'PATCH',
      body: { status: 'suspended' },
    });
    assert.equal(susp.status, 200);
    assert.equal(susp.data.user.status, 'suspended');

    const suspendedLogin = await targetArtist.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'askiya@test.com', password: 'Password123!' },
    });
    assert.equal(suspendedLogin.status, 403);

    // Verify venue & tech provider via Admin
    const vVerify = await admin.request('/api/admin/venues/venue_kadikoy_akustik/verify', {
      method: 'POST',
      body: { isVerified: true },
    });
    assert.equal(vVerify.status, 200);
    assert.equal(vVerify.data.venue.isVerified, true);
  } finally {
    await ctx.cleanup();
  }
});
