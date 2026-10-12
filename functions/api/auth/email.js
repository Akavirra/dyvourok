// POST /api/auth/email {email} — надіслати лист з 6-значним кодом і посиланням для входу.
// Посилання веде на /app/#/login/<токен>: токен у хеші адреси, сервер його не бачить, поки застосунок сам не надішле
// (поштові сканери, що відкривають посилання, не витратять вхід).
// Без RESEND_API_KEY на localhost код друкується в консоль wrangler і повертається у відповіді (devCode).
import { json, normalizeEmail, randomId, hash } from '../../../lib/account.js';

const TTL = 15 * 60e3;          // код дійсний 15 хв
const GAP = 60e3;               // повторний лист — не раніше ніж за хвилину
const PER_HOUR_EMAIL = 5, PER_HOUR_IP = 20;

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const email = normalizeEmail(b.email);
  if (!email) return json({ error: 'email' }, 400);
  const now = Date.now(), hourAgo = now - 3600e3;
  const local = /^(localhost|127\.0\.0\.1)$/.test(new URL(request.url).hostname);
  if (!env.RESEND_API_KEY && !local) return json({ error: 'mail-off' }, 503);

  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const ipRow = await env.DB.prepare('SELECT * FROM login_ips WHERE ip = ?').bind(ip).first();
  if (ipRow && ipRow.hour_start > hourAgo && ipRow.n >= PER_HOUR_IP) return json({ error: 'slow', wait: 3600 }, 429);

  const prev = await env.DB.prepare('SELECT * FROM login_codes WHERE email = ?').bind(email).first();
  if (prev && now - prev.sent_at < GAP) return json({ error: 'slow', wait: Math.ceil((GAP - (now - prev.sent_at)) / 1000) }, 429);
  const sameHour = prev && prev.hour_start > hourAgo;
  if (sameHour && prev.hour_sent >= PER_HOUR_EMAIL) return json({ error: 'slow', wait: Math.ceil((prev.hour_start + 3600e3 - now) / 1000) }, 429);

  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  const token = randomId(24);
  await env.DB.prepare(`INSERT INTO login_codes (email, code_hash, link_hash, expires_at, attempts, sent_at, hour_start, hour_sent)
    VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7)
    ON CONFLICT(email) DO UPDATE SET code_hash = ?2, link_hash = ?3, expires_at = ?4, attempts = 0, sent_at = ?5, hour_start = ?6, hour_sent = ?7`)
    .bind(email, await hash(code, env.SESSION_SECRET), await hash(token, env.SESSION_SECRET), now + TTL, now,
      sameHour ? prev.hour_start : now, sameHour ? prev.hour_sent + 1 : 1).run();
  await env.DB.prepare(`INSERT INTO login_ips (ip, hour_start, n) VALUES (?1, ?2, 1)
    ON CONFLICT(ip) DO UPDATE SET n = CASE WHEN hour_start > ?3 THEN n + 1 ELSE 1 END, hour_start = CASE WHEN hour_start > ?3 THEN hour_start ELSE ?2 END`)
    .bind(ip, now, hourAgo).run();

  const link = `${new URL(request.url).origin}/app/#/login/${token}`;
  if (!env.RESEND_API_KEY) {
    console.log(`[dev] вхід для ${email}: код ${code}, посилання ${link}`);
    return json({ ok: true, devCode: code });
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Дивоурок <vhid@dyvourok.com.ua>',
      to: [email],
      subject: `Код для входу в «Дивоурок»: ${code}`,
      text: `Ваш код для входу: ${code}\n\nАбо просто відкрийте посилання:\n${link}\n\nКод і посилання дійсні 15 хвилин. Якщо ви не входили в «Дивоурок», проігноруйте цей лист.`,
      html: mailHtml(code, link)
    })
  });
  if (!res.ok) {
    console.log('resend error', res.status, await res.text().catch(() => ''));
    return json({ error: 'mail-failed' }, 502);
  }
  return json({ ok: true });
}

function mailHtml(code, link) {
  return `<!doctype html><html><body style="margin:0;background:#FBF6EC;font-family:Arial,sans-serif;color:#2b2420">
<div style="max-width:480px;margin:0 auto;padding:32px 24px">
<div style="font-size:22px;font-weight:bold;color:#C8341F">Дивоурок</div>
<p style="font-size:16px;line-height:1.5">Ваш код для входу:</p>
<div style="font-size:36px;letter-spacing:8px;font-weight:bold;background:#fff;border-radius:12px;padding:16px;text-align:center">${code}</div>
<p style="font-size:16px;line-height:1.5">Або натисніть кнопку, щоб увійти на цьому пристрої:</p>
<p><a href="${link}" style="display:inline-block;background:#C8341F;color:#fff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px">Увійти в «Дивоурок»</a></p>
<p style="font-size:13px;color:#7a6e66;line-height:1.5">Код і посилання дійсні 15 хвилин. Якщо ви не входили в «Дивоурок», просто проігноруйте цей лист.</p>
</div></body></html>`;
}
