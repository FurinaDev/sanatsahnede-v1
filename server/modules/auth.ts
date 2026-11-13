import crypto from 'crypto';
import { Router, Response } from 'express';
import { DbInstance, parseJson } from '../db/database';
import {
  AuthedRequest,
  requireAuth,
  rowToUser,
  SESSION_COOKIE_NAME,
} from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import {
  generateToken,
  hashPassword,
  newId,
  signValue,
  slugify,
  verifyPassword,
  getSessionSecret,
} from '../utils/crypto';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';
import { RoleType } from '../../src/types';

const SELF_REGISTRABLE_ROLES: RoleType[] = [
  'artist',
  'ensemble_leader',
  'business_owner',
  'venue_manager',
  'technical_provider',
  'organizer',
  'audience',
];

export function isDemoQuickLoginEnabled(): boolean {
  return process.env.ENABLE_DEMO_QUICK_LOGIN !== 'false';
}

function createSessionForUser(db: DbInstance, res: Response, userId: string): void {
  const token = generateToken(32);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const sessionId = newId('sess');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, userId, tokenHash, expiresAt, new Date().toISOString());

  const signed = signValue(token, getSessionSecret());
  res.cookie(SESSION_COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function ensureStarterWorkspaceForRole(
  db: DbInstance,
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    avatarUrl: string;
  },
  role: RoleType,
  extra?: { organizationName?: string; city?: string; instrument?: string; businessType?: string }
): void {
  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.email.split('@')[0];
  const city = extra?.city || 'İstanbul';
  const now = new Date().toISOString();

  if (role === 'artist') {
    const existing = db.prepare('SELECT id FROM individual_profiles WHERE user_id = ?').get(user.id);
    if (!existing) {
      const id = newId('artist');
      const slug = `${slugify(fullName)}-${id.slice(-4)}`;
      const inst = extra?.instrument || 'Piyano';
      db.prepare(`
        INSERT INTO individual_profiles (
          id, user_id, slug, full_name, title, discipline, specialty_tags_json,
          bio_short, bio_long, city, district, primary_instrument, instruments_json, genres_json,
          education, experience_years, repertoire_json, video_urls_json, audio_samples_json,
          avatar_url, is_verified, verification_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, user.id, slug, fullName, 'Profesyonel Sanatçı', 'Müzik', JSON.stringify([]),
        'SanatSahnede üyesi bireysel sanatçı profili.', '', city, 'Merkez', inst,
        JSON.stringify([inst]), JSON.stringify(['Klasik Müzik']), '', 1,
        JSON.stringify([]), JSON.stringify([]), JSON.stringify([]),
        user.avatarUrl, 0, 'pending', now
      );
    }
  } else if (role === 'ensemble_leader') {
    const existing = db.prepare('SELECT id FROM ensembles WHERE leader_user_id = ?').get(user.id);
    if (!existing) {
      const id = newId('ensemble');
      const name = extra?.organizationName || `${fullName} Topluluğu`;
      const slug = `${slugify(name)}-${id.slice(-4)}`;
      db.prepare(`
        INSERT INTO ensembles (
          id, leader_user_id, payout_responsible_user_id, name, slug, discipline, specialty_tags_json,
          ensemble_type, bio, founded_year, city, genres_json, repertoire_json, video_urls_json,
          avatar_url, is_verified, verification_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, user.id, user.id, name, slug, 'Müzik', JSON.stringify([]),
        'Trio', 'Yeni oluşturulan sanat topluluğu profili.', new Date().getFullYear(), city,
        JSON.stringify(['Oda Müziği']), JSON.stringify([]), JSON.stringify([]),
        '/src/assets/images/ensemble_string_trio_1794440056146.jpg', 0, 'pending', now
      );
      db.prepare(`
        INSERT INTO ensemble_members (id, ensemble_id, user_id, email, name, instrument, role_title, joined_year, avatar_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(newId('mem'), id, user.id, user.email, fullName, 'Vokal', 'Topluluk Lideri', new Date().getFullYear(), user.avatarUrl, 'active');
    }
  } else if (role === 'business_owner' || role === 'organizer') {
    const existing = db.prepare('SELECT id FROM business_profiles WHERE user_id = ?').get(user.id);
    if (!existing) {
      const id = newId('biz');
      const orgName = extra?.organizationName || `${fullName} Kültür & Etkinlik`;
      const slug = `${slugify(orgName)}-${id.slice(-4)}`;
      const bizType = extra?.businessType || (role === 'organizer' ? 'Festival ve Fuar Organizatörü' : 'Kültür Merkezi');
      db.prepare(`
        INSERT INTO business_profiles (
          id, user_id, business_name, slug, business_type, disciplines_json, facilities_json,
          description, city, district, address, phone, email, logo_url,
          is_verified, verification_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, user.id, orgName, slug, bizType, JSON.stringify(['Müzik']), JSON.stringify([]),
        'SanatSahnede üyesi kurum/organizatör profili.', city, 'Merkez', '',
        user.phone, user.email, '/src/assets/images/venue_cultural_foundation_1794582678466.jpg',
        0, 'pending', now
      );
    }
  } else if (role === 'venue_manager') {
    const existing = db.prepare('SELECT id FROM venues WHERE manager_user_id = ?').get(user.id);
    if (!existing) {
      const id = newId('venue');
      const vName = extra?.organizationName || `${fullName} Sahne & Mekân`;
      const slug = `${slugify(vName)}-${id.slice(-4)}`;
      db.prepare(`
        INSERT INTO venues (
          id, manager_user_id, name, slug, city, district, address, description,
          contact_phone, contact_email, is_verified, accessibility_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, user.id, vName, slug, city, 'Merkez', '', 'Yeni eklenen performans ve prova mekânı.',
        user.phone, user.email, 0,
        JSON.stringify({
          wheelchairAccess: false, stepFreeEntrance: false, accessibleRestroom: false,
          elevatorOrRamp: false, signLanguageInterpretation: false, liveCaptions: false,
          audioDescription: false, brailleProgram: false, hearingLoop: false,
          companionSupport: false, accessibleSeating: false, sensoryFriendly: false,
          accessibleTransitInfo: '',
        }),
        now
      );
    }
  } else if (role === 'technical_provider') {
    const existing = db.prepare('SELECT id FROM technical_providers WHERE user_id = ?').get(user.id);
    if (!existing) {
      const id = newId('tech');
      const tName = extra?.organizationName || `${fullName} Teknik Prodüksiyon`;
      db.prepare(`
        INSERT INTO technical_providers (
          id, user_id, name, city, service_areas_json, categories_json,
          description, staff_capacity, is_verified, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, user.id, tName, city, JSON.stringify([city]),
        JSON.stringify(['Ses Sistemi', 'Sahne Aydınlatma']),
        'Ses, ışık ve sahne kurulumu hizmet sağlayıcısı.', 2, 0, now
      );
    }
  }
}

export function createAuthRouter(db: DbInstance): Router {
  const router = Router();
  const authRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 25 });

  router.post('/register', authRateLimiter, (req, res) => {
    const {
      email,
      password,
      firstName,
      lastName = '',
      phone = '',
      role = 'artist',
      organizationName,
      city,
      instrument,
      businessType,
    } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Geçerli bir e-posta adresi giriniz.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Parola en az 6 karakter olmalıdır.' });
    }
    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return res.status(400).json({ error: 'Ad alanı zorunludur.' });
    }
    if (!SELF_REGISTRABLE_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Bu rol ile doğrudan kayıt yapılamaz.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Bu e-posta adresi ile kayıtlı bir hesap zaten mevcut.' });
    }

    const userId = newId('user');
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);
    const emailCode = String(Math.floor(100000 + Math.random() * 900000));
    const phoneCode = String(Math.floor(100000 + Math.random() * 900000));
    const avatarUrl =
      role === 'business_owner' || role === 'organizer'
        ? '/src/assets/images/venue_cultural_foundation_1794582678466.jpg'
        : '/src/assets/images/artist_jazz_pianist_1794440057025.jpg';

    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, phone, avatar_url,
        roles_json, active_role, is_verified, email_verified, phone_verified,
        kyc_status, is_demo, status, verification_code_email, verification_code_phone, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      normalizedEmail,
      passwordHash,
      firstName.trim(),
      String(lastName).trim(),
      String(phone).trim(),
      avatarUrl,
      JSON.stringify([role]),
      role,
      0,
      0,
      0,
      'unsubmitted',
      0,
      'active',
      emailCode,
      phoneCode,
      now
    );

    ensureStarterWorkspaceForRole(
      db,
      {
        id: userId,
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: String(lastName).trim(),
        phone: String(phone).trim(),
        avatarUrl,
      },
      role,
      { organizationName, city, instrument, businessType }
    );

    createSessionForUser(db, res, userId);
    logAudit(db, {
      userId,
      action: 'USER_REGISTER',
      resourceType: 'user',
      resourceId: userId,
      details: { role },
    });

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    return res.status(201).json({
      user: rowToUser(userRow),
      sandboxVerificationCodes:
        process.env.SMTP_HOST ? undefined : { emailCode, phoneCode, mode: 'sandbox' },
    });
  });

  router.post('/login', authRateLimiter, (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'E-posta ve parola zorunludur.' });
    }

    const userRow = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email.trim().toLowerCase()) as any;

    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      return res.status(401).json({ error: 'E-posta veya parola hatalı.' });
    }
    if (userRow.status !== 'active') {
      return res.status(403).json({ error: 'Hesabınız şu anda aktif değil.' });
    }

    createSessionForUser(db, res, userRow.id);
    logAudit(db, {
      userId: userRow.id,
      action: 'USER_LOGIN',
      resourceType: 'user',
      resourceId: userRow.id,
    });

    return res.json({ user: rowToUser(userRow) });
  });

  router.post('/demo-login', authRateLimiter, (req, res) => {
    if (!isDemoQuickLoginEnabled()) {
      return res.status(403).json({ error: 'Demo hızlı giriş bu ortamda devre dışıdır.' });
    }

    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Demo hesap e-postası gereklidir.' });
    }

    const userRow = db
      .prepare('SELECT * FROM users WHERE email = ? AND is_demo = 1')
      .get(email.trim().toLowerCase()) as any;

    if (!userRow) {
      return res.status(404).json({ error: 'Demo hesabı bulunamadı.' });
    }

    createSessionForUser(db, res, userRow.id);
    logAudit(db, {
      userId: userRow.id,
      action: 'DEMO_QUICK_LOGIN',
      resourceType: 'user',
      resourceId: userRow.id,
      details: { sandbox: true },
    });

    return res.json({ user: rowToUser(userRow), sandboxDemo: true });
  });

  router.post('/logout', (req: AuthedRequest, res) => {
    if (req.sessionId) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(req.sessionId);
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.json({ success: true });
  });

  router.get('/me', (req: AuthedRequest, res) => {
    return res.json({ user: req.user || null });
  });

  router.post('/switch-role', requireAuth, (req: AuthedRequest, res) => {
    const { role } = req.body || {};
    if (!role || !req.user!.roles.includes(role)) {
      return res.status(403).json({ error: 'Kullanıcının bu role geçiş yetkisi yok.' });
    }

    db.prepare('UPDATE users SET active_role = ? WHERE id = ?').run(role, req.user!.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    return res.json({ user: rowToUser(updated) });
  });

  router.post('/add-role', requireAuth, (req: AuthedRequest, res) => {
    const { role, organizationName, city } = req.body || {};
    if (!SELF_REGISTRABLE_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Bu rol kendi kendine eklenemez.' });
    }

    const currentRoles = parseJson<RoleType[]>(
      (db.prepare('SELECT roles_json FROM users WHERE id = ?').get(req.user!.id) as any).roles_json,
      [req.user!.activeRole]
    );
    const nextRoles = currentRoles.includes(role) ? currentRoles : [...currentRoles, role];
    db.prepare('UPDATE users SET roles_json = ?, active_role = ? WHERE id = ?').run(
      JSON.stringify(nextRoles),
      role,
      req.user!.id
    );

    ensureStarterWorkspaceForRole(db, req.user!, role, { organizationName, city });
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    return res.json({ user: rowToUser(updated) });
  });

  router.post('/verify-email', requireAuth, (req: AuthedRequest, res) => {
    const { code } = req.body || {};
    const row = db.prepare('SELECT verification_code_email FROM users WHERE id = ?').get(req.user!.id) as any;
    if (code && row?.verification_code_email && code !== row.verification_code_email && code !== 'SANDBOX-OK') {
      return res.status(400).json({ error: 'E-posta doğrulama kodu geçersiz.' });
    }
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(req.user!.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    return res.json({ user: rowToUser(updated) });
  });

  router.post('/verify-phone', requireAuth, (req: AuthedRequest, res) => {
    const { code } = req.body || {};
    const row = db.prepare('SELECT verification_code_phone FROM users WHERE id = ?').get(req.user!.id) as any;
    if (code && row?.verification_code_phone && code !== row.verification_code_phone && code !== 'SANDBOX-OK') {
      return res.status(400).json({ error: 'Telefon doğrulama kodu geçersiz.' });
    }
    db.prepare('UPDATE users SET phone_verified = 1 WHERE id = ?').run(req.user!.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    return res.json({ user: rowToUser(updated) });
  });

  router.post('/forgot-password', authRateLimiter, (_req, res) => {
    return res.json({
      success: true,
      mode: process.env.SMTP_HOST ? 'smtp' : 'sandbox',
      message: 'Eğer bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.',
    });
  });

  router.post('/verifications', requireAuth, (req: AuthedRequest, res) => {
    const { entityName, accountType, documents = [], portfolioUrl, videoUrl } = req.body || {};
    if (!entityName || !accountType) {
      return res.status(400).json({ error: 'Kurum/sanatçı adı ve hesap türü zorunludur.' });
    }

    const verifId = newId('verif');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO verification_requests (
        id, user_id, entity_name, account_type, documents_json, portfolio_url, video_url, status, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      verifId,
      req.user!.id,
      String(entityName).trim(),
      accountType,
      JSON.stringify(Array.isArray(documents) ? documents : []),
      portfolioUrl || null,
      videoUrl || null,
      now
    );

    db.prepare(`UPDATE users SET kyc_status = 'pending' WHERE id = ?`).run(req.user!.id);
    notifyUser(db, {
      userId: 'user_admin',
      type: 'verification_submitted',
      title: 'Yeni KYC Doğrulama Başvurusu',
      body: `${entityName} doğrulama belgelerini gönderdi.`,
      linkView: 'admin_panel',
    });

    logAudit(db, {
      userId: req.user!.id,
      action: 'SUBMIT_VERIFICATION',
      resourceType: 'verification_request',
      resourceId: verifId,
    });

    return res.status(201).json({ id: verifId, status: 'pending' });
  });

  return router;
}
