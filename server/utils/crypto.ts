import crypto from 'crypto';

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function signValue(value: string, secret: string): string {
  const sig = crypto.createHmac('sha256', secret).update(value).digest('hex');
  return `${value}.${sig}`;
}

export function verifySignedValue(signed: string, secret: string): string | null {
  const idx = signed.lastIndexOf('.');
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', secret).update(value).digest('hex');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  return value;
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || `item-${Date.now()}`
  );
}
export function getSessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();

  if (configured) {
    if (configured.length < 32) {
      throw new Error('SESSION_SECRET en az 32 karakter olmalıdır.');
    }
    return configured;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'sanatsahnede-development-only-session-secret-2026-change-before-production';
  }

  throw new Error('SESSION_SECRET ortam değişkeni tanımlanmamış.');
}