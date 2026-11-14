import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { DbInstance, parseJson } from '../db/database';
import { verifySignedValue, getSessionSecret } from '../utils/crypto';
import { RoleType, User } from '../../src/types';

export interface AuthedRequest extends Request {
  user?: User;
  sessionId?: string;
}

export const SESSION_COOKIE_NAME = 'ss_session';

export function rowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name || '',
    phone: row.phone || '',
    avatarUrl: row.avatar_url || '/src/assets/images/artist_jazz_pianist_1794440057025.jpg',
    roles: parseJson<RoleType[]>(row.roles_json, ['audience']),
    activeRole: row.active_role as RoleType,
    activeOrganizationId: row.active_organization_id ?? null,
    isVerified: Boolean(row.is_verified),
    emailVerified: Boolean(row.email_verified),
    phoneVerified: Boolean(row.phone_verified),
    kycStatus: row.kyc_status || 'unsubmitted',
    status: (row.status as 'active' | 'suspended') || 'active',
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
  };
}

export function attachSessionUser(db: DbInstance) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const bearerToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : '';
    const rawCookie =
      (typeof req.cookies?.[SESSION_COOKIE_NAME] === 'string' && req.cookies[SESSION_COOKIE_NAME]) ||
      bearerToken;
    if (!rawCookie) {
      return next();
    }

    const token = verifySignedValue(rawCookie, getSessionSecret());
    if (!token) {
      return next();
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = db
      .prepare('SELECT id, user_id, expires_at FROM sessions WHERE token_hash = ?')
      .get(tokenHash) as { id: string; user_id: string; expires_at: string } | undefined;

    if (!session || new Date(session.expires_at).getTime() < Date.now()) {
      return next();
    }

    const userRow = db
      .prepare('SELECT * FROM users WHERE id = ? AND status = ?')
      .get(session.user_id, 'active') as any;

    if (userRow) {
      req.user = rowToUser(userRow);
      req.sessionId = session.id;
    }

    next();
  };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Bu işlem için giriş yapmanız gerekmektedir.' });
  }
  next();
}

export function requireRole(...allowedRoles: RoleType[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Bu işlem için giriş yapmanız gerekmektedir.' });
    }
    const hasMatch =
      allowedRoles.includes(req.user.activeRole) ||
      req.user.roles.some((r) => allowedRoles.includes(r));

    if (!hasMatch) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
    }
    next();
  };
}

export function requireVerified(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Önce giriş yapmalısınız.' });
  }
  if (!req.user.isVerified && req.user.activeRole !== 'admin') {
    return res.status(403).json({
      error: 'Bu işlemi gerçekleştirmek için hesap doğrulama (KYC) onayınız tamamlanmış olmalıdır.',
    });
  }
  next();
}

export function requireFeatureFlag(db: DbInstance, flagKey: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const row = db
      .prepare('SELECT enabled FROM feature_flags WHERE flag_key = ?')
      .get(flagKey) as { enabled: number } | undefined;

    if (row && row.enabled === 0) {
      return res.status(403).json({
        error: `Bu modül (${flagKey}) yönetici tarafından geçici olarak devre dışı bırakılmıştır.`,
      });
    }
    next();
  };
}
