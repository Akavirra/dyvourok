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

  // передзамовлення: заявка йде в /api/preorder, джерело береться з ?from= або utm_source
  const form = document.getElementById('preorder');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('preorder-msg');
    const btn = form.querySelector('button[type=submit]');
    const contact = form.contact.value.trim();
    const fail = text => { msg.textContent = text; msg.classList.add('err'); };
    form.contact.removeAttribute('aria-invalid');
    if (!contact) { form.contact.setAttribute('aria-invalid', 'true'); form.contact.focus(); return fail('Вкажіть e-mail, Telegram або телефон, щоб ми могли вам написати.'); }
    const q = new URLSearchParams(location.search);
    const data = {
      contact, name: form.name.value, comment: form.comment.value, website: form.website.value,
      grade: (form.querySelector('input[name=grade]:checked') || {}).value || '',
      source: q.get('from') || q.get('utm_source') || (document.referrer && new URL(document.referrer).host !== location.host ? new URL(document.referrer).host : '')
    };
    btn.disabled = true;
    try {
      const r = await fetch('/api/preorder', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      if (r.status === 400) { form.contact.setAttribute('aria-invalid', 'true'); form.contact.focus(); return fail('Схоже, в контакті помилка. Перевірте e-mail, @нікнейм у Telegram або номер телефону.'); }
      if (!r.ok) throw new Error(r.status);
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
