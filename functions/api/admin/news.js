// Адмінка: оголошення (Authorization: Bearer ADMIN_TOKEN)
// GET  /api/admin/news                         — усі оголошення зі статистикою (побачили / прочитали / натиснули)
// POST /api/admin/news {id?, title, body, button_label, button_url, audience, grades, important, starts_at, ends_at, hidden} — створити або змінити
// POST /api/admin/news {action: 'delete', id}  — видалити разом зі статистикою
import { json, isAdmin } from '../../../lib/auth.js';

const text = (v, max) => String(v ?? '').trim().slice(0, max);
const AUD = ['all', 'buyers', 'demo'];
const GRADES = ['1-4', '5-7', '8-11'];

export async function onRequest({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'forbidden', reason: isAdmin.lastReason }, 403);
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT a.*, COUNT(v.seen_at) AS seen, COUNT(v.read_at) AS reads, COUNT(v.clicked_at) AS clicks
       FROM announcements a LEFT JOIN announcement_views v ON v.ann_id = a.id
       GROUP BY a.id ORDER BY a.starts_at DESC LIMIT 200`).all();
    return json({ items: results });
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }

  if (b.action === 'delete') {
    const id = parseInt(b.id, 10);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM announcement_views WHERE ann_id = ?').bind(id),
      env.DB.prepare('DELETE FROM announcements WHERE id = ?').bind(id)
    ]);
    return json({ ok: true });
  }

  const title = text(b.title, 120);
  if (!title) return json({ error: 'title' }, 400);
  const url = text(b.button_url, 500);
  if (url && !/^(#\/|https:\/\/)/.test(url)) return json({ error: 'url' }, 400);   // лише сторінки застосунку або https
  const audience = AUD.includes(b.audience) ? b.audience : 'all';
  const grades = String(b.grades || '').split(',').filter(g => GRADES.includes(g)).join(',');
  const now = Date.now();
  const starts = parseInt(b.starts_at, 10) || now;
  const ends = parseInt(b.ends_at, 10) || null;
  const vals = [title, text(b.body, 2000), text(b.button_label, 40), url, audience, grades, b.important ? 1 : 0, starts, ends, b.hidden ? 1 : 0, now];
  if (b.id) {
    await env.DB.prepare(`UPDATE announcements SET title = ?, body = ?, button_label = ?, button_url = ?, audience = ?, grades = ?, important = ?,
      starts_at = ?, ends_at = ?, hidden = ?, updated_at = ? WHERE id = ?`).bind(...vals, parseInt(b.id, 10)).run();
  } else {
    await env.DB.prepare(`INSERT INTO announcements (title, body, button_label, button_url, audience, grades, important, starts_at, ends_at, hidden, updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(...vals, now).run();
  }
  return json({ ok: true });
}
