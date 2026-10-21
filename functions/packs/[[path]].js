// Захист матеріалів наборів: відео й PDF віддаються лише з дійсною сесією.
// Відкрито без коду: опис набору (pack.js), картинки й демо-файли (див. PUBLIC).
// Ці ж шляхи виключені з функцій у public/_routes.json — Cloudflare віддає їх напряму, без виклику функції
// (ліміт безкоштовного тарифу — 100 тис. викликів на добу). Новий набір: додати його img/ і pack.js і туди.
import { readSession } from '../../lib/auth.js';
import { liveAccess } from '../../lib/access.js';
import { recordPackDownload } from '../../lib/packs.js';

const PUBLIC = [
  /^[a-z0-9-]+\/pack\.js$/,
  /^[a-z0-9-]+\/img\//,
  /^mova\/media\/shevchenko-full\.mp4$/,    // демо-зупинка
];
export async function onRequest({ request, env, params }) {
  const path = (params.path || []).join('/');
  if (PUBLIC.some(re => re.test(path))) return env.ASSETS.fetch(request);
  const packId = path.split('/')[0];
  const session = await readSession(request, env);
  if (!session || !(await liveAccess(env, session, packId))) {
    const message = packId === 'khlib'
      ? 'Увійдіть у акаунт і додайте безкоштовний набір «Шлях зернини».'
      : 'Доступ до матеріалу відкривається після активації коду.';
    return new Response(message, { status: 401, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  }
  if (session.u && request.method === 'GET' && !request.headers.has('range') && /^[a-z0-9-]+\/docs\//.test(path)) {
    await recordPackDownload(env, session.u, packId);
  }
  // Великі файли з R2: презентації (pptx/) і мультфільми у високій якості (hq/)
  if (/^[a-z0-9-]+\/(pptx|hq)\//.test(path)) return fromBucket(request, env, path);
  const res = await env.ASSETS.fetch(request);
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'private, no-cache');   // браузер щоразу перевіряє ETag: оновлення видно одразу, без повторного завантаження
  return out;
}

// Великі файли з R2 (презентації ~100 МБ не влазять у ліміт Pages 25 МБ на файл)
async function fromBucket(request, env, key) {
  const range = request.headers.get('range');
  const obj = await env.FILES.get(key, range ? { range: request.headers } : {});
  if (!obj) return new Response('Файл не знайдено', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'private, no-cache');
  const name = new URL(request.url).searchParams.get('name');
  if (name) headers.set('content-disposition', `attachment; filename="${key.split('/').pop()}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  if (range && obj.range) {
    const { offset = 0, length = obj.size - offset } = obj.range;
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set('content-length', String(length));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set('content-length', String(obj.size));
  return new Response(obj.body, { headers });
}
