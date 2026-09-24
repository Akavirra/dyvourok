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

  // мультфільм запускається лише після натискання (зі звуком) — сторінка лишається легкою
  const play = document.getElementById('play');
  if (play) play.addEventListener('click', () => {
    const frame = document.getElementById('player');
    const v = document.createElement('video');
    v.src = 'packs/mova/media/shevchenko.mp4';
    v.poster = 'img/site/hero-stage.webp';
    v.controls = true;
    v.autoplay = true;
    v.playsInline = true;
    frame.replaceChildren(v);
    v.play().catch(() => {});
  });

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

  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
