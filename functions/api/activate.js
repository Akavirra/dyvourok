// POST /api/activate {code, deviceId, label} — активація коду на пристрої, видає сесію в HttpOnly-кукі.
import { json, normalizeCode, signSession, sessionCookie, SESSION_DAYS } from '../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const code = normalizeCode(body.code);
  const deviceId = String(body.deviceId || '').slice(0, 64);
  const label = String(body.label || '').slice(0, 80);
  if (!code || deviceId.length < 16) return json({ error: 'invalid' }, 400);

  const row = await env.DB.prepare('SELECT * FROM codes WHERE code = ?').bind(code).first();
  if (!row) return json({ error: 'invalid' }, 404);
  if (row.revoked) return json({ error: 'revoked' }, 403);
  const now = Date.now();
  if (row.expires_at && row.expires_at < now) return json({ error: 'expired' }, 403);

  const known = await env.DB.prepare('SELECT 1 FROM devices WHERE code = ? AND device_id = ?').bind(code, deviceId).first();
  if (!known) {
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM devices WHERE code = ?').bind(code).first();
    if (n >= row.max_devices) return json({ error: 'devices', max: row.max_devices }, 403);
    await env.DB.prepare('INSERT INTO devices (code, device_id, label, first_seen, last_seen) VALUES (?, ?, ?, ?, ?)')
      .bind(code, deviceId, label, now, now).run();
  } else {
    await env.DB.prepare('UPDATE devices SET last_seen = ?, label = ? WHERE code = ? AND device_id = ?').bind(now, label, code, deviceId).run();
  }

  const exp = Math.min(now + SESSION_DAYS * 864e5, row.expires_at || Infinity);
  const token = await signSession({ c: code, d: deviceId, n: row.note, p: row.packs, exp }, env.SESSION_SECRET);
  return json({ ok: true, note: row.note, packs: row.packs, exp }, 200, { 'set-cookie': sessionCookie(token, Math.floor((exp - now) / 1000)) });
}
