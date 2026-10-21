// Ліміт запитів на годину за ключем (IP + дія). Повертає true, якщо ще можна.
export async function underLimit(env, key, perHour) {
  const now = Date.now(), hourAgo = now - 3600e3;
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, n) VALUES (?1, ?2, 1)
     ON CONFLICT(key) DO UPDATE SET
       n = CASE WHEN window_start > ?3 THEN n + 1 ELSE 1 END,
       window_start = CASE WHEN window_start > ?3 THEN window_start ELSE ?2 END
     RETURNING n`).bind(key, now, hourAgo).first();
  return !row || row.n <= perHour;
}
