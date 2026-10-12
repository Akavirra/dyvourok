// Адмінка (Authorization: Bearer ADMIN_TOKEN)
// GET  /api/admin/codes            — список кодів з кількістю пристроїв
// POST /api/admin/codes {note, contact, hi, email, source, grade, amount, paidAt, kind, count, maxDevices, packs, days}   — створити коди
// POST /api/admin/codes {action: 'revoke'|'restore'|'reset-devices', code}
// POST /api/admin/codes {action: 'set-contact', code, contact}   — змінити приватну нотатку
// POST /api/admin/codes {action: 'update', code, fields: {…}}    — змінити дані покупця (див. FIELDS)
// Покупцю йдуть лише note і packs (activate.js, session.js); решта полів — тільки для адмінки.
import { json, isAdmin, newCode, normalizeCode } from '../../../lib/auth.js';

const SOURCES = ['messenger', 'instagram', 'site', 'tiktok', 'other', ''];
const GRADES = ['1-4', '5-7', '8-11', ''];
const KINDS = ['sale', 'gift', 'test'];
const text = (v, max) => String(v ?? '').trim().slice(0, max);
const intOrNull = v => (v === '' || v == null || isNaN(parseInt(v, 10)) ? null : parseInt(v, 10));
// поле → як його перевірити; повертає undefined, якщо значення неприйнятне
const FIELDS = {
  note: v => text(v, 120),
  contact: v => text(v, 300),
  hi: v => text(v, 60),
  email: v => text(v, 200),
  source: v => (SOURCES.includes(v) ? v : undefined),
  grade: v => (GRADES.includes(v) ? v : undefined),
  amount: v => { const n = intOrNull(v); return n == null ? null : Math.max(0, Math.min(100000, n)); },
  paid_at: v => intOrNull(v),
  kind: v => (KINDS.includes(v) ? v : undefined)
};

export async function onRequest({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: 'forbidden' }, 403);

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT c.*, COUNT(d.device_id) AS devices, MAX(d.last_seen) AS last_seen, (SELECT email FROM users u WHERE u.id = c.user_id) AS account_email
       FROM codes c LEFT JOIN devices d ON d.code = c.code
       GROUP BY c.code ORDER BY c.created_at DESC LIMIT 500`).all();
    return json({ codes: results });
  }

  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }

  if (b.action) {
    const code = normalizeCode(b.code);
    if (!code) return json({ error: 'invalid' }, 400);
    if (b.action === 'revoke') await env.DB.prepare('UPDATE codes SET revoked = 1 WHERE code = ?').bind(code).run();
    else if (b.action === 'restore') await env.DB.prepare('UPDATE codes SET revoked = 0 WHERE code = ?').bind(code).run();
    else if (b.action === 'reset-devices') await env.DB.prepare('DELETE FROM devices WHERE code = ?').bind(code).run();
    else if (b.action === 'set-contact') await env.DB.prepare('UPDATE codes SET contact = ? WHERE code = ?').bind(text(b.contact, 300), code).run();
    else if (b.action === 'update') {
      const sets = [], vals = [];
      for (const [k, v] of Object.entries(b.fields || {})) {
        if (!FIELDS[k]) continue;
        const val = FIELDS[k](v);
        if (val === undefined) return json({ error: 'field', field: k }, 400);
        sets.push(k + ' = ?'); vals.push(val);
      }
      if (!sets.length) return json({ error: 'fields' }, 400);
      await env.DB.prepare(`UPDATE codes SET ${sets.join(', ')} WHERE code = ?`).bind(...vals, code).run();
    }
    else return json({ error: 'action' }, 400);
    return json({ ok: true });
  }

  const count = Math.max(1, Math.min(100, parseInt(b.count, 10) || 1));
  const maxDevices = Math.max(1, Math.min(50, parseInt(b.maxDevices, 10) || 3));
  // набір обирається явно: порожнє значення не перетворюється на «усі набори»
  const packs = String(b.packs || '').trim();
  if (packs !== '*' && !/^[a-z0-9-]+(,[a-z0-9-]+)*$/.test(packs)) return json({ error: 'packs' }, 400);
  const f = {};
  for (const [k, key] of [['note', 'note'], ['contact', 'contact'], ['hi', 'hi'], ['email', 'email'], ['source', 'source'],
    ['grade', 'grade'], ['amount', 'amount'], ['paid_at', 'paidAt'], ['kind', 'kind']]) {
    const val = FIELDS[k](b[key] ?? (k === 'kind' ? 'sale' : k === 'source' || k === 'grade' ? '' : b[key]));
    if (val === undefined) return json({ error: 'field', field: k }, 400);
    f[k] = val;
  }
  const now = Date.now();
  const expires = b.days ? now + Math.max(1, parseInt(b.days, 10)) * 864e5 : null;
  const created = [];
  for (let i = 0; i < count; i++) {
    const code = newCode();
    await env.DB.prepare(
      `INSERT INTO codes (code, note, contact, hi, email, source, grade, amount, paid_at, kind, packs, max_devices, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(code, f.note, f.contact, f.hi, f.email, f.source, f.grade, f.amount, f.paid_at, f.kind, packs, maxDevices, now, expires).run();
    created.push(code);
  }
  return json({ ok: true, codes: created });
}
