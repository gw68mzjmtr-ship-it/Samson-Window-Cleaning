import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

const cookieName = 'samson_yt_session';
type Session = { access_token: string; refresh_token?: string; expires_at: number; email: string; channel_id: string };
function key() {
  const secret = process.env.SAMSON_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SAMSON_SESSION_SECRET must be at least 32 characters');
  return createHash('sha256').update(secret).digest();
}
function seal(data: Session) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
function unseal(value: string): Session | null {
  try {
    const b = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
    decipher.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString());
  } catch { return null; }
}
export async function saveSession(session: Session) {
  (await cookies()).set(cookieName, seal(session), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
}
export async function getSession(): Promise<Session | null> {
  const value = (await cookies()).get(cookieName)?.value;
  return value ? unseal(value) : null;
}
export function appUrl() {
  const url = process.env.SAMSON_APP_URL;
  if (!url || !url.startsWith('https://')) throw new Error('SAMSON_APP_URL must be an HTTPS origin');
  return url.replace(/\/$/, '');
}
export function googleCredentials() {
  const client_id = process.env.GOOGLE_CLIENT_ID, client_secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!client_id || !client_secret) throw new Error('Missing Google OAuth credentials');
  return { client_id, client_secret };
}
export async function authorizedToken(): Promise<string | null> {
  const s = await getSession();
  if (!s || s.email.toLowerCase() !== (process.env.SAMSON_ADMIN_EMAIL || '').toLowerCase() || s.channel_id !== process.env.SAMSON_YOUTUBE_CHANNEL_ID) return null;
  if (Date.now() < s.expires_at - 60000) return s.access_token;
  if (!s.refresh_token) return null;
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...googleCredentials(), refresh_token: s.refresh_token, grant_type: 'refresh_token' }), cache: 'no-store' });
  if (!r.ok) return null;
  const data = await r.json();
  await saveSession({ ...s, access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}
export async function youtube(path: string, token: string, init?: RequestInit) {
  return fetch('https://www.googleapis.com/youtube/v3/' + path, { ...init, headers: { Authorization: 'Bearer ' + token, ...(init?.headers || {}) }, cache: 'no-store' });
}
export function allowedOrigin(req: Request) {
  try { return new URL(req.headers.get('origin') || '').origin === appUrl(); } catch { return false; }
}
