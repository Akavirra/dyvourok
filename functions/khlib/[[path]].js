// Інтерактив «Шлях зернини» доступний лише акаунту, який додав набір,
// або власнику платного коду з правом на khlib / усі набори.
import { readSession, packAllowed } from '../../lib/auth.js';
import { recordPackOpen } from '../../lib/packs.js';

export async function onRequest({ request, env, params }) {
  const session = await readSession(request, env);
  if (!packAllowed(session, 'khlib')) {
    const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
    if (acceptsHtml) return Response.redirect(new URL('/app/#/claim/khlib', request.url), 302);
    return new Response('Спочатку додайте безкоштовний набір до свого акаунта.', {
      status: 401,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
    });
  }

  const path = (params.path || []).join('/');
  if (session.u && (!path || path === 'index.html')) await recordPackOpen(env, session.u, 'khlib');
  const response = await env.ASSETS.fetch(request);
  const out = new Response(response.body, response);
  out.headers.set('cache-control', 'private, no-cache');
  return out;
}
