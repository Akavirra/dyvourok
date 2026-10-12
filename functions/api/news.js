// Оголошення для застосунку.
// GET  /api/news?d=<пристрій>&g=1-4,5-7 — актуальні оголошення для цього вчителя (з позначкою «прочитано»)
// POST /api/news {ids: [..], event: 'seen'|'read'|'click', d} — позначити
// Аудиторія: buyers — є хоч один набір (сесія коду чи акаунта), demo — немає. g — вікові версії, з якими працює вчитель.
import { json, readSession } from '../../lib/auth.js';

async function viewer(request, env, deviceId) {
  const s = await readSession(request, env);
  const id = s && s.u ? 'u:' + s.u : deviceId && /^[\w-]{8,64}$/.test(deviceId) ? 'd:' + deviceId : null;
  return { id, buyer: !!(s && s.p) };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const v = await viewer(request, env, url.searchParams.get('d'));
  const grades = (url.searchParams.get('g') || '').split(',').filter(Boolean);
  const now = Date.now();
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.title, a.body, a.button_label, a.button_url, a.audience, a.grades, a.important, a.starts_at,
       v.read_at IS NOT NULL AS read
     FROM announcements a LEFT JOIN announcement_views v ON v.ann_id = a.id AND v.viewer = ?
     WHERE a.hidden = 0 AND a.starts_at <= ? AND (a.ends_at IS NULL OR a.ends_at > ?)
     ORDER BY a.starts_at DESC LIMIT 30`).bind(v.id || '', now, now).all();
  const items = results
    .filter(a => a.audience === 'all' || (a.audience === 'buyers') === v.buyer)
    .filter(a => !a.grades || a.grades.split(',').some(g => grades.includes(g)))
    .map(({ audience, grades: _g, ...a }) => ({ ...a, important: !!a.important, read: !!a.read }));
  return json({ items });
}

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const v = await viewer(request, env, String(b.d || ''));
  const col = { seen: 'seen_at', read: 'read_at', click: 'clicked_at' }[b.event];
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(n => parseInt(n, 10)).filter(n => n > 0).slice(0, 30);
  if (!v.id || !col || !ids.length) return json({ error: 'bad-request' }, 400);
  const now = Date.now();
  // прочитане й натиснуте — завжди й побачене; read не перезаписуємо, щоб лишалась дата першого прочитання
  const sets = col === 'seen_at' ? 'seen_at = COALESCE(seen_at, ?3)'
    : col === 'read_at' ? 'seen_at = COALESCE(seen_at, ?3), read_at = COALESCE(read_at, ?3)'
    : 'seen_at = COALESCE(seen_at, ?3), read_at = COALESCE(read_at, ?3), clicked_at = COALESCE(clicked_at, ?3)';
  await env.DB.batch(ids.map(id => env.DB.prepare(
    `INSERT INTO announcement_views (ann_id, viewer, seen_at, read_at, clicked_at) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(ann_id, viewer) DO UPDATE SET ${sets}`)
    .bind(id, v.id, now, col !== 'seen_at' ? now : null, col === 'clicked_at' ? now : null)));
  return json({ ok: true });
}
