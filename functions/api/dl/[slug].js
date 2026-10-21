// GET /api/dl/<slug>?from=fb — рахує завантаження безкоштовного PDF з каталогу і перенаправляє на файл /files/free/<slug>.pdf.
// Ботів і попередні перегляди посилань не рахуємо; якщо лічильник недоступний, файл однаково віддаємо.
const SLUG = /^[a-z0-9-]{2,60}$/;
const BOT = /bot|crawl|spider|preview|headless|lighthouse|facebookexternalhit|telegram|viber|whatsapp/i;

export async function onRequestGet({ request, env, params }) {
  const slug = String(params.slug || '');
  if (!SLUG.test(slug)) return new Response('Not found', { status: 404 });
  const file = new URL(`/files/free/${slug}.pdf`, request.url);
  const head = await env.ASSETS.fetch(new Request(file, { method: 'HEAD' }));
  // без 404.html Pages віддає головну сторінку замість відсутнього файлу — тому перевіряємо, що це справді PDF
  if (!head.ok || !(head.headers.get('content-type') || '').includes('pdf')) return new Response('Not found', { status: 404 });

  const ua = request.headers.get('user-agent') || '';
  if (!BOT.test(ua)) {
    const q = new URL(request.url).searchParams;
    const ref = request.headers.get('referer') || '';
    let source = q.get('from') || q.get('utm_source') || '';
    if (!source && ref) { try { const h = new URL(ref).host; if (h !== new URL(request.url).host) source = h; } catch {} }
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' }).format(new Date());
    try {
      await env.DB.prepare(
        `INSERT INTO downloads (slug, day, source, n) VALUES (?, ?, ?, 1)
         ON CONFLICT(slug, day, source) DO UPDATE SET n = n + 1`)
        .bind(slug, day, source.trim().slice(0, 60)).run();
    } catch (e) {}
  }
  return Response.redirect(file.toString(), 302);
}
