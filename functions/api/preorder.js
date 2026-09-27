// POST /api/preorder {contact, name, grade, comment, source, website} — заявка «Хочу повну версію».
// website — пастка для ботів: людина це поле не бачить. Повторна заявка з тим самим контактом оновлює стару.
import { json } from '../../lib/auth.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TG = /^@?[a-z0-9_]{5,32}$/i;
const PHONE = /^\+?[\d\s()-]{9,20}$/;
const GRADES = ['1-2', '3-4', 'інше'];

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  if (b.website) return json({ ok: true });

  let contact = String(b.contact || '').trim().slice(0, 120);
  if (EMAIL.test(contact)) contact = contact.toLowerCase();
  else if (TG.test(contact)) contact = '@' + contact.replace(/^@/, '').toLowerCase();
  else if (PHONE.test(contact) && contact.replace(/\D/g, '').length >= 9) contact = contact.replace(/[^\d+]/g, '');
  else return json({ error: 'contact' }, 400);

  const name = String(b.name || '').trim().slice(0, 80);
  const grade = GRADES.includes(b.grade) ? b.grade : '';
  const comment = String(b.comment || '').trim().slice(0, 500);
  const source = String(b.source || '').trim().slice(0, 60);
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO preorders (contact, name, grade, comment, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(contact) DO UPDATE SET
       name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE name END,
       grade = CASE WHEN excluded.grade <> '' THEN excluded.grade ELSE grade END,
       comment = CASE WHEN excluded.comment <> '' THEN excluded.comment ELSE comment END,
       updated_at = excluded.updated_at`)
    .bind(contact, name, grade, comment, source, now, now).run();
  return json({ ok: true });
}
