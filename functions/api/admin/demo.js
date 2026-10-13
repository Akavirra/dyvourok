// Статистика демо (Authorization: Bearer ADMIN_TOKEN)
// GET /api/admin/demo?days=30&tz=-180 — воронка (унікальні відвідувачі на кожен крок), по днях і за джерелами.
// Відвідувача рахуємо в періоді, якщо він ПОЧАВ демо в цьому періоді — тоді воронка не «ламається» на межі днів.
import { json, isAdmin } from '../../../lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'forbidden', reason: isAdmin.lastReason }, 403);
  const q = new URL(request.url).searchParams;
  const days = Math.min(Math.max(parseInt(q.get('days')) || 0, 0), 3650);   // 0 — за весь час
  const tzMin = -(parseInt(q.get('tz')) || 0);                                 // getTimezoneOffset браузера: Київ = -180
  const since = days ? Date.now() - days * 864e5 : 0;

  const cohort = `SELECT visitor FROM demo_events WHERE event = 'start' AND first_at >= ?1`;
  const [funnel, daily, sources] = await env.DB.batch([
    env.DB.prepare(`SELECT event, COUNT(*) AS n FROM demo_events WHERE visitor IN (${cohort}) GROUP BY event`).bind(since),
    env.DB.prepare(
      `SELECT date((s.first_at / 1000) + ?2 * 60, 'unixepoch') AS day, e.event, COUNT(*) AS n
       FROM demo_events s JOIN demo_events e ON e.visitor = s.visitor
       WHERE s.event = 'start' AND s.first_at >= ?1 GROUP BY day, e.event ORDER BY day DESC`).bind(since, tzMin),
    env.DB.prepare(
      `SELECT CASE WHEN s.source = '' THEN '—' ELSE s.source END AS source, e.event, COUNT(*) AS n
       FROM demo_events s JOIN demo_events e ON e.visitor = s.visitor
       WHERE s.event = 'start' AND s.first_at >= ?1 GROUP BY 1, e.event`).bind(since)
  ]);
  return json({ funnel: funnel.results, daily: daily.results, sources: sources.results });
}
