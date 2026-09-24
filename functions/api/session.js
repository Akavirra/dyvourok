// POST /api/session — оновити сесію (перевірка, що код не заблоковано і пристрій ще зареєстрований).
// DELETE /api/session — вийти з цього пристрою і звільнити місце в ліміті.
import { json, readSession, signSession, sessionCookie, SESSION_DAYS } from '../../lib/auth.js';

const clear = { 'set-cookie': sessionCookie('', 0) };

export async function onRequestPost({ request, env }) {
  const s = await readSession(request, env);
  if (!s) return json({ error: 'no-session' }, 401, clear);
  const row = await env.DB.prepare('SELECT * FROM codes WHERE code = ?').bind(s.c).first();
  const dev = await env.DB.prepare('SELECT 1 FROM devices WHERE code = ? AND device_id = ?').bind(s.c, s.d).first();
  const now = Date.now();
  if (!row || row.revoked || !dev || (row.expires_at && row.expires_at < now)) return json({ error: 'revoked' }, 401, clear);
  await env.DB.prepare('UPDATE devices SET last_seen = ? WHERE code = ? AND device_id = ?').bind(now, s.c, s.d).run();
  const exp = Math.min(now + SESSION_DAYS * 864e5, row.expires_at || Infinity);
  const token = await signSession({ c: s.c, d: s.d, n: row.note, p: row.packs, exp }, env.SESSION_SECRET);
  return json({ ok: true, note: row.note, packs: row.packs, exp }, 200, { 'set-cookie': sessionCookie(token, Math.floor((exp - now) / 1000)) });
}

export async function onRequestDelete({ request, env }) {
  const s = await readSession(request, env);
  if (s) await env.DB.prepare('DELETE FROM devices WHERE code = ? AND device_id = ?').bind(s.c, s.d).run();
  return json({ ok: true }, 200, clear);
}
