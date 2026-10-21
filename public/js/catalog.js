/* Каталог /materialy: фільтри, календарик «Безкоштовної п’ятниці», галерея сторінок, «поділитися», завантаження з міткою джерела. */
(function () {
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    return n + ' ' + (m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many);
  };

  // ---- фільтри: ?typ=free&klas=1-4&tema=math (адресу можна надіслати колезі)
  const grid = document.querySelector('[data-grid]');
  if (grid) {
    const cards = $$('.m-card', grid);
    const q = new URLSearchParams(location.search);
    const state = { kind: q.get('typ') || 'all', grade: q.get('klas') || 'all', subject: q.get('tema') || 'all' };
    const PARAM = { kind: 'typ', grade: 'klas', subject: 'tema' };
    const match = (c) =>
      (state.kind === 'all' || (state.kind === 'free' ? /^(free|account)$/.test(c.dataset.kind) : c.dataset.kind === state.kind)) &&
      (state.grade === 'all' || c.dataset.grades.split(' ').includes(state.grade)) &&
      (state.subject === 'all' || c.dataset.subject === state.subject);
    const apply = (push) => {
      let n = 0;
      cards.forEach(c => { const ok = match(c); c.hidden = !ok; if (ok) n++; });
      $$('.chip').forEach(ch => ch.setAttribute('aria-pressed', String(state[ch.dataset.f] === ch.dataset.v)));
      document.querySelector('[data-count]').textContent = plural(n, 'матеріал', 'матеріали', 'матеріалів');
      document.querySelector('[data-empty]').hidden = n > 0;
      if (push) {
        const p = new URLSearchParams();
        Object.keys(state).forEach(k => { if (state[k] !== 'all') p.set(PARAM[k], state[k]); });
        history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash);
      }
    };
    $$('.chip').forEach(ch => ch.addEventListener('click', () => { state[ch.dataset.f] = ch.dataset.v; apply(true); }));
    const reset = document.querySelector('[data-reset]');
    reset && reset.addEventListener('click', () => { state.kind = state.grade = state.subject = 'all'; apply(true); });
    apply(false);
  }

  // ---- наступна «Безкоштовна п’ятниця» (публікуємо о 10:00 за Києвом)
  const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  const now = new Date();
  const kyiv = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
  const next = new Date(kyiv);
  let add = (5 - kyiv.getDay() + 7) % 7;
  if (add === 0 && kyiv.getHours() >= 10) add = 7;
  next.setDate(kyiv.getDate() + add);
  // матеріал наступної п’ятниці вже викладено заздалегідь — тоді чекаємо ще на тиждень
  const latest = document.body.dataset.latestFriday;
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  if (latest && ymd(next) <= latest) {
    while (ymd(next) <= latest) { next.setDate(next.getDate() + 7); add += 7; }
  }
  const left = add === 0 ? 'сьогодні о 10:00' : add === 1 ? 'завтра' : 'через ' + plural(add, 'день', 'дні', 'днів');
  $$('[data-next-day]').forEach(el => { el.textContent = next.getDate(); });
  $$('[data-next-month]').forEach(el => { el.textContent = MONTHS[next.getMonth()] + ', п’ятниця'; });
  $$('[data-next-left]').forEach(el => { el.textContent = left; });

  // ---- галерея сторінок + збільшення
  const thumbsBox = document.querySelector('[data-shots]');
  if (thumbsBox) {
    const shots = JSON.parse(thumbsBox.dataset.shots);
    const main = document.querySelector('[data-main]');
    const dlg = document.querySelector('[data-dialog]');
    const zimg = document.querySelector('[data-zoom-img]');
    let cur = 0;
    const show = (i) => {
      cur = (i + shots.length) % shots.length;
      main.src = shots[cur].src; main.alt = shots[cur].alt;
      zimg.src = shots[cur].src; zimg.alt = shots[cur].alt;
      $$('.thumb').forEach((t, k) => t.setAttribute('aria-current', String(k === cur)));
    };
    $$('.thumb').forEach(t => t.addEventListener('click', () => show(+t.dataset.i)));
    document.querySelector('[data-zoom]').addEventListener('click', () => { show(cur); dlg.showModal(); });
    dlg.querySelector('[data-prev]').addEventListener('click', () => show(cur - 1));
    dlg.querySelector('[data-next]').addEventListener('click', () => show(cur + 1));
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowLeft') show(cur - 1);
      if (ev.key === 'ArrowRight') show(cur + 1);
    });
  }

  // ---- поділитися: копіювання посилання, на телефоні — системне меню
  const share = document.querySelector('[data-share]');
  if (share) {
    const btn = share.querySelector('[data-copy]');
    btn.addEventListener('click', async () => {
      const { url, text } = share.dataset;
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        try { await navigator.share({ title: text, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
      }
      try { await navigator.clipboard.writeText(url); } catch (e) { prompt('Скопіюйте посилання:', url); return; }
      btn.classList.add('ok');
      setTimeout(() => btn.classList.remove('ok'), 2000);
    });
  }

  // ---- завантаження: /api/dl/<slug> рахує й віддає PDF; додаємо, звідки людина прийшла
  let from = '';
  try { from = JSON.parse(localStorage.getItem('dyvo_from') || '""'); } catch (e) {}
  $$('[data-dl]').forEach(a => {
    if (from) a.href += '?from=' + encodeURIComponent(from);
    a.addEventListener('click', () => {
      setTimeout(() => {
        a.classList.add('done');
        const note = a.parentElement.querySelector('.dl-note');
        if (note) note.lastChild.textContent = ' Дякуємо! Якщо аркуш стане в пригоді — поділіться ним з колегою 💛';
      }, 400);
    });
  });
})();
