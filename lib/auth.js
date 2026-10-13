// Спільне для функцій: відповіді, підписані сесії (HMAC-SHA256), кукі, генерація кодів.
export const SESSION_COOKIE = 'dyvo_s';
export const SESSION_DAYS = 30;
const enc = new TextEncoder();

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}

const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token, secret) {
  if (!token || !secret) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  const found = header.split(/;\s*/).find(c => c.startsWith(name + '='));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

export function sessionCookie(token, maxAgeSec) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

export async function readSession(request, env) {
  return verifySession(getCookie(request, SESSION_COOKIE), env.SESSION_SECRET);
}

export function packAllowed(session, packId) {
  return !!session && (session.p === '*' || session.p.split(',').includes(packId));
}

// Порівняння без витоку часу — для адмін-токена
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Адмінка: або запасний токен (Authorization: Bearer ADMIN_TOKEN), або сесія входу через Google (кукі dyvo_adm).
// Сесія: підписана SESSION_SECRET (t:'adm' — щоб кукі вчителя не підійшла), пошта з ADMIN_EMAILS, рядок у admin_sessions
// (видалили — відкликано). Кукі SameSite=Strict + обов'язковий заголовок x-dyvo-admin: чужі сайти не зроблять запит від вашого імені.
export const ADMIN_COOKIE = 'dyvo_adm';
export const ADMIN_DAYS = 30;
export const adminEmails = env => String(env.ADMIN_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
export const adminCookie = (token, maxAgeSec) => `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`;

// why — необов'язковий об'єкт: сюди пишемо причину відмови (для екрана входу; без секретів)
export async function adminSession(request, env, why = {}) {
  if (request.headers.get('x-dyvo-admin') !== '1') { why.reason = 'no-header'; return null; }
  const raw = getCookie(request, ADMIN_COOKIE);
  if (!raw) { why.reason = 'no-cookie'; return null; }
  const s = await verifySession(raw, env.SESSION_SECRET);
  if (!s || s.t !== 'adm') { why.reason = 'bad-cookie'; return null; }
  if (!adminEmails(env).includes(s.e)) { why.reason = 'email'; return null; }
  const row = await env.DB.prepare('SELECT id, last_seen FROM admin_sessions WHERE id = ? AND email = ?').bind(s.s, s.e).first();
  if (!row) { why.reason = 'revoked'; return null; }
  if (Date.now() - row.last_seen > 36e5) await env.DB.prepare('UPDATE admin_sessions SET last_seen = ? WHERE id = ?').bind(Date.now(), row.id).run();
  return s;
}

export async function isAdmin(request, env) {
  const h = request.headers.get('authorization') || '';
  const expected = (env.ADMIN_TOKEN || '').trim();
  if (h && expected && safeEqual(h.replace(/^Bearer\s+/i, '').trim(), expected)) return true;
  const why = {};
  if (await adminSession(request, env, why)) return true;
  if (why.reason !== 'no-cookie' && why.reason !== 'no-header') console.log('admin denied:', why.reason);
  isAdmin.lastReason = why.reason;
  return false;
}

// Коди без схожих символів (0/O, 1/I/L): DYVO-XXXX-XXXX
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map(b => ALPHABET[b % ALPHABET.length]).join('');
  return `DYVO-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export function normalizeCode(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = s.startsWith('DYVO') ? s.slice(4) : s;
  return body.length === 8 ? `DYVO-${body.slice(0, 4)}-${body.slice(4)}` : null;
}
