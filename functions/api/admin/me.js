// Адмінка: хто увійшов і сесії входу через Google
// GET  /api/admin/me                                   — {email | null (вхід токеном), session, sessions[]}
// POST /api/admin/me {action: 'logout'}                — вийти на цьому пристрої
// POST /api/admin/me {action: 'logout-all'}            — завершити всі сесії адмінки (зокрема цю)
// POST /api/admin/me {action: 'revoke', id}            — завершити одну сесію
import { json, isAdmin, adminSession, adminCookie } from '../../../lib/auth.js';

export async function onRequest({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'forbidden' }, 403);
  const s = await adminSession(request, env);   // null — увійшли запасним токеном
  const db = env.DB;
  if (request.method === 'GET') {
    const { results } = await db.prepare('SELECT id, email, label, created_at, last_seen FROM admin_sessions ORDER BY last_seen DESC LIMIT 50').all();
    return json({ email: s ? s.e : null, session: s ? s.s : null, sessions: results });
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const clear = { 'set-cookie': adminCookie('', 0) };
  if (b.action === 'logout') {
    if (s) await db.prepare('DELETE FROM admin_sessions WHERE id = ?').bind(s.s).run();
    return json({ ok: true }, 200, clear);
  }
  if (b.action === 'logout-all') {
    await db.prepare('DELETE FROM admin_sessions').run();
    return json({ ok: true }, 200, clear);
  }
  if (b.action === 'revoke') {
    await db.prepare('DELETE FROM admin_sessions WHERE id = ?').bind(String(b.id || '')).run();
    return json({ ok: true }, 200, s && b.id === s.s ? clear : {});
  }
  return json({ error: 'action' }, 400);
}
