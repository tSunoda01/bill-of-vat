import crypto from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || 'pyxis-secure-signing-key-2026-sri-lanka-vat';

/**
 * Hash a plain password using PBKDF2 with salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain password against stored salt:hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
  } catch (e) {
    return false;
  }
}

export interface AuthSessionPayload {
  businessId: string;
  ownerEmail: string;
  businessName: string;
  exp: number; // Unix timestamp
}

/**
 * Sign session payload into an encrypted/HMAC token
 */
export function createSessionToken(businessId: string, ownerEmail: string, businessName: string): string {
  const payload: AuthSessionPayload = {
    businessId,
    ownerEmail,
    businessName,
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/**
 * Verify session token
 */
export function verifySessionToken(token: string): AuthSessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');

  if (sig !== expectedSig) return null;

  try {
    const payload: AuthSessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Extract authenticated businessId from Request headers or cookies
 */
export function getAuthFromRequest(req: Request): AuthSessionPayload | null {
  // Check Authorization header
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const session = verifySessionToken(token);
    if (session) return session;
  }

  // Check Cookie header
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/pyxis_session=([^;]+)/);
  if (match && match[1]) {
    const token = decodeURIComponent(match[1].trim());
    return verifySessionToken(token);
  }

  return null;
}
