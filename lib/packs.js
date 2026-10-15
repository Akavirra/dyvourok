// Безкоштовні набори, які можна додати до акаунта без коду чи оплати.
// Серверний allowlist не дає клієнту самостійно видати собі доступ до платного набору.
export const CLAIMABLE_PACKS = new Set(['khlib']);

export function cleanSource(value) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60);
}

export function cleanGrade(value) {
  const grade = String(value || '');
  return ['1-4', '5-7', '8-11'].includes(grade) ? grade : '';
}

export async function recordPackOpen(env, userId, packId) {
  if (!userId) return;
  const now = Date.now();
  await env.DB.prepare(
    'UPDATE user_packs SET last_opened_at = ?, open_count = open_count + 1 WHERE user_id = ? AND pack_id = ?'
  ).bind(now, userId, packId).run();
}

export async function recordPackDownload(env, userId, packId) {
  if (!userId) return;
  const now = Date.now();
  await env.DB.prepare(
    'UPDATE user_packs SET last_download_at = ?, download_count = download_count + 1 WHERE user_id = ? AND pack_id = ?'
  ).bind(now, userId, packId).run();
}
