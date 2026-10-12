// PUT /api/state {state} — злити стан пристрою зі станом акаунта (класи, прогрес) і повернути результат.
// Один запит і для відправки, і для отримання: пристрій завжди надсилає свою копію, сервер зливає й зберігає.
import { json, readSession } from '../../lib/auth.js';
import { sessionUser } from '../../lib/account.js';
import { cleanState, mergeState } from '../../lib/state.js';

export async function onRequestPut({ request, env }) {
  const user = await sessionUser(env, await readSession(request, env));
  if (!user) return json({ error: 'no-session' }, 401);
  const text = await request.text();
  if (text.length > 200000) return json({ error: 'too-big' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'bad-request' }, 400); }
  let stored = {};
  try { stored = JSON.parse(user.state || '{}'); } catch {}
  const merged = mergeState(cleanState(stored), cleanState(body.state));
  const out = JSON.stringify(merged);
  if (out !== JSON.stringify(cleanState(stored))) await env.DB.prepare('UPDATE users SET state = ? WHERE id = ?').bind(out, user.id).run();
  return json({ state: merged });
}
