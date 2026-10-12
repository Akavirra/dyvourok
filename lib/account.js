// Акаунти: створення/пошук користувача, доступ з прив'язаних кодів, сесії акаунта.
// Сесія акаунта в тій самій кукі dyvo_s: {u: user id, s: id сесії, n: ім'я для грамоти, p: набори, e: e-mail, exp}.
// Сесія коду (activate.js) лишається як була: {c: код, d: пристрій, n, p, exp}.
import { json, readSession, signSession, sessionCookie, SESSION_DAYS } from './auth.js';

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

export const randomId = (bytes = 18) => hex(crypto.getRandomValues(new Uint8Array(bytes)));
export async function hash(value, secret) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(secret + ':' + value)));
}

export function normalizeEmail(raw) {
  const e = String(raw || '').trim().toLowerCase();
  return e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

// Знайти або створити користувача за e-mail (Google додає google_sub і ім'я)
export async function upsertUser(env, { email, name = '', googleSub = null }) {
  const now = Date.now();
  let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user && googleSub) user = await env.DB.prepare('SELECT * FROM users WHERE google_sub = ?').bind(googleSub).first();
  if (!user) {
    user = { id: randomId(12), email, name, google_sub: googleSub, created_at: now, last_login: now };
    await env.DB.prepare('INSERT INTO users (id, email, name, google_sub, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(user.id, email, name, googleSub, now, now).run();
    return user;
  }
  await env.DB.prepare('UPDATE users SET last_login = ?, name = CASE WHEN name = \'\' THEN ? ELSE name END, google_sub = COALESCE(google_sub, ?) WHERE id = ?')
    .bind(now, name, googleSub, user.id).run();
  return { ...user, name: user.name || name };
}

// Прив'язати код до акаунта. Повертає null або код помилки (як в activate.js).
export async function linkCode(env, userId, code) {
  const row = await env.DB.prepare('SELECT * FROM codes WHERE code = ?').bind(code).first();
  if (!row) return 'invalid';
  if (row.revoked) return 'revoked';
  if (row.expires_at && row.expires_at < Date.now()) return 'expired';
  if (row.user_id && row.user_id !== userId) return 'taken';
  if (!row.user_id) await env.DB.prepare('UPDATE codes SET user_id = ? WHERE code = ? AND user_id IS NULL').bind(userId, code).run();
  return null;
}

// Доступ акаунта: усі дійсні прив'язані коди. Коди, куплені на цю пошту (codes.email), прив'язуються самі.
export async function accountAccess(env, user) {
  await env.DB.prepare('UPDATE codes SET user_id = ? WHERE user_id IS NULL AND revoked = 0 AND lower(trim(email)) = ?').bind(user.id, user.email).run();
  const now = Date.now();
  const { results } = await env.DB.prepare('SELECT code, note, packs, expires_at FROM codes WHERE user_id = ? AND revoked = 0 AND (expires_at IS NULL OR expires_at > ?) ORDER BY created_at')
    .bind(user.id, now).all();
  const set = new Set();
  let all = false;
  for (const r of results) r.packs === '*' ? (all = true) : r.packs.split(',').forEach(p => p && set.add(p));
  const note = user.name || (results.find(r => r.note) || {}).note || '';   // ім'я для грамоти: з акаунта, інакше з коду
  const expiring = results.map(r => r.expires_at).filter(Boolean);
  return { codes: results, packs: all ? '*' : [...set].join(','), note, until: expiring.length ? Math.min(...expiring) : Infinity };
}

// Видати кукі сесії акаунта. sid — наявна сесія (оновлення) або нова.
export async function issueUserSession(env, user, sid, label = '') {
  const now = Date.now();
  if (!sid) {
    sid = randomId();
    await env.DB.prepare('INSERT INTO user_sessions (id, user_id, label, created_at, last_seen) VALUES (?, ?, ?, ?, ?)').bind(sid, user.id, label.slice(0, 80), now, now).run();
  } else {
    await env.DB.prepare('UPDATE user_sessions SET last_seen = ? WHERE id = ?').bind(now, sid).run();
  }
  const acc = await accountAccess(env, user);
  const exp = Math.min(now + SESSION_DAYS * 864e5, acc.until);
  const token = await signSession({ u: user.id, s: sid, n: acc.note, p: acc.packs, e: user.email, exp }, env.SESSION_SECRET);
  const data = { ok: true, account: true, email: user.email, name: user.name, school: user.school || '', news: user.news ?? null, note: acc.note, packs: acc.packs, exp };
  return { data, cookie: sessionCookie(token, Math.floor((exp - now) / 1000)) };
}

// Вхід: якщо на пристрої вже була сесія коду — переносимо код в акаунт і звільняємо місце пристрою.
export async function login(env, request, user, label) {
  const old = await readSession(request, env);
  if (old && old.c) {
    const err = await linkCode(env, user.id, old.c);
    if (!err) await env.DB.prepare('DELETE FROM devices WHERE code = ? AND device_id = ?').bind(old.c, old.d).run();
  }
  if (old && old.s) await env.DB.prepare('DELETE FROM user_sessions WHERE id = ?').bind(old.s).run();
  return issueUserSession(env, user, null, label);
}

export async function sessionUser(env, s) {
  if (!s || !s.u) return null;
  const live = await env.DB.prepare('SELECT 1 FROM user_sessions WHERE id = ? AND user_id = ?').bind(s.s, s.u).first();
  if (!live) return null;
  return env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(s.u).first();
}

export function deviceLabel(request) {
  const ua = request.headers.get('user-agent') || '';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Пристрій';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return `${os} ${br}`.trim();
}

export { json };
