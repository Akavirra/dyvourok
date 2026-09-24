/* Робота без інтернету: після першого відкриття все потрібне лежить у кеші. Нову версію — через зміну VERSION. */
const VERSION = 'dyvourok-v3';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/star.js', 'js/sfx.js',
  'fonts/Nunito.ttf', 'fonts/NotoSansGlagolitic.ttf',
  'brand/dyvourok-logo.svg', 'brand/dyvourok-mark.svg',
  'icons/favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'packs/mova/pack.js', 'packs/mova/img/shevchenko-head.png', 'packs/mova/img/shevchenko-poster.jpg',
  'packs/mova/media/shevchenko.mp4'
];
// Захищені файли (PDF, відео з доступом) не входять у CORE: вони кешуються, коли вчитель з кодом їх відкриває.

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Спершу мережа (щоб оновлення доходили одразу), без інтернету — кеш.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const ranged = e.request.headers.has('range');
  e.respondWith(fetch(e.request).then(res => {
    if (res.status === 200 && !ranged) {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});
