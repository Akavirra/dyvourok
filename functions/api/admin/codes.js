// Адмінка (Authorization: Bearer ADMIN_TOKEN)
// GET  /api/admin/codes            — список кодів з кількістю пристроїв
// POST /api/admin/codes {note, count, maxDevices, packs, days}   — створити коди
// POST /api/admin/codes {action: 'revoke'|'restore'|'reset-devices', code}
import { json, isAdmin, newCode, normalizeCode } from '../../../lib/auth.js';

export async function onRequest({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: 'forbidden' }, 403);

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT c.*, COUNT(d.device_id) AS devices, MAX(d.last_seen) AS last_seen
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
    else return json({ error: 'action' }, 400);
    return json({ ok: true });
  }

  const count = Math.max(1, Math.min(100, parseInt(b.count, 10) || 1));
  const maxDevices = Math.max(1, Math.min(50, parseInt(b.maxDevices, 10) || 3));
  const packs = String(b.packs || '*').trim() || '*';
  const note = String(b.note || '').slice(0, 120);
  const now = Date.now();
  const expires = b.days ? now + Math.max(1, parseInt(b.days, 10)) * 864e5 : null;
  const created = [];
  for (let i = 0; i < count; i++) {
    const code = newCode();
    await env.DB.prepare('INSERT INTO codes (code, note, packs, max_devices, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(code, note, packs, maxDevices, now, expires).run();
    created.push(code);
  }
  return json({ ok: true, codes: created });
}
