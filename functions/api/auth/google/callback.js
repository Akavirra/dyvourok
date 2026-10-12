// GET /api/auth/google/callback — Google повертає сюди code; обмінюємо на id_token, створюємо акаунт і сесію.
// id_token отримано напряму від Google по HTTPS, тож підпис окремо не перевіряємо (так дозволяє документація Google).
import { getCookie } from '../../../../lib/auth.js';
import { upsertUser, login, deviceLabel, normalizeEmail } from '../../../../lib/account.js';

const clearState = 'dyvo_oauth=; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const back = (hash, cookie) => {
    const headers = new Headers({ location: url.origin + '/app/#/' + hash, 'cache-control': 'no-store' });
    headers.append('set-cookie', clearState);
    if (cookie) headers.append('set-cookie', cookie);
    return new Response(null, { status: 302, headers });
  };
  const state = url.searchParams.get('state');
  if (url.searchParams.get('error')) return back('login-error/cancelled');
  if (!state || state !== getCookie(request, 'dyvo_oauth')) return back('login-error/state');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: url.searchParams.get('code') || '',
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: url.origin + '/api/auth/google/callback',
      grant_type: 'authorization_code'
    })
  });
  if (!res.ok) { console.log('google token error', res.status, await res.text().catch(() => '')); return back('login-error/google'); }
  const { id_token } = await res.json();
  let claims;
  try {
    const part = id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part), c => c.charCodeAt(0))));
  } catch { return back('login-error/google'); }
  const email = normalizeEmail(claims.email);
  if (claims.aud !== env.GOOGLE_CLIENT_ID || !/accounts\.google\.com$/.test(claims.iss) || !email || claims.email_verified === false) {
    return back('login-error/google');
  }
  const user = await upsertUser(env, { email, name: String(claims.name || '').slice(0, 120), googleSub: String(claims.sub) });
  const { cookie } = await login(env, request, user, deviceLabel(request));
  return back('login-ok', cookie);
}
