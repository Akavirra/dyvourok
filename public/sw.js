/* Робота без інтернету: після першого відкриття все потрібне лежить у кеші. Нову версію — через зміну VERSION. */
const VERSION = 'dyvourok-v20';
// Мультфільми, PDF і картинки набору, які вчитель зберіг кнопкою «Робота без інтернету» (див. saveOffline в app.js).
// Окремий кеш: не стирається з новою VERSION, адреси мають ?v=, тож застарілих файлів не віддасть.
const MEDIA = 'dyvourok-media';
// Застосунок живе в /app/, сайт-вітрина — на головній (її не кешуємо наперед).
const CORE = [
  'app/', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/star.js', 'js/sfx.js',
  'fonts/Nunito.ttf', 'fonts/NotoSansGlagolitic.ttf',
  'brand/dyvourok-logo.svg', 'brand/dyvourok-mark.svg',
  'icons/favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'packs/mova/pack.js', 'packs/mova/img/cover-card.jpg', 'packs/mova/img/shevchenko-head.png', 'packs/mova/img/shevchenko-poster.jpg'
];
// Захищені файли (PDF, відео з доступом) не входять у CORE: вони потрапляють у MEDIA, коли вчитель з кодом зберігає набір.
const HEAVY = /\/packs\/[a-z0-9-]+\/(media|docs)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== MEDIA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Відео браузер просить шматками (Range: bytes=…) — відрізаємо потрібний шматок від цілого файлу з кешу.
async function fromMedia(req) {
  const hit = await caches.match(req.url, { cacheName: MEDIA });
  if (!hit) return null;
  const range = req.headers.get('range');
  if (!range) return hit;
  const blob = await hit.blob();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const size = blob.size;
  let start = m && m[1] ? +m[1] : 0, end = m && m[2] ? +m[2] : size - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, size - +m[2]); end = size - 1; }   // bytes=-N — останні N байт
  if (start >= size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
  end = Math.min(end, size - 1);
  return new Response(blob.slice(start, end + 1, blob.type), { status: 206, headers: {
    'content-type': blob.type, 'content-length': String(end - start + 1),
    'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes' } });
}

// Спершу мережа (щоб оновлення доходили одразу), без інтернету — кеш. Збережені файли набору — одразу з кешу.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  if (new URL(e.request.url).pathname.startsWith('/api/')) return;   // вхід і дані акаунта — завжди з мережі, не в кеш
  const ranged = e.request.headers.has('range');
  const heavy = HEAVY.test(new URL(e.request.url).pathname);
  e.respondWith((async () => {
    const saved = await fromMedia(e.request).catch(() => null);
    if (saved) return saved;
    try {
      const res = await fetch(e.request);
      // важкі файли не дублюємо в загальний кеш — для них є MEDIA
      if (res.status === 200 && !ranged && !heavy) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    } catch (err) {
      return (await caches.match(e.request, { ignoreSearch: true })) || caches.match('app/');
    }
  })());
});
