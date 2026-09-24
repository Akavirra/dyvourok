// Захист матеріалів наборів: відео й PDF віддаються лише з дійсною сесією.
// Відкрито без коду: опис набору (pack.js), картинки й демо-файли (див. PUBLIC).
import { readSession, packAllowed } from '../../lib/auth.js';

const PUBLIC = [
  /^[a-z0-9-]+\/pack\.js$/,
  /^[a-z0-9-]+\/img\//,
  /^mova\/media\/shevchenko\.mp4$/          // демо-зупинка
];

export async function onRequest({ request, env, params }) {
  const path = (params.path || []).join('/');
  if (PUBLIC.some(re => re.test(path))) return env.ASSETS.fetch(request);
  const session = await readSession(request, env);
  if (!packAllowed(session, path.split('/')[0])) {
    return new Response('Доступ до матеріалу відкривається після активації коду.', { status: 401, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  }
  const res = await env.ASSETS.fetch(request);
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'private, max-age=86400');
  return out;
}
