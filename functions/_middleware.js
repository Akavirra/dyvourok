// Охорона адрес для всього сайту (див. public/_routes.json: функції працюють для всього, крім явно статичних тек).
// Статичний сервер Pages «вирівнює» адресу: //packs/… або /packs%2F… він віддав би як /packs/… — повз перевірку доступу
// в functions/packs. Тому будь-яку адресу з подвійною, закодованою чи зворотною скісною рискою (або «..») не обслуговуємо.
const BAD_PATH = /\/\/|%2f|%5c|\\|(^|\/)\.\.?(\/|$)|%2e%2e/i;

export async function onRequest({ request, next }) {
  const raw = new URL(request.url).pathname;
  if (BAD_PATH.test(raw)) {
    return new Response('Сторінку не знайдено', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }
    });
  }
  return next();
}
