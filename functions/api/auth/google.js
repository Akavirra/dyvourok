// GET /api/auth/google — перенаправити на вхід через Google (OAuth 2.0, authorization code).
// Потрібні GOOGLE_CLIENT_ID і GOOGLE_CLIENT_SECRET; адреса повернення — <сайт>/api/auth/google/callback.
import { randomId } from '../../../lib/account.js';

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  if (!env.GOOGLE_CLIENT_ID) return Response.redirect(origin + '/app/#/login-error/google-off', 302);
  const state = randomId(16);
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: origin + '/api/auth/google/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account'
  });
  // ?for=admin — вхід в адмінку: той самий Google і та сама адреса повернення, але callback видасть сесію адмінки, а не вчителя
  const forAdmin = new URL(request.url).searchParams.get('for') === 'admin';
  const headers = new Headers({ location: 'https://accounts.google.com/o/oauth2/v2/auth?' + q, 'cache-control': 'no-store' });
  headers.append('set-cookie', `dyvo_oauth=${state}${forAdmin ? '.adm' : ''}; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  return new Response(null, { status: 302, headers });
}
