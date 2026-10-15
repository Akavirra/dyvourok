// GET    /api/me                        — дані акаунта: пошта, ім'я, школа, згода на листи, коди (покупки), пристрої
// POST   /api/me {code}                 — прив'язати код доступу до акаунта
// POST   /api/me {name?, school?, news?} — змінити профіль; news: true/false — згода на листи про нові набори
// POST   /api/me {action: 'logout-others'} — вийти на всіх інших пристроях
// DELETE /api/me                        — видалити акаунт (коди лишаються дійсними, але відв'язуються)
import { json, readSession, normalizeCode, sessionCookie } from '../../lib/auth.js';
import { sessionUser, linkCode, issueUserSession, accountAccess } from '../../lib/account.js';

async function current(request, env) {
  const s = await readSession(request, env);
  const user = await sessionUser(env, s);
  return user ? { s, user } : null;
}

export async function onRequestGet({ request, env }) {
  const cur = await current(request, env);
  if (!cur) return json({ error: 'no-session' }, 401);
  const acc = await accountAccess(env, cur.user);
  const { results: sessions } = await env.DB.prepare('SELECT id, label, last_seen FROM user_sessions WHERE user_id = ? ORDER BY last_seen DESC')
    .bind(cur.user.id).all();
  const { results: dates } = await env.DB.prepare('SELECT code, created_at, paid_at FROM codes WHERE user_id = ?').bind(cur.user.id).all();
  const when = Object.fromEntries(dates.map(d => [d.code, d.paid_at || d.created_at]));
  return json({
    email: cur.user.email, name: cur.user.name, school: cur.user.school, news: cur.user.news, google: !!cur.user.google_sub,
    created_at: cur.user.created_at, packs: acc.packs,
    free_packs: acc.freePacks,
    codes: acc.codes.map(c => ({ code: c.code.slice(0, 10) + '••••', packs: c.packs, note: c.note, expires_at: c.expires_at, since: when[c.code] })),
    sessions: sessions.map(x => ({ label: x.label, last_seen: x.last_seen, current: x.id === cur.s.s }))
  });
}

export async function onRequestPost({ request, env }) {
  const cur = await current(request, env);
  if (!cur) return json({ error: 'no-session' }, 401);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const u = cur.user;
  if (b.action === 'logout-others') {
    await env.DB.prepare('DELETE FROM user_sessions WHERE user_id = ? AND id != ?').bind(u.id, cur.s.s).run();
  } else if (b.code !== undefined) {
    const code = normalizeCode(b.code);
    if (!code) return json({ error: 'invalid' }, 400);
    const err = await linkCode(env, u.id, code);
    if (err) return json({ error: err }, err === 'invalid' ? 404 : 403);
  } else {
    if (typeof b.name === 'string') u.name = b.name.trim().slice(0, 120);
    if (typeof b.school === 'string') u.school = b.school.trim().slice(0, 160);
    if (typeof b.news === 'boolean' && (b.news ? 1 : 0) !== u.news) { u.news = b.news ? 1 : 0; u.news_at = Date.now(); }
    await env.DB.prepare('UPDATE users SET name = ?, school = ?, news = ?, news_at = ? WHERE id = ?')
      .bind(u.name, u.school, u.news ?? null, u.news_at ?? null, u.id).run();
  }
  const { data, cookie } = await issueUserSession(env, u, cur.s.s);
  return json(data, 200, { 'set-cookie': cookie });
}

export async function onRequestDelete({ request, env }) {
  const cur = await current(request, env);
  if (!cur) return json({ error: 'no-session' }, 401);
  const id = cur.user.id;
  await env.DB.batch([
    env.DB.prepare('UPDATE codes SET user_id = NULL WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM user_packs WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(cur.user.email),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id)
  ]);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
}
