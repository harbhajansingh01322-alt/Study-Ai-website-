import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SESSION_LENGTH = 8 * 60 * 60;
const cookieName = 'studyai_admin';

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Password must be at least 12 characters.');
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password, stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : [];
  if (parts.length !== 3 || parts[0] !== 'scrypt') throw new Error('Admin password hash is not configured correctly.');
  const salt = Buffer.from(parts[1], 'base64url');
  const expected = Buffer.from(parts[2], 'base64url');
  if (salt.length !== 16 || expected.length !== 32) throw new Error('Admin password hash is not configured correctly.');
  const actual = scryptSync(String(password || ''), salt, expected.length);
  return timingSafeEqual(actual, expected);
}

function fingerprint(hash) {
  return createHash('sha256').update(hash).digest('base64url').slice(0, 24);
}

function signature(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSession(hash, secret, at = Date.now()) {
  if (!secret || secret.length < 32) throw new Error('Admin session secret is not configured.');
  const payload = Buffer.from(JSON.stringify({ exp: at + SESSION_LENGTH * 1000, v: fingerprint(hash) })).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySession(token, hash, secret, at = Date.now()) {
  if (!token || !hash || !secret || secret.length < 32) return false;
  const [payload, mac, extra] = token.split('.');
  if (!payload || !mac || extra) return false;
  const expected = Buffer.from(signature(payload, secret));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(decoded.exp) && decoded.exp > at && decoded.v === fingerprint(hash);
  } catch { return false; }
}

export function readSessionCookie(request) {
  const header = request.headers.get('cookie') || '';
  const entry = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  return entry ? entry.slice(cookieName.length + 1) : null;
}

export function sessionCookie(request, token) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${cookieName}=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${SESSION_LENGTH}${secure}`;
}

export function clearSessionCookie(request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${cookieName}=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
