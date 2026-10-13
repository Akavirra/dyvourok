// Адмінка передзамовлень (Authorization: Bearer ADMIN_TOKEN)
// GET  /api/admin/preorders                     — усі заявки, новіші першими
// POST /api/admin/preorders {action: 'delete', contact}
// POST /api/admin/preorders {action: 'status', contact, status}   — new | written | paid | declined
import { json, isAdmin } from '../../../lib/auth.js';

const STATUSES = ['new', 'written', 'paid', 'declined'];

export async function onRequest({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'forbidden' }, 403);

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM preorders ORDER BY created_at DESC LIMIT 2000').all();
    return json({ preorders: results });
  }

  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  if (!b.contact) return json({ error: 'action' }, 400);
  if (b.action === 'delete') await env.DB.prepare('DELETE FROM preorders WHERE contact = ?').bind(String(b.contact)).run();
  else if (b.action === 'status' && STATUSES.includes(b.status))
    await env.DB.prepare('UPDATE preorders SET status = ? WHERE contact = ?').bind(b.status, String(b.contact)).run();
  else return json({ error: 'action' }, 400);
  return json({ ok: true });
}
