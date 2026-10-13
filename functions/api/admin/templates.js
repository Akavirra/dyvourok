// Адмінка: шаблони відповідей покупцям (Authorization: Bearer ADMIN_TOKEN)
// GET  /api/admin/templates                                   — {templates, settings}
// POST /api/admin/templates {action: 'save', id?, section, title, channel, hint, note, subject, body, show_until} — створити або змінити
// POST /api/admin/templates {action: 'delete', id}            — видалити
// POST /api/admin/templates {action: 'move', id, dir: -1|1}   — посунути вище / нижче в межах розділу
// POST /api/admin/templates {action: 'settings', settings}    — реквізити для шаблонів ({card} {owner} {paylink} {sign})
import { json, isAdmin } from '../../../lib/auth.js';

const text = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const CHANNELS = ['msg', 'mail', 'com'];
const SETTINGS = ['card', 'owner', 'paylink', 'sign'];

export async function onRequest({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'forbidden', reason: isAdmin.lastReason }, 403);
  const db = env.DB;
  if (request.method === 'GET') {
    const [t, s] = await db.batch([
      db.prepare('SELECT * FROM reply_templates ORDER BY sort, id'),
      db.prepare('SELECT k, v FROM admin_settings')
    ]);
    return json({ templates: t.results, settings: Object.fromEntries(s.results.map(r => [r.k, r.v])) });
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const now = Date.now();

  if (b.action === 'delete') {
    await db.prepare('DELETE FROM reply_templates WHERE id = ?').bind(parseInt(b.id, 10)).run();
    return json({ ok: true });
  }

  if (b.action === 'move') {
    const id = parseInt(b.id, 10);
    const cur = await db.prepare('SELECT id, section, sort FROM reply_templates WHERE id = ?').bind(id).first();
    if (!cur) return json({ error: 'not-found' }, 404);
    const up = b.dir < 0;
    const other = await db.prepare(`SELECT id, sort FROM reply_templates WHERE section = ? AND (sort ${up ? '<' : '>'} ? OR (sort = ? AND id ${up ? '<' : '>'} ?))
      ORDER BY sort ${up ? 'DESC' : 'ASC'}, id ${up ? 'DESC' : 'ASC'} LIMIT 1`).bind(cur.section, cur.sort, cur.sort, id).first();
    if (!other) return json({ ok: true });
    const [a, z] = other.sort === cur.sort ? (up ? [cur.sort - 1, cur.sort] : [cur.sort + 1, cur.sort]) : [other.sort, cur.sort];
    await db.batch([
      db.prepare('UPDATE reply_templates SET sort = ? WHERE id = ?').bind(a, id),
      db.prepare('UPDATE reply_templates SET sort = ? WHERE id = ?').bind(z, other.id)
    ]);
    return json({ ok: true });
  }

  if (b.action === 'settings') {
    const s = b.settings || {};
    await db.batch(SETTINGS.map(k => db.prepare('INSERT INTO admin_settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, text(s[k], 300))));
    return json({ ok: true });
  }

  if (b.action !== 'save') return json({ error: 'action' }, 400);
  const title = text(b.title, 120);
  const section = text(b.section, 60) || 'Інше';
  if (!title) return json({ error: 'title' }, 400);
  const channel = CHANNELS.includes(b.channel) ? b.channel : 'msg';
  const until = parseInt(b.show_until, 10) || null;
  const vals = [section, title, channel, text(b.hint, 300), text(b.note, 300), channel === 'mail' ? text(b.subject, 200) : '', text(b.body, 6000), until, now];
  if (b.id) {
    await db.prepare(`UPDATE reply_templates SET section = ?, title = ?, channel = ?, hint = ?, note = ?, subject = ?, body = ?, show_until = ?, updated_at = ?
      WHERE id = ?`).bind(...vals, parseInt(b.id, 10)).run();
    return json({ ok: true, id: parseInt(b.id, 10) });
  }
  // новий шаблон — у кінець свого розділу (або в кінець списку, якщо розділ новий)
  const last = await db.prepare('SELECT MAX(sort) AS m FROM reply_templates WHERE section = ?').bind(section).first();
  const lastAll = await db.prepare('SELECT MAX(sort) AS m FROM reply_templates').first();
  const sort = (last && last.m != null ? last.m : (lastAll && lastAll.m) || 0) + 1;
  const r = await db.prepare(`INSERT INTO reply_templates (section, title, channel, hint, note, subject, body, show_until, updated_at, sort, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(...vals, sort, now).run();
  return json({ ok: true, id: r.meta.last_row_id });
}
