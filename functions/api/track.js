// POST /api/track {v, e, src} — крок демо (анонімно): v — випадковий id пристрою, e — подія зі списку, src — звідки прийшли.
import { json } from '../../lib/auth.js';

const EVENTS = ['start', 'stop', 'play', 'half', 'end', 'task', 'done', 'locked', 'samples', 'want', 'code', 'preorder'];
const VISITOR = /^[a-z0-9-]{8,40}$/i;
const BOT = /bot|crawl|spider|preview|headless|lighthouse/i;

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const v = String(b.v || ''), e = String(b.e || '');
  if (!VISITOR.test(v) || !EVENTS.includes(e)) return json({ error: 'bad-request' }, 400);
  if (BOT.test(request.headers.get('user-agent') || '')) return json({ ok: true });
  const src = String(b.src || '').trim().slice(0, 60);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO demo_events (visitor, event, source, first_at, last_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(visitor, event) DO UPDATE SET n = n + 1, last_at = excluded.last_at,
       source = CASE WHEN source = '' THEN excluded.source ELSE source END`)
    .bind(v, e, src, now, now).run();
  return json({ ok: true });
}
