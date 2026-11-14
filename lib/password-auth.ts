import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';

export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export class AuthError extends Error { constructor(public status: number, message: string) { super(message); } }
export function nationalCode(value: unknown): string {
  if (typeof value !== 'string') throw new AuthError(400, 'کد ملی ۱۰ رقمی را وارد کنید');
  const code = value.trim().replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632));
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) throw new AuthError(400, 'کد ملی معتبر نیست');
  const sum = [...code.slice(0, 9)].reduce((n, c, i) => n + Number(c) * (10 - i), 0) % 11;
  if (Number(code[9]) !== (sum < 2 ? sum : 11 - sum)) throw new AuthError(400, 'کد ملی معتبر نیست');
  return code;
}
export function passwordValue(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) throw new AuthError(400, 'رمز عبور باید بین ۸ تا ۱۲۸ نویسه باشد');
  return value;
}
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
export async function digest(value: string) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }
export function randomToken() { return hex(crypto.getRandomValues(new Uint8Array(32)).buffer); }
export async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256'}, key, 256));
}
export function equalHash(a: string, b: string) { let diff = a.length ^ b.length; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0); return diff === 0; }
export function cookieName(req: Request) { return new URL(req.url).protocol === 'https:' ? '__Host-cb_session' : 'cb_session'; }
export function sessionCookie(req: Request, token: string, seconds = SESSION_SECONDS) {
  return `${cookieName(req)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function cookieToken(value: string | null) {
  // Prefer the secure host-only cookie when both names exist.
  for (const name of ['__Host-cb_session', 'cb_session']) {
    const match = value?.split(';').map(c => c.trim()).find(c => c.startsWith(name + '='));
    const token = match?.slice(name.length + 1); if (token && /^[a-f0-9]{64}$/.test(token)) return token;
  }
  return null;
}
export async function passwordMember(cookie?: string | null) {
  const token = cookieToken(cookie === undefined ? (await headers()).get('cookie') : cookie);
  if (!token || !env.DB) return null;
  return env.DB.prepare('SELECT m.* FROM auth_sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token), Date.now()).first();
}
export async function createSession(req: Request, memberId: string) {
  if (!env.DB) throw new AuthError(503, 'پایگاه داده در دسترس نیست');
  const token = randomToken();
  await env.DB.prepare('INSERT INTO auth_sessions(token_hash,member_id,expires_at) VALUES(?,?,?)').bind(await digest(token), memberId, Date.now() + SESSION_SECONDS * 1000).run();
  return sessionCookie(req, token);
}
export async function throttle(key: string, limit: number) {
  if (!env.DB) throw new AuthError(503, 'پایگاه داده در دسترس نیست');
  const bucket = Math.floor(Date.now() / 900000);
  const row = await env.DB.prepare('INSERT INTO auth_limits(key,bucket,attempts) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET bucket=excluded.bucket,attempts=CASE WHEN auth_limits.bucket=excluded.bucket THEN auth_limits.attempts+1 ELSE 1 END RETURNING attempts').bind(key, bucket).first<{attempts: number}>();
  if ((row?.attempts || 0) > limit) throw new AuthError(429, 'تعداد تلاش‌ها زیاد است؛ ۱۵ دقیقه بعد دوباره امتحان کنید');
}
