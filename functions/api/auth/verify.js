// POST /api/auth/verify {email, code} або {token} — перевірити код/посилання з листа, створити акаунт і сесію.
import { json, normalizeEmail, hash, upsertUser, login, deviceLabel } from '../../../lib/account.js';

const MAX_ATTEMPTS = 5;

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const now = Date.now();
  let row;
  if (b.token) {
    row = await env.DB.prepare('SELECT * FROM login_codes WHERE link_hash = ?').bind(await hash(String(b.token).slice(0, 100), env.SESSION_SECRET)).first();
    if (!row || row.expires_at < now) return json({ error: 'expired' }, 400);
  } else {
    const email = normalizeEmail(b.email);
    const code = String(b.code || '').replace(/\D/g, '');
    if (!email || code.length !== 6) return json({ error: 'code' }, 400);
    row = await env.DB.prepare('SELECT * FROM login_codes WHERE email = ?').bind(email).first();
    if (!row || row.expires_at < now || row.attempts >= MAX_ATTEMPTS) return json({ error: 'expired' }, 400);
    if (await hash(code, env.SESSION_SECRET) !== row.code_hash) {
      await env.DB.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?').bind(email).run();
      return json({ error: 'code', left: MAX_ATTEMPTS - row.attempts - 1 }, 400);
    }
  }
  // одноразово: після входу код і посилання більше не діють (ліміт відправок зберігаємо)
  await env.DB.prepare('UPDATE login_codes SET expires_at = 0 WHERE email = ?').bind(row.email).run();
  const user = await upsertUser(env, { email: row.email });
  const { data, cookie } = await login(env, request, user, deviceLabel(request));
  return json(data, 200, { 'set-cookie': cookie });
}
