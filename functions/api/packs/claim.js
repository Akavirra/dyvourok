// POST /api/packs/claim {pack, grade?, source?}
// Додає дозволений безкоштовний набір до поточного акаунта. Операція ідемпотентна.
import { json, readSession } from '../../../lib/auth.js';
import { sessionUser, issueUserSession } from '../../../lib/account.js';
import { CLAIMABLE_PACKS, cleanGrade, cleanSource } from '../../../lib/packs.js';

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403);

  const session = await readSession(request, env);
  const user = await sessionUser(env, session);
  if (!user) return json({ error: 'account-required' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const pack = String(body.pack || '');
  if (!CLAIMABLE_PACKS.has(pack)) return json({ error: 'not-claimable' }, 403);

  const now = Date.now();
  const grade = cleanGrade(body.grade);
  const source = cleanSource(body.source);
  await env.DB.prepare(
    `INSERT INTO user_packs (user_id, pack_id, claimed_at, source, grade)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, pack_id) DO UPDATE SET
       source = CASE WHEN user_packs.source = '' THEN excluded.source ELSE user_packs.source END,
       grade = CASE WHEN excluded.grade = '' THEN user_packs.grade ELSE excluded.grade END`
  ).bind(user.id, pack, now, source, grade).run();

  const { data, cookie } = await issueUserSession(env, user, session.s);
  return json({ ...data, claimed: pack }, 200, { 'set-cookie': cookie });
}
