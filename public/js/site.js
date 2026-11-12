/* Сайт-вітрина: меню, мультфільм на «дошці», поява блоків, зірка в фінальному заклику. */
(function () {
  document.documentElement.classList.add('js');

  const header = document.querySelector('.header');
  const burger = document.querySelector('.burger');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  burger && burger.addEventListener('click', () => {
    const open = header.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('.nav a, .header .actions a').forEach(a => a.addEventListener('click', () => {
    header.classList.remove('open');
    burger && burger.setAttribute('aria-expanded', 'false');
  }));

  // ціна: 250 ₴ для перших покупців до 19.10.2026 включно, з 20.10 о 00:00 за Києвом — 300 ₴ (те саме в admin.js і seo_jsonld.py)
  if (Date.now() >= Date.parse('2026-10-20T00:00:00+03:00')) {
    document.querySelectorAll('[data-price]').forEach(el => { el.textContent = '300 ₴'; });
    document.querySelectorAll('[data-early]').forEach(el => { el.hidden = true; });
  }

  // мітка «Нове» на картках матеріалів — тиждень від дати виходу (до кінця дня data-new-until за Києвом)
  document.querySelectorAll('.new-flag[data-new-until]').forEach(f => { f.hidden = Date.now() >= Date.parse(f.dataset.newUntil + 'T00:00:00+02:00'); });

  // блоки плавно з'являються; без JS або з reduced-motion усе видно одразу
  const reveal = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    reveal.forEach(el => io.observe(el));
  } else reveal.forEach(el => el.classList.add('in'));

  // зірка «вишивається», коли фінальний заклик з'являється на екрані
  const bloom = document.getElementById('bloom');
  if (bloom && window.DyvoStar) {
    DyvoStar.drawBloom(bloom.getContext('2d'), bloom.width, 5);
    if ('IntersectionObserver' in window) {
      const io2 = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) { DyvoStar.playBloom(bloom); io2.disconnect(); }
      }, { threshold: .6 });
      io2.observe(bloom);
    }
  }

  // звідки прийшли (?from= / utm_source / чужий реферер) — перше джерело запам'ятовуємо для статистики демо (app.js, dyvo_from)
  const q0 = new URLSearchParams(location.search);
  const ref = document.referrer && new URL(document.referrer).host !== location.host ? new URL(document.referrer).host : '';
  const from = q0.get('from') || q0.get('utm_source') || ref;
  try { if (from && !localStorage.getItem('dyvo_from')) localStorage.setItem('dyvo_from', JSON.stringify(from.slice(0, 60))); } catch (e) {}

  // передзамовлення: заявка йде в /api/preorder, джерело береться з ?from= або utm_source
  const form = document.getElementById('preorder');
  // вибір набору у формі: заголовок і перелік у картці ціни; «Купити набір» на картці набору обирає його
  const PACK_TITLES = { mova: 'Машина часу рідної мови', tarilka: 'Що на моїй тарілці?', perenosne: 'Робот Буквалик і чарівні окуляри' };
  const PACK_PRICE = { perenosne: '250\u00a0₴' };   // інші набори — 300 ₴
  const pickPack = id => {
    if (!form || !PACK_TITLES[id]) return;
    const r = form.querySelector(`input[name=pack][value="${id}"]`);
    if (r) r.checked = true;
    const t = document.getElementById('price-title');
    if (t) t.textContent = PACK_TITLES[id];
    const sum = document.getElementById('price-sum');
    if (sum) sum.textContent = PACK_PRICE[id] || '300\u00a0₴';
    document.querySelectorAll('.checks[data-for]').forEach(ul => { ul.hidden = ul.dataset.for !== id; });
  };
  if (form) form.addEventListener('change', e => { if (e.target.name === 'pack') pickPack(e.target.value); });
  document.querySelectorAll('[data-pack]').forEach(a => a.addEventListener('click', () => pickPack(a.dataset.pack)));
  // з каталогу /materialy: /?pack=<id>#cina — одразу вибрати цей набір у формі
  { const qp = new URLSearchParams(location.search).get('pack'); if (qp) pickPack(qp); }
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('preorder-msg');
    const btn = form.querySelector('button[type=submit]');
    const contact = form.contact.value.trim();
    const fail = text => { msg.textContent = text; msg.classList.add('err'); };
    form.contact.removeAttribute('aria-invalid');
    if (!contact) { form.contact.setAttribute('aria-invalid', 'true'); form.contact.focus(); return fail('Вкажіть e-mail, Telegram або телефон, щоб ми могли вам написати.'); }
    const q = new URLSearchParams(location.search);
    const pack = (form.querySelector('input[name=pack]:checked') || {}).value || 'mova';
    const packTitle = PACK_TITLES[pack] || pack;
    const data = {
      contact, name: form.name.value, comment: `[Набір: ${packTitle}] ${form.comment.value}`.trim(), website: form.website.value,
      grade: (form.querySelector('input[name=grade]:checked') || {}).value || '',
      source: q.get('from') || q.get('utm_source') || (document.referrer && new URL(document.referrer).host !== location.host ? new URL(document.referrer).host : '')
    };
    btn.disabled = true;
    try {
      const r = await fetch('/api/preorder', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      if (r.status === 429) return fail('Забагато заявок з цього пристрою. Спробуйте за годину або напишіть на info@dyvourok.com.ua.');
      if (r.status === 400) { form.contact.setAttribute('aria-invalid', 'true'); form.contact.focus(); return fail('Схоже, в контакті помилка. Перевірте e-mail, @нікнейм у Telegram або номер телефону.'); }
      if (!r.ok) throw new Error(r.status);
      // якщо цей пристрій проходив демо — позначити в статистиці, що після нього лишили заявку
      try {
        const v = JSON.parse(localStorage.getItem('dyvo_device') || 'null');
        if (v && !localStorage.getItem('dyvo_notrack')) fetch('/api/track', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ v, e: 'preorder', src: from }) }).catch(() => {});
      } catch (e) {}
      form.hidden = true;
      const done = document.getElementById('preorder-done');
      done.hidden = false;
      const h4 = done.querySelector('h4');
      h4.setAttribute('tabindex', '-1');
      h4.focus();
    } catch (err) {
      fail('Не вдалося надіслати. Спробуйте ще раз або напишіть на info@dyvourok.com.ua.');
    } finally { btn.disabled = false; }
  });

  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
