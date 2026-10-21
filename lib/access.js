// Чи доступ із сесії досі дійсний — для видачі файлів наборів (functions/packs, functions/khlib).
// Кукі підписана на 30 днів, тож без цієї перевірки заблокований код або закрита сесія працювали б до кінця терміну.
// Відповідь кешуємо в пам'яті воркера на хвилину: відео браузер просить десятками шматків (Range).
import { packAllowed } from './auth.js';

const cache = new Map();
const TTL = 60e3;

export async function liveAccess(env, session, packId) {
  if (!packAllowed(session, packId)) return false;
  const key = `${session.u ? 'u:' + session.s : 'c:' + session.c + ':' + session.d}|${packId}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.ok;
  const ok = session.u ? await accountHas(env, session, packId) : await codeHas(env, session);
  if (cache.size > 2000) cache.clear();
  cache.set(key, { ok, until: Date.now() + TTL });
  return ok;
}

async function codeHas(env, s) {
  const row = await env.DB.prepare(
    `SELECT c.revoked, c.expires_at, EXISTS(SELECT 1 FROM devices d WHERE d.code = c.code AND d.device_id = ?2) AS dev
     FROM codes c WHERE c.code = ?1`).bind(s.c, s.d).first();
  return !!row && !row.revoked && !!row.dev && !(row.expires_at && row.expires_at < Date.now());
}

async function accountHas(env, s, packId) {
  const row = await env.DB.prepare(
    `SELECT EXISTS(SELECT 1 FROM user_sessions WHERE id = ?1 AND user_id = ?2) AS live,
       EXISTS(SELECT 1 FROM codes WHERE user_id = ?2 AND revoked = 0 AND (expires_at IS NULL OR expires_at > ?4)
              AND (packs = '*' OR ',' || packs || ',' LIKE '%,' || ?3 || ',%')) AS paid,
       EXISTS(SELECT 1 FROM user_packs WHERE user_id = ?2 AND pack_id = ?3) AS free`
  ).bind(s.s, s.u, packId, Date.now()).first();
  return !!row && !!row.live && (!!row.paid || !!row.free);
}
