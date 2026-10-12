// GET /api/auth/config — які способи входу налаштовано (застосунок ховає кнопки, яких немає)
import { json } from '../../../lib/auth.js';

export function onRequestGet({ request, env }) {
  const local = /^(localhost|127\.0\.0\.1)$/.test(new URL(request.url).hostname);
  return json({ google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), email: !!env.RESEND_API_KEY || local });
}
