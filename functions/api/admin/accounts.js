// Адмінка: акаунти вчителів (Authorization: Bearer ADMIN_TOKEN)
// GET  /api/admin/accounts                              — акаунти з прив'язаними кодами й кількістю пристроїв
// POST /api/admin/accounts {action: 'unlink', code}     — відв'язати код від акаунта (код лишається дійсним)
// POST /api/admin/accounts {action: 'link', code, email} — прив'язати код до акаунта з цією поштою (перенести з іншого)
// POST /api/admin/accounts {action: 'logout', id}       — завершити всі сесії акаунта
import { json, isAdmin, normalizeCode } from '../../../lib/auth.js';
import { normalizeEmail } from '../../../lib/account.js';

export async function onRequest({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: 'forbidden' }, 403);

  if (request.method === 'GET') {
    const { results: users } = await env.DB.prepare(
      `SELECT u.id, u.email, u.name, u.school, u.news, u.news_at, u.google_sub IS NOT NULL AS google, u.created_at, u.last_login,
         (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = u.id) AS sessions,
         (SELECT MAX(last_seen) FROM user_sessions s WHERE s.user_id = u.id) AS last_seen,
         length(u.state) AS state_size
       FROM users u ORDER BY u.created_at DESC LIMIT 1000`).all();
    const { results: codes } = await env.DB.prepare('SELECT code, note, packs, user_id, revoked, kind FROM codes WHERE user_id IS NOT NULL').all();
    const byUser = {};
    for (const c of codes) (byUser[c.user_id] = byUser[c.user_id] || []).push(c);
    return json({ accounts: users.map(u => ({ ...u, google: !!u.google, codes: byUser[u.id] || [] })) });
  }

  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }

  if (b.action === 'unlink' || b.action === 'link') {
    const code = normalizeCode(b.code);
    if (!code) return json({ error: 'invalid' }, 400);
    const row = await env.DB.prepare('SELECT code FROM codes WHERE code = ?').bind(code).first();
    if (!row) return json({ error: 'invalid' }, 404);
    if (b.action === 'unlink') {
      await env.DB.prepare('UPDATE codes SET user_id = NULL WHERE code = ?').bind(code).run();
    } else {
      const email = normalizeEmail(b.email);
      const user = email && await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      if (!user) return json({ error: 'no-user' }, 404);
      await env.DB.prepare('UPDATE codes SET user_id = ? WHERE code = ?').bind(user.id, code).run();
    }
    return json({ ok: true });
  }
  if (b.action === 'logout') {
    await env.DB.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(String(b.id || '')).run();
    return json({ ok: true });
  }
  return json({ error: 'action' }, 400);
}
