/* «Що на моїй тарілці?» — урок на дошці. Сцена 1920×1080, масштабується під екран.
   Керування: велика кнопка «Далі», ← → / пробіл, F — на весь екран, O — огляд екранів.
   Факти — з den-movy/kharchuvannia/DZHERELA.md (F.. у коментарях). Скрипт окремим файлом: CSP сайту (script-src 'self'). */
(() => {
  'use strict';
  const D = window.TARILKA_DATA || { subs: {}, qr: {} };
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else e.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
    return e;
  };
  const ICON = {
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg>',
    tip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'
  };
  const food = n => `img/food/${n}.webp`;
  const ch = n => `img/char/${n}.webp`;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ------------------------------------------------------------ тарілка (SVG): ½ ліворуч, ¼ праворуч угорі, ¼ праворуч унизу — F01
  function plateSVG(labels = true) {
    const lab = labels ? `
      <text x="31" y="49" font-size="6.4" fill="#4E7F39">Овочі</text><text x="31" y="57" font-size="6.4" fill="#4E7F39">і фрукти</text>
      <text x="31" y="68" font-size="10" fill="#4E7F39">½</text>
      <text x="68" y="33" font-size="5.6" fill="#A8740A">Каші й</text><text x="68" y="39.5" font-size="4.6" fill="#A8740A">цільнозернове</text>
      <text x="68" y="49" font-size="9" fill="#A8740A">¼</text>
      <text x="68" y="67" font-size="6.2" fill="#A8291A">Білок</text><text x="68" y="77" font-size="9" fill="#A8291A">¼</text>` : '';
    return `<svg viewBox="0 0 100 100" class="plate-svg">
      <defs><radialGradient id="pr" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F1E6D4"/></radialGradient></defs>
      <circle cx="50" cy="50" r="49" fill="url(#pr)" stroke="#E0CFB4" stroke-width=".8"/>
      <circle cx="50" cy="50" r="41.5" fill="none" stroke="#E6D8C2" stroke-width=".7"/>
      <path class="seg s-veg" d="M50 11 A39 39 0 0 0 50 89 Z" fill="#DDEDCF" stroke="#5E9447" stroke-width="1"/>
      <path class="seg s-grain" d="M50 11 A39 39 0 0 1 89 50 L50 50 Z" fill="#FBEAC0" stroke="#D99A12" stroke-width="1"/>
      <path class="seg s-prot" d="M89 50 A39 39 0 0 1 50 89 L50 50 Z" fill="#F8D7CD" stroke="#C8341F" stroke-width="1"/>${lab}</svg>`;
  }

  // ------------------------------------------------------------ плеєр — той самий, що в застосунку (public/js/app.js → player()):
  // власні кнопки, субтитри Вимкнути / Малі / Середні / Великі, гучність; налаштування спільні з застосунком (dyvo_subs, dyvo_vol)
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const VP_ICONS = {
    sound: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>',
    playbar: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
    cc: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17 10.2a2.4 2.4 0 1 0 0 3.6"/>'
  };
  const vicon = name => h('span', { class: 'svg-ico', 'aria-hidden': 'true', html:
    `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${VP_ICONS[name]}</svg>` });
  const SUB_SIZES = [['s', 'Малі'], ['m', 'Середні'], ['l', 'Великі']];
  const fmtTime = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function vplayer(src, poster, cues) {
    const pref = store.get('dyvo_subs', { on: true, size: 'm' });
    const video = h('video', { src, poster, playsinline: '', preload: 'metadata',
      controlslist: 'nodownload noplaybackrate noremoteplayback', disablepictureinpicture: '', disableremoteplayback: '' });
    const sub = h('div', { class: 'vp-sub', 'aria-live': 'off' });
    const bigPlay = h('button', { class: 'vp-big', 'aria-label': 'Відтворити' }, vicon('playbar'));
    const playBtn = h('button', { class: 'vp-btn', 'aria-label': 'Відтворити або пауза' }, vicon('playbar'));
    const seek = h('input', { class: 'vp-seek', type: 'range', min: 0, max: 1000, value: 0, step: 1, 'aria-label': 'Перемотування' });
    const time = h('span', { class: 'vp-time' }, '0:00 / 0:00');
    const vol = { v: Math.max(0.2, +store.get('dyvo_vol', 1) || 1), m: false };
    const volBtn = h('button', { class: 'vp-btn vp-vol-btn', 'aria-label': 'Вимкнути або ввімкнути звук мультфільму' });
    const volRange = h('input', { class: 'vp-vol', type: 'range', min: 0, max: 100, step: 1, 'aria-label': 'Гучність мультфільму' });
    const ccBtn = h('button', { class: 'vp-btn vp-cc', 'aria-label': 'Субтитри', 'aria-haspopup': 'true' }, vicon('cc'), h('span', { class: 'vp-cc-label' }, 'Субтитри'));
    const menu = h('div', { class: 'vp-menu', role: 'menu', hidden: '' });
    const fsBtn = h('button', { class: 'vp-btn', 'aria-label': 'На весь екран' }, vicon('full'));
    const bar = h('div', { class: 'vp-bar' }, playBtn, h('div', { class: 'vp-vol-wrap' }, volBtn, volRange), seek, time, h('div', { class: 'vp-cc-wrap' }, ccBtn, menu), fsBtn);
    const box = h('div', { class: 'vp', tabindex: 0 }, video, sub, bigPlay, bar);
    box.addEventListener('contextmenu', e => e.preventDefault());
    const applyPref = () => {
      box.dataset.subs = pref.on ? pref.size : 'off';
      ccBtn.classList.toggle('on', pref.on);
      ccBtn.setAttribute('aria-pressed', pref.on ? 'true' : 'false');
      menu.replaceChildren(
        h('button', { role: 'menuitemradio', 'aria-checked': String(!pref.on), class: !pref.on ? 'sel' : '', onclick: () => setPref({ on: false }) }, 'Вимкнути'),
        ...SUB_SIZES.map(([k, label]) => h('button', { role: 'menuitemradio', 'aria-checked': String(pref.on && pref.size === k), class: pref.on && pref.size === k ? 'sel' : '', onclick: () => setPref({ on: true, size: k }) }, label)));
      store.set('dyvo_subs', pref);
    };
    const applyVol = () => {
      video.volume = vol.v; video.muted = vol.m;
      const silent = vol.m || vol.v === 0;
      volBtn.replaceChildren(vicon(silent ? 'mute' : 'sound'));
      volBtn.classList.toggle('off', silent);
      volBtn.title = silent ? 'Звук вимкнено — натисніть, щоб увімкнути' : 'Вимкнути звук';
      volRange.value = silent ? 0 : Math.round(vol.v * 100);
      if (!vol.m && vol.v > 0) store.set('dyvo_vol', vol.v);
    };
    const setVol = p => { Object.assign(vol, p); applyVol(); };
    volBtn.onclick = () => setVol(vol.m || vol.v === 0 ? { m: false, v: vol.v || 1 } : { m: true });
    volRange.addEventListener('input', () => setVol({ v: volRange.value / 100, m: volRange.value == 0 }));
    const setPref = p => { Object.assign(pref, p); applyPref(); menu.hidden = true; showSub(); };
    ccBtn.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
    document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.hidden = true; });
    let shown = -1, seeking = false, idle;
    const showSub = () => {
      const t = video.currentTime;
      const i = pref.on ? cues.findIndex(c => t >= c[0] && t <= c[1]) : -1;
      if (i === shown) return;
      shown = i;
      sub.replaceChildren(...(i >= 0 ? [h('span', {}, cues[i][2])] : []));
    };
    const toggle = () => { if (video.paused) video.play().catch(() => {}); else video.pause(); };
    const syncBtn = () => { playBtn.replaceChildren(vicon(video.paused ? 'playbar' : 'pause')); box.classList.toggle('playing', !video.paused); };
    const syncTime = () => {
      const d = video.duration || 0;
      if (!seeking) seek.value = d ? Math.round(video.currentTime / d * 1000) : 0;
      time.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(d);
    };
    seek.addEventListener('input', () => { seeking = true; if (video.duration) video.currentTime = seek.value / 1000 * video.duration; });
    seek.addEventListener('change', () => { seeking = false; });
    const tick = () => { showSub(); syncTime(); if (!video.paused && box.isConnected) requestAnimationFrame(tick); };
    const poke = () => { box.classList.remove('idle'); clearTimeout(idle); if (!video.paused) idle = setTimeout(() => menu.hidden && box.classList.add('idle'), 2500); };
    video.addEventListener('play', () => { syncBtn(); requestAnimationFrame(tick); });
    video.addEventListener('pause', () => { syncBtn(); poke(); });
    video.addEventListener('ended', syncBtn);
    ['loadedmetadata', 'seeked', 'timeupdate'].forEach(ev => video.addEventListener(ev, () => { syncTime(); showSub(); }));
    video.onclick = toggle; bigPlay.onclick = toggle; playBtn.onclick = toggle;
    fsBtn.onclick = () => {
      if (document.fullscreenElement === box) document.exitFullscreen();
      else if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    };
    box.addEventListener('pointermove', poke);
    box.addEventListener('pointerdown', poke);
    // клавіші плеєра не мають гортати урок: зупиняємо їх тут
    box.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
      else if (k === 'arrowright') video.currentTime += 5;
      else if (k === 'arrowleft') video.currentTime -= 5;
      else if (k === 'c' || k === 'с') setPref({ on: !pref.on });
      else if (k === 'm' || k === 'ь') volBtn.onclick();
      else if (k === 'arrowup' || k === 'arrowdown') { e.preventDefault(); setVol({ v: Math.min(1, Math.max(0, Math.round((vol.v + (k === 'arrowup' ? 0.1 : -0.1)) * 10) / 10)), m: false }); }
      else if (k === 'f' || k === 'а') fsBtn.onclick();
      else return;
      e.stopPropagation(); poke();
    });
    applyPref(); applyVol();
    return { box, video };
  }

  // ------------------------------------------------------------ спільні шматки
  const header = (title, kick) => h('div', { class: 'hd' }, h('div', {}, kick ? h('div', { class: 'kick' }, kick) : null, h('h2', {}, title)));
  const say = (who, text, pos) => {
    const el = h('div', { class: 'say ' + (pos.side || 'right'), style: { left: pos.left, right: pos.right, bottom: pos.bottom || '130px', '--h': (pos.h || 380) + 'px' } },
      h('div', { class: 'bub' }, text || ''), h('img', { src: ch(who), alt: '' }));
    el.setText = t => { el.querySelector('.bub').textContent = t; };
    return el;
  };
  const confetti = root => {
    const box = h('div', { class: 'confetti' });
    const colors = ['#C8341F', '#F2B530', '#5E9447', '#3F86C2', '#E58AA0'];
    for (let i = 0; i < 90; i++) box.append(h('i', { style: { left: Math.random() * 100 + '%', background: colors[i % 5], animationDelay: Math.random() * .8 + 's', animationDuration: 2 + Math.random() * 1.6 + 's' } }));
    root.append(box); setTimeout(() => box.remove(), 4200);
  };

  // ------------------------------------------------------------ екрани
  const STAGES = [['start', 'Початок'], ['warm', 'Розминка'], ['new', 'Нове'], ['practice', 'Станції'], ['sum', 'Підсумок'], ['refl', 'Рефлексія']];
  const S = [];
  const add = (o) => S.push(o);

  // 1. Титул
  add({ stage: 'start', title: 'Титул', bg: 'img/bg/hero.webp', cls: 'hero',
    tip: 'Відкрийте на весь екран (кнопка вгорі праворуч або F). Далі — велика червона кнопка або стрілка →. Ця підказка видна класу — сховайте її лампочкою або клавішею T.',
    build(el, go) {
      el.append(h('div', { class: 'card pop' },
        h('span', { class: 'kick' }, 'ЗБД · 6 клас'),
        h('h1', {}, 'Що на моїй тарілці?'),
        h('p', {}, 'Здорове та збалансоване харчування'),
        h('button', { class: 'start', onclick: () => go(1) , html: 'Почати урок ' + ICON.next })));
    } });

  // відео
  const video = (n, title, tip) => add({ stage: n === 3 ? 'practice' : n === 2 ? 'new' : 'start', title: 'Мультик ' + n, bg: 'img/bg/' + (n === 1 ? 'kitchen' : n === 2 ? 'table' : 'shop') + '.webp', bgcls: 'dim', tip,
    build(el) {
      const p = vplayer(`../media/m${n}.mp4`, `../media/m${n}.jpg`, D.subs['m' + n] || []);
      p.video.addEventListener('ended', () => $('#next').classList.add('pulse'));
      el.append(h('div', { class: 'body' }, header(title, 'Мультик ' + n), h('div', { class: 'vid' }, h('div', { class: 'vbox' }, p.box))));
      return { leave() { p.video.pause(); } };
    } });

  video(1, 'Сніданок, що дає сили', 'Після мультика спитайте: «Чому Марко до третього уроку ледве тримав олівець?» Субтитри вмикаються кнопкою в куті.');

  // 3. Три сніданки — голосування
  add({ stage: 'start', title: 'Три сніданки', bg: 'img/bg/kitchen.webp', bgcls: 'dim', steps: 1,
    tip: 'Діти голосують рукою, ви натискаєте «+». Потім «Далі» — відповідь із поясненням.',
    build(el) {
      const opts = [
        ['А', 'breakfast_a', 'Солодка булка й газована вода', 'Солодке й газоване — їжа «час від часу», а не щоденний сніданок'],   // F12, F18
        ['Б', 'breakfast_b', 'Вівсянка з яблуком і чай без цукру', 'Каша дає енергію надовго, а яблуко — вітаміни'],                 // F10, F04
        ['В', 'breakfast_c', 'Нічого: «поїм на перерві»', 'Як Марко в мультику: до третього уроку сил уже немає']];                 // 🎭 m1
      const cards = opts.map(([l, img, t, why]) => {
        const n = h('b', {}, '0'); let c = 0;
        const set = d => { c = Math.max(0, c + d); n.textContent = c; };
        return h('div', { class: 'choice paper' }, h('span', { class: 'letter' }, l), h('img', { class: 'art', src: `img/art/${img}.webp`, alt: '' }), h('h3', {}, t),
          h('div', { class: 'cnt' }, h('button', { onclick: () => set(-1), 'aria-label': 'мінус голос' }, '−'), n, h('button', { onclick: () => set(1), 'aria-label': 'плюс голос' }, '+')),
          h('div', { class: 'why' }, ''));
      });
      el.append(h('div', { class: 'body' }, header('Після якого сніданку легше висидіти до 4‑го уроку?', 'Голосуємо'), h('div', { class: 'choices' }, cards)));
      return { step(s) { cards.forEach((c, i) => { c.classList.toggle('win', s >= 1 && i === 1); c.querySelector('.why').textContent = s >= 1 ? opts[i][3] : ''; }); } };
    } });

  // 4. Міф чи факт — 6 тверджень (F03, F07, F12, F13, F20)
  add({ stage: 'warm', title: 'Міф чи факт?', bg: 'img/bg/class.webp', bgcls: 'soft',
    tip: 'Діти піднімають картки ✓ / ✕. Ви натискаєте відповідь класу — і з\'являється пояснення. «Далі» — наступне твердження.',
    build(el) {
      const M = [
        ['Картопля — це овоч, тому може бути половиною тарілки', false, 'На тарілці здорового харчування картопля не рахується як овоч.'],
        ['Найкращий напій від спраги — вода', true, 'Солодка газована вода й енергетики — не для щоденного вибору.'],
        ['Сік — так само корисно, як фрукт, тому його можна пити скільки завгодно', false, 'У соках є вільний цукор, тож їх варто обмежувати.'],
        ['Що в складі продукту написано першим — того найбільше', true, 'Склад пишуть за спаданням маси.'],
        ['Цукор є лише в цукерках і тортах', false, 'Він ховається в соках, сиропах, меді, соусах.'],
        ['Пити воду треба тільки тоді, коли дуже хочеться', false, 'Краще пити протягом дня, особливо на перерві й після фізкультури.']];
      let i = 0, answered = false, right = 0;
      const num = h('div', { class: 'cnum' }), stmt = h('div', { class: 'stmt' }), ans = h('div', {});
      const yes = h('button', { class: 'yes', onclick: () => answer(true) }, '✓ Факт'), no = h('button', { class: 'no', onclick: () => answer(false) }, '✕ Міф');
      const track = h('div', { class: 'track' }, M.map(() => h('i')));
      const apple = say('yabluko', '', { side: 'right', right: '60px', bottom: '140px', h: 360 });
      const show = () => {
        answered = false; num.textContent = `Твердження ${i + 1} з ${M.length}`; stmt.textContent = M[i][0]; ans.className = ''; ans.textContent = '';
        yes.classList.remove('dim'); no.classList.remove('dim'); apple.setText('Як думаєте?');
        [...track.children].forEach((t, k) => t.classList.toggle('on', k <= i)); stmt.classList.remove('pop'); void stmt.offsetWidth; stmt.classList.add('pop');
      };
      const answer = v => {
        if (answered) return; answered = true;
        const ok = v === M[i][1]; if (ok) right++;
        (M[i][1] ? no : yes).classList.add('dim');
        ans.className = 'ans ' + (ok ? 'ok' : 'no');
        ans.innerHTML = `<b>${M[i][1] ? '✓ Факт.' : '✕ Міф.'}</b> ${M[i][2]}`;
        apple.setText(ok ? 'Так! Чудово!' : 'Ой, не зовсім!');
        $('#next').classList.add('pulse');
      };
      el.append(h('div', { class: 'body' }, header('Міф чи факт?', 'Розминка'),
        h('div', { class: 'mf' }, h('div', { class: 'card paper' }, num, stmt, h('div', { class: 'btns' }, yes, no), ans), h('div', { class: 'side' }))), apple);
      show();
      return {
        next() { if (!answered) { answer(M[i][1]); return true; } if (i < M.length - 1) { i++; show(); return true; } return false; },
        prev() { if (i > 0) { i--; show(); return true; } return false; },
        progress: () => [i, M.length]
      };
    } });

  // 5. Навіщо їжа: хто будує, заряджає, захищає (F01, F04, F09, F10, F11, F12, F15, F17)
  add({ stage: 'new', title: 'Хто що робить', bg: 'img/bg/table.webp', bgcls: 'dim', steps: 4,
    tip: 'Їжа дає енергію, а рух її витрачає — що більше рухаємося, то більше енергії потрібно. Натискайте на героїв або «Далі».',
    build(el) {
      const R = [['kvasolia', 'Будують', 'Білки', 'Риба, птиця, яйця, квасоля, сир — будують м\'язи', ['fish', 'eggs', 'beans', 'cottage'], 'var(--prot)', 'var(--prot-b)'],
        ['grechka', 'Заряджають', 'Вуглеводи', 'Каші, цільнозерновий хліб, овочі й фрукти — енергія надовго', ['buckwheat', 'oatmeal', 'bread', 'rice'], 'var(--grain)', 'var(--grain-b)'],
        ['yabluko', 'Захищають', 'Вітаміни й мінерали', 'Овочі й фрукти різних кольорів — що більше кольорів, то краще', ['carrot', 'broccoli', 'pepper', 'blueberry'], 'var(--veg)', 'var(--veg-b)']];
      const cards = R.map(([img, t, sub, txt, foods, c, b]) => {
        const card = h('div', { class: 'role', style: { '--c': c, '--c-b': b }, onclick: () => card.classList.toggle('open') },
          h('div', { class: 'in' },
            h('div', { class: 'f' }, h('img', { src: ch(img), alt: '' }), h('h3', {}, t), h('p', {}, 'Натисни, щоб дізнатися')),
            h('div', { class: 'b' }, h('img', { class: 'mini', src: ch(img), alt: '' }), h('h3', {}, t), h('h4', {}, sub), h('p', {}, txt), h('div', { class: 'foods' }, foods.map(f => h('img', { src: food(f), alt: '' }))))));
        return card;
      });
      const extra = h('div', { class: 'extra' }, h('span', {}, '🫒 Олія — трохи, трансжирів уникаємо'), h('span', {}, '🧹 Клітковина — «щіточка» для кишечника'), h('span', {}, '💧 Вода — найкращий напій'));
      el.append(h('div', { class: 'body' }, header('Навіщо нам їжа?', 'Хто що робить у тарілці'), h('div', { class: 'roles' }, cards), extra));
      return { step(s) { cards.forEach((c, i) => c.classList.toggle('open', s > i)); extra.style.opacity = s >= 4 ? 1 : 0; } };
    } });

  video(2, 'Подорож обіду', 'Після мультика: «Хто займає половину тарілки? Чому картоплю не пустили в половину овочів?»');

  // 7. Піраміда і тарілка (F01, F02, F27, F28)
  add({ stage: 'new', title: 'Піраміда і тарілка', bg: 'img/bg/class.webp', bgcls: 'dim', steps: 9,
    tip: 'Програма називає харчову піраміду, а МОЗ з 2017 року радить тарілку — її простіше застосувати до кожного прийому їжі. Піраміди в країнах різні.',
    build(el) {
      const T = [['Хліб, каші, картопля', 'bread', '#D99A12', 100], ['Овочі й фрукти', 'broccoli', '#5E9447', 90], ['Молоко, сир, йогурт', 'kefir', '#B5838D', 80],
        ['М\'ясо, риба, яйця, бобові', 'fish', '#C8341F', 72], ['Олії, жири, солодке', 'donut', '#9A6B4A', 62]];
      const tiers = T.map(([t, img, c, w]) => h('div', { class: 'tier', style: { width: w + '%', background: c } }, h('img', { src: food(img), alt: '' }), t));
      const pyr = h('div', { class: 'pyr' }, tiers.slice().reverse());
      const note = h('div', { class: 'note' }, 'Що ширший поверх — то більше цієї їжі. У різних країнах піраміди різні (тут — приклад Ірландії, EUFIC).');
      const left = h('div', { class: 'paper', style: { padding: '40px' } }, h('h3', { style: { fontSize: '40px', fontWeight: 1000, marginBottom: '20px' } }, 'Харчова піраміда'), pyr, note);
      const plate = h('div', { html: plateSVG(true) });
      const leg = h('div', { class: 'plegend' },
        h('div', { style: { '--c': 'var(--veg)' } }, h('b', {}, '½'), 'овочі й фрукти'),
        h('div', { style: { '--c': 'var(--grain)' } }, h('b', {}, '¼'), 'каші й цільнозернове'),
        h('div', { style: { '--c': 'var(--prot)' } }, h('b', {}, '¼'), 'білок'),
        h('div', { style: { '--c': 'var(--water)' } }, h('b', {}, '+'), 'вода поруч, олія трохи, рух щодня'));
      const right = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '18px', transition: 'opacity .4s' } },
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px', alignItems: 'center' } }, plate, leg),
        h('div', { class: 'src-line', style: { marginTop: 0 } }, 'Тарілка — за моделлю Гарвардської школи громадського здоров\'я; у 2017 році її запропонувало МОЗ України.'));
      const body = h('div', { class: 'body' }, header('Піраміда і тарілка', 'Дві моделі'), h('div', { class: 'pp' }, left, right));
      el.append(body);
      return { step(s) {
        tiers.forEach((t, i) => t.classList.toggle('on', s > i));
        note.style.opacity = s >= 5 ? 1 : 0;
        right.style.opacity = s >= 5 ? 1 : .15;
        const segs = ['.s-veg', '.s-grain', '.s-prot'];
        segs.forEach((q, i) => plate.querySelector(q).classList.toggle('off', s < 6 + i));
        [...leg.children].forEach((d, i) => d.classList.toggle('on', s >= 6 + i));
      } };
    } });

  // 8. Збери тарілку на дошці (F01, F03, F07, F12, F18)
  add({ stage: 'new', title: 'Збери тарілку', bg: 'img/bg/table.webp', bgcls: 'dim',
    tip: 'Діти по черзі виходять до дошки й перетягують продукт на тарілку. Тарілка одразу підказує, чи підходить місце.',
    build(el) {
      const G = { veg: ['carrot', 'cucumber', 'tomato', 'pepper', 'broccoli', 'apple', 'pear', 'grapes', 'cabbage', 'blueberry'], grain: ['buckwheat', 'oatmeal', 'bread', 'rice'],
        prot: ['fish', 'chicken', 'eggs', 'beans', 'lentils', 'cottage'], water: ['water'], rare: ['juice', 'soda', 'sausage', 'donut', 'crisps', 'bun'], potato: ['potato'] };
      const NAME = { carrot: 'Морква', cucumber: 'Огірок', tomato: 'Помідор', pepper: 'Перець', broccoli: 'Броколі', apple: 'Яблуко', pear: 'Груша', grapes: 'Виноград', cabbage: 'Капуста', blueberry: 'Чорниці',
        buckwheat: 'Гречка', oatmeal: 'Вівсянка', bread: 'Цільнозерновий хліб', rice: 'Бурий рис', fish: 'Риба', chicken: 'Курка', eggs: 'Яйця', beans: 'Квасоля', lentils: 'Сочевиця', cottage: 'Сир',
        water: 'Вода', juice: 'Сік', soda: 'Газована вода', sausage: 'Ковбаса', donut: 'Пончик', crisps: 'Чипси', bun: 'Булка', potato: 'Картопля' };
      const GROUP = {}; for (const g in G) G[g].forEach(s => GROUP[s] = g);
      const CAP = { veg: 4, grain: 2, prot: 2, cup: 1 };
      const pick = (g, n) => shuffle(G[g].slice()).slice(0, n);
      const shelf = h('div', { class: 'gshelf paper' });
      const zones = {};
      const gplate = h('div', { class: 'gplate', html: plateSVG(false) });
      for (const z of ['veg', 'grain', 'prot']) { zones[z] = h('div', { class: 'gz ' + z, 'data-z': z }); gplate.append(zones[z]); }
      zones.cup = h('div', { class: 'gcup', 'data-z': 'cup' }, h('span', {}, 'Напій')); gplate.append(zones.cup);
      const msgImg = h('img', { src: ch('yabluko'), alt: '' }), msgTxt = h('span', {}, 'Перетягніть продукти на тарілку: половина — овочі й фрукти, чверть — каша, чверть — білок. І напій!');
      const msg = h('div', { class: 'gmsg paper' }, msgImg, msgTxt);
      const tell = (t, ok, who) => { msgTxt.textContent = t; msg.className = 'gmsg paper ' + (ok === true ? 'ok' : ok === false ? 'no' : ''); msgImg.src = ch(who || 'yabluko'); msg.classList.remove('pop'); void msg.offsetWidth; msg.classList.add('pop'); };
      const placed = () => Object.fromEntries(Object.entries(zones).map(([z, e]) => [z, [...e.querySelectorAll('img')].map(i => i.dataset.s)]));
      const deal = () => {
        Object.values(zones).forEach(z => z.querySelectorAll('img').forEach(i => i.remove()));
        const items = shuffle([...pick('veg', 4), ...pick('grain', 2), ...pick('prot', 2), 'water', ...pick('rare', 3), 'potato']);
        shelf.replaceChildren(...items.map(s => h('div', { class: 'gitem', 'data-s': s }, h('img', { src: food(s), alt: '' }), h('span', {}, NAME[s]))));
        tell('Перетягніть продукти на тарілку: половина — овочі й фрукти, чверть — каша, чверть — білок. І напій!');
      };
      const drop = (s, z) => {
        const g = GROUP[s], drink = s === 'water' || s === 'juice' || s === 'soda';
        if (z === 'cup' && !drink) return tell('У склянку — лише напій.', false);
        if (z !== 'cup' && drink) return tell('Напій ставимо в склянку поруч з тарілкою.', false, 'kraplia');
        if (zones[z].querySelectorAll('img').length >= CAP[z]) return tell('Тут уже повно! Торкніться продукту на тарілці, щоб прибрати.', false);
        if (g === 'potato' && z === 'veg') return tell('Картопля смачна, але на тарілці вона не рахується як овоч!', false);
        if (g === 'rare') return tell(`${NAME[s]} — їжа «час від часу». Для щоденного обіду оберімо щось інше.`, false, 'grechka');
        if (z !== 'cup' && g !== z && g !== 'potato') return tell(`${NAME[s]} — не сюди. Подумайте, яка це група!`, false);
        const img = h('img', { src: food(s), alt: NAME[s], 'data-s': s, class: 'pop', onclick: () => { img.remove(); shelf.querySelector(`[data-s="${s}"]`).classList.remove('used'); } });
        zones[z].append(img); shelf.querySelector(`[data-s="${s}"]`).classList.add('used');
        const p = placed();
        if (p.veg.length >= 2 && p.grain.length && p.prot.length && p.cup.length) { tell('Збалансований обід! Половина — овочі й фрукти, чверть — каша, чверть — білок і вода. 🎉', true); confetti(el); }
        else tell(z === 'cup' ? 'Вода — найкращий напій від спраги!' : z === 'veg' ? 'Так! Овочі й фрукти — у половину.' : z === 'grain' ? 'Так! Каша дає енергію надовго.' : 'Так! Білок будує м\'язи.', true, z === 'cup' ? 'kraplia' : z === 'grain' ? 'grechka' : z === 'prot' ? 'kvasolia' : 'yabluko');
      };
      // перетягування (сцена масштабована — привид живе поза нею, у body)
      let drag = null;
      shelf.addEventListener('pointerdown', e => {
        const it = e.target.closest('.gitem'); if (!it || it.classList.contains('used')) return;
        e.preventDefault();
        const k = stageScale();
        drag = { s: it.dataset.s, g: h('div', { class: 'gghost', style: { width: 150 * k + 'px', height: 150 * k + 'px' } }, h('img', { src: food(it.dataset.s), alt: '' })) };
        document.body.append(drag.g); move(e); el.classList.add('dragging');
      });
      const zoneAt = (x, y) => { drag.g.style.display = 'none'; const t = document.elementFromPoint(x, y); drag.g.style.display = ''; return t && t.closest('[data-z]'); };
      const move = e => { if (!drag) return; drag.g.style.left = e.clientX + 'px'; drag.g.style.top = e.clientY + 'px'; const z = zoneAt(e.clientX, e.clientY); Object.values(zones).forEach(q => q.classList.toggle('hot', q === z)); };
      addEventListener('pointermove', move);
      addEventListener('pointerup', e => { if (!drag) return; const z = zoneAt(e.clientX, e.clientY); drag.g.remove(); el.classList.remove('dragging'); Object.values(zones).forEach(q => q.classList.remove('hot')); const s = drag.s; drag = null; if (z) drop(s, z.dataset.z); });
      const hd = header('Збери тарілку', 'Гра для всього класу');
      hd.append(h('button', { class: 'hd-btn', onclick: deal }, '↻ Інші продукти'));
      el.append(h('div', { class: 'body' }, hd,
        h('div', { class: 'game' }, h('div', { class: 'gtable' }, gplate), h('div', { class: 'gside' }, msg, shelf))));
      deal();
      return {};
    } });

  // 9. Порція рукою (F14)
  add({ stage: 'new', title: 'Порція рукою', bg: 'img/bg/kitchen.webp', bgcls: 'dim', steps: 4,
    tip: 'Попросіть дітей показати кулак, долоню й великий палець — і порівняти зі своєю порцією.',
    build(el) {
      const H = [['✊', 'Кулак', 'каші', 'buckwheat'], ['✋', 'Долоня', 'білка', 'fish'], ['✊', 'Кулак', 'овочів', 'broccoli'], ['👍', 'Великий палець', 'масла', 'oil']];
      const cards = H.map(([ic, t, d, img]) => h('div', { class: 'hand paper' }, h('div', { class: 'ic' }, ic), h('img', { src: food(img), alt: '' }), h('h3', {}, t), h('p', {}, d)));
      el.append(h('div', { class: 'body' }, header('Порція — на долоні', 'Скільки класти'), h('div', { class: 'hands' }, cards)));
      return { step(s) { cards.forEach((c, i) => c.classList.toggle('on', s > i)); } };
    } });

  // 10. Скільки і як часто (F05, F06, F08, F16, F18)
  add({ stage: 'new', title: 'Скільки і як часто', bg: 'img/bg/shop.webp', bgcls: 'dim', steps: 5,
    tip: 'Цифри цукру й солі — орієнтир ВООЗ для дорослих; дітям — ще менше. Особистих підрахунків не робимо.',
    build(el) {
      const O = [['400 г', 'овочів і фруктів щодня — приблизно 5 жмень', ['apple', 'carrot', 'grapes'], 'var(--veg)'],
        ['2–3 рази', 'на тиждень — риба', ['fish', 'wholefish'], 'var(--water)'],
        ['Менше ложки', 'солі на день дорослим, дітям — ще менше; сіль бажано йодована', ['crisps'], 'var(--grain)'],
        ['Якомога менше', 'доданого цукру — навіть дорослим не більше 12 чайних ложок на день', ['sugar', 'soda'], 'var(--prot)'],
        ['Час від часу', 'ковбаса, сосиски, булки з білого борошна', ['sausage', 'bun'], '#9A6B4A']];
      const cards = O.map(([b, t, imgs, c]) => h('div', { class: 'oc paper', style: { '--c': c } }, h('div', { class: 'imgs' }, imgs.map(i => h('img', { src: food(i), alt: '' }))), h('b', {}, b), h('span', {}, t)));
      el.append(h('div', { class: 'body' }, header('Скільки і як часто', 'Запам\'ятай'), h('div', { class: 'often' }, cards), h('div', { class: 'src-line' }, 'ВООЗ, 2026; ЮНІСЕФ Україна, 2025')));
      return { step(s) { cards.forEach((c, i) => c.classList.toggle('on', s > i)); } };
    } });

  // 11. Станції з таймером
  add({ stage: 'practice', title: 'Станції', bg: 'img/bg/class.webp', bgcls: 'dim',
    tip: 'Три групи, по 4 хвилини на станції. Натисніть «Старт»; коли час вийде — «Наступне коло», і групи переходять далі.',
    build(el) {
      const ST = [['Збери тарілку', 'station_plate', 'Обід з карток: ½ овочі й фрукти, ¼ каша, ¼ білок і напій. Поясніть вибір!', 'var(--veg)'],
        ['Детектив етикеток', 'station_label', 'Знайдіть склад, цукри й сіль на 100 г, алергени й дату.', 'var(--water)'],
        ['Меню на день', 'station_menu', 'Сніданок, обід, вечеря й 1–2 перекуси. Чи є 5 жмень овочів і фруктів? Чи є вода?', 'var(--grain)']];
      let round = 0;
      const grp = ST.map(() => h('div', { class: 'grp' }));
      const cards = ST.map(([t, img, d, c], i) => h('div', { class: 'stc paper', style: { '--c': c } }, h('span', { class: 'num' }, String(i + 1)),
        h('img', { src: `img/art/${img}.webp`, alt: '' }), h('h3', {}, t), h('p', {}, d), grp[i]));
      const paint = () => grp.forEach((g, i) => { g.textContent = 'Група ' + (((i - round) % 3 + 3) % 3 + 1); });
      const TOTAL = 240; let left = TOTAL, tid = null;
      const R = 140, C = 2 * Math.PI * R;
      const ring = h('div', { class: 'ring', html: `<svg viewBox="0 0 320 320"><circle cx="160" cy="160" r="${R}" stroke="#EADBC4"/><circle class="p" cx="160" cy="160" r="${R}" stroke="#C8341F" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>` }, h('div', { class: 't' }));
      const draw = () => { ring.querySelector('.t').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; ring.querySelector('.p').style.strokeDashoffset = C * (1 - left / TOTAL); ring.classList.toggle('end', left === 0); };
      const go = h('button', { class: 'main', onclick: () => { if (tid) { clearInterval(tid); tid = null; go.textContent = 'Старт'; } else { go.textContent = 'Пауза'; tid = setInterval(() => { if (left > 0) left--; draw(); if (!left) { clearInterval(tid); tid = null; go.textContent = 'Старт'; } }, 1000); } } }, 'Старт');
      const reset = () => { clearInterval(tid); tid = null; left = TOTAL; go.textContent = 'Старт'; draw(); };
      const rnd = h('div', { class: 'round' });
      const nextRound = h('button', { onclick: () => { round = (round + 1) % 3; rnd.textContent = `Коло ${round + 1} з 3`; paint(); reset(); } }, 'Наступне коло');
      const qr = h('div', { class: 'qrbox', html: (D.qr.gra || '') + '<p><b>Станція 1 на телефонах</b>веб-гра «Збери тарілку»<br>dyvourok.com.ua/tarilka/gra</p>' });
      const timer = h('div', { class: 'timer paper' }, ring, rnd, h('div', { class: 'row' }, go, h('button', { onclick: reset }, 'Скинути')), nextRound, qr);
      rnd.textContent = 'Коло 1 з 3'; paint(); draw();
      el.append(h('div', { class: 'body' }, header('Робота в групах', 'Три станції'), h('div', { class: 'st' }, cards, timer)));
      return { leave() { clearInterval(tid); tid = null; go.textContent = 'Старт'; } };
    } });

  video(3, 'Детектив етикеток', 'Покажіть мультик перед станцією «Детектив етикеток» — або всім класом перед наступним екраном.');

  // 13. Детектив етикеток на дошці (F19–F22, F29 🎭 — продукт вигаданий)
  add({ stage: 'practice', title: 'Детектив етикеток', bg: 'img/bg/shop.webp', bgcls: 'dim',
    tip: 'Діти по черзі виходять і торкаються потрібного місця на етикетці. Продукт навчальний — вигаданий.',
    build(el) {
      const Z = (k, html) => `<span class="z" data-z="${k}">${html}</span>`;
      const lab = h('div', { class: 'lab', html:
        `<div class="lh">${Z('name', '<b>Йогурт полуничний 2,5 %</b>')}<span>Кисломолочний продукт</span></div>
        ${Z('sklad', `<i style="font-style:normal;font-weight:1000">Склад:</i> ${Z('alerg', '<b style="font-weight:1000">молоко</b>')} нормалізоване, цукор, полуничний наповнювач (полуниця, цукор, вода, пектин), закваска.`)}
        <table><tr><th>Поживна цінність</th><th>на 100 г</th></tr>
          <tr><td>Енергія, ккал</td><td>98</td></tr><tr><td>Жири, г</td><td>2,5</td></tr><tr><td>Вуглеводи, г</td><td>14,5</td></tr>
          <tr class="r-sugar"><td colspan="2" style="padding:0">${Z('sugar', '<span style="display:flex;justify-content:space-between;padding:5px 12px"><span>у т. ч. цукри, г</span><span>13,8</span></span>')}</td></tr>
          <tr><td>Білки, г</td><td>3,0</td></tr>
          <tr><td colspan="2" style="padding:0">${Z('salt', '<span style="display:flex;justify-content:space-between;padding:5px 12px"><span>Сіль, г</span><span>0,10</span></span>')}</td></tr></table>
        ${Z('date', '<i style="font-style:normal;font-weight:1000">Вжити до:</i> <b style="font-weight:1000">05.11.2026</b>')}
        <div class="made">Зберігати за +2…+6 °C · Виробник: ТОВ «Навчальний продукт»</div>` });
      const T = [['sklad', 'Чого в цьому йогурті найбільше?', 'Першим у складі написано молоко — отже, його найбільше. Склад пишуть за спаданням маси.'],
        ['alerg', 'Знайди алерген', 'Молоко виділене жирним шрифтом — так позначають алергени, щоб їх легко було помітити.'],
        ['sugar', 'Скільки в ньому цукрів на 100 г?', '13,8 г цукрів на 100 г — це понад три чайні ложки (одна ложка — близько 4 г).'],
        ['salt', 'А скільки солі?', '0,1 г солі на 100 г — зовсім трохи.'],
        ['date', 'До якої дати його можна їсти?', '«Вжити до» — після цієї дати їсти не можна. А «краще спожити до» — після неї продукт може стати менш смачним.']];
      let i = 0, done = false;
      const tn = h('div', { class: 'tn' }), tq = h('h3', {}), tf = h('div', {}), steps = h('div', { class: 'steps' }, T.map(() => h('i')));
      const lupa = say('lupa', '', { side: 'right', right: '100px', bottom: '160px', h: 290 });
      const show = () => { done = false; tn.textContent = `Завдання ${i + 1} з ${T.length}`; tq.textContent = T[i][1]; tf.className = ''; tf.textContent = ''; lupa.setText(''); [...steps.children].forEach((s, k) => s.classList.toggle('on', k < i)); };
      const found = () => { done = true; lab.querySelector(`[data-z="${T[i][0]}"]`).classList.add('found'); tf.className = 'found pop'; tf.textContent = T[i][2]; lupa.setText(''); [...steps.children].forEach((s, k) => s.classList.toggle('on', k <= i)); $('#next').classList.add('pulse'); };
      lab.addEventListener('click', e => {
        if (done) return;
        const z = e.target.closest('[data-z]'); if (!z) return;
        // алерген лежить усередині складу: дотик до слова «молоко» на першому завданні теж рахуємо як склад
        const want = T[i][0];
        if (z.dataset.z === want || (want === 'sklad' && z.dataset.z === 'alerg')) { found(); e.stopPropagation(); }
        else { z.classList.remove('wrong'); void z.offsetWidth; z.classList.add('wrong'); lupa.setText(''); }
      });
      el.append(h('div', { class: 'body' }, header('Детектив етикеток', 'Знайди на етикетці'),
        h('div', { class: 'det' }, lab, h('div', { class: 'task paper' }, tn, tq, tf, steps, h('div', { class: 'fake' }, 'Продукт вигаданий — це навчальна етикетка.')))), lupa);
      show();
      return {
        next() { if (!done) { found(); return true; } if (i < T.length - 1) { i++; show(); return true; } return false; },
        prev() { if (i > 0) { lab.querySelectorAll('.found').forEach(f => f.classList.remove('found')); i--; for (let k = 0; k < i; k++) lab.querySelector(`[data-z="${T[k][0]}"]`).classList.add('found'); show(); return true; } return false; },
        progress: () => [i, T.length]
      };
    } });

  // 14. Покажіть, що вийшло — чек-лист
  add({ stage: 'sum', title: 'Покажіть, що вийшло', bg: 'img/bg/class.webp', bgcls: 'dim',
    tip: 'Кожна група — 1 хвилина. Клас звіряє з чек-листом: торкайтеся пунктів, які виконано.',
    build(el) {
      const L = ['Половина тарілки — овочі й фрукти', 'Є каша або цільнозерновий хліб', 'Є білок', 'Головний напій — вода', 'За день — щонайменше 5 жмень овочів і фруктів'];
      const ul = h('ul', { class: 'paper' }, L.map(t => { const li = h('li', { onclick: () => li.classList.toggle('on') }, h('i'), t); return li; }));
      el.append(h('div', { class: 'body' }, header('Покажіть, що вийшло', '1 хвилина на групу'), h('div', { class: 'check' }, ul, h('div'))),
        say('kvasolia', 'Перевіримо разом!', { side: 'right', right: '120px', bottom: '140px', h: 420 }));
      return {};
    } });

  // 15. Квіз на дошці + QR (ті самі 10 питань, що й /tarilka/kviz)
  add({ stage: 'sum', title: 'Квіз', bg: 'img/bg/class.webp', bgcls: 'dim',
    tip: 'Два способи: діти проходять квіз на телефонах за QR, або всі разом на дошці — клас обирає відповідь, ви натискаєте.',
    build(el) {
      const Q = [
        ['Яку частину тарілки займають овочі й фрукти?', ['Половину', 'Чверть', 'Майже нічого', 'Усю тарілку'], 0, 'Половина — овочі й фрукти, чверть — каші, чверть — білок.'],
        ['Картопля на тарілці рахується як овоч?', ['Так', 'Ні'], 1, 'Картопля смачна, але як овоч на тарілці не рахується.'],
        ['Який напій найкраще тамує спрагу?', ['Сік', 'Газована вода', 'Вода', 'Енергетик'], 2, 'Найкращий напій — звичайна вода.'],
        ['Що написано в складі першим?', ['Того найбільше', 'Того найменше', 'Найкорисніше', 'Нічого не означає'], 0, 'Склад пишуть за спаданням: перше — того найбільше.'],
        ['Де ще ховається цукор?', ['Ніде більше', 'У соках, сиропах і меді', 'Лише в морозиві', 'У воді'], 1, 'Цукор є й у соках, сиропах і меді.'],
        ['Скільки овочів і фруктів — щодня?', ['Одна жменя', 'Щонайменше 5 жмень', 'Лише в неділю', 'Лише картопля'], 1, 'Щонайменше 400 г — приблизно 5 жмень.'],
        ['Як позначають алергени?', ['Ніяк', 'Виділяють у складі', 'Дрібно в кінці', 'Малюнком'], 1, 'Алергени виділяють — наприклад, жирним шрифтом.'],
        ['«Вжити до 05.11» означає…', ['Після дати їсти не можна', 'Стане смачнішим', 'Дата виробництва', 'Це ціна'], 0, '«Вжити до» — граничний термін.'],
        ['Яка їжа — «час від часу»?', ['Гречка', 'Яблуко', 'Ковбаса й сосиски', 'Квасоля'], 2, 'Ковбаса й сосиски — не щодня.'],
        ['Як рукою відміряти кашу?', ['Кулак', 'Мізинець', 'Дві долоні', 'Ніяк'], 0, 'Кулак каші, долоня білка, великий палець масла.']];
      const COL = ['#C8341F', '#3F86C2', '#D99A12', '#5E9447'], LET = ['А', 'Б', 'В', 'Г'];
      let i = 0, score = 0, done = false;
      const q = h('div', { class: 'q paper' }), sc = h('b', {}, '0');
      const show = () => {
        done = false;
        if (i >= Q.length) {
          q.replaceChildren(h('div', { class: 'end' }, h('b', {}, `${score}/${Q.length}`), h('p', {}, score >= 8 ? 'Клас чудово знає тарілку!' : 'Добре! Повторімо, що запам\'ятали.')));
          if (score >= 8) confetti(el); return;
        }
        const [t, o, a, w] = Q[i];
        const opts = h('div', { class: 'opts' }, o.map((x, k) => h('button', { class: 'opt', onclick: () => answer(k) }, h('span', { class: 'l', style: { background: COL[k] } }, LET[k]), x)));
        q.replaceChildren(h('div', { class: 'qn' }, `Питання ${i + 1} з ${Q.length}`), h('h3', {}, t), opts, h('div', { class: 'whybox' }));
        q._opts = opts;
      };
      const answer = k => {
        if (done || i >= Q.length) return; done = true;
        const [, , a, w] = Q[i]; if (k === a) { score++; sc.textContent = score; }
        [...q._opts.children].forEach((b, n) => b.classList.add(n === a ? 'ok' : n === k ? 'no' : 'dim'));
        q.querySelector('.whybox').replaceChildren(h('div', { class: 'why pop' }, (k === a ? 'Так! ' : 'Правильна відповідь виділена. ') + w));
        $('#next').classList.add('pulse');
      };
      el.append(h('div', { class: 'body' }, header('Квіз', 'Перевір себе'),
        h('div', { class: 'qz' }, q, h('div', { class: 'aside' }, h('div', { class: 'score paper' }, sc, h('span', {}, 'правильних')),
          h('div', { class: 'qrbox paper', html: (D.qr.kviz || '') + '<p><b>Або на телефонах</b>dyvourok.com.ua/tarilka/kviz</p>' })))));
      show();
      return {
        next() { if (i >= Q.length) return false; if (!done) { answer(-1); return true; } i++; show(); return true; },
        progress: () => [Math.min(i, Q.length - 1), Q.length]
      };
    } });

  // 16. Моя тарілка завтра
  add({ stage: 'refl', title: 'Моя тарілка завтра', bg: 'img/bg/kitchen.webp', bgcls: 'dim',
    tip: 'Кожен обирає ОДНУ зміну на завтра й пише її на стікері. Натискайте варіанти, щоб порахувати, що обрав клас.',
    build(el) {
      const O = [['Додати овоч до обіду', 'carrot'], ['Взяти воду в пляшці', 'bottle'], ['Яблуко в рюкзак', 'apple'], ['Кашу на сніданок', 'oatmeal'], ['Рибу цього тижня', 'fish'], ['Сік — лише час від часу', 'juice']];
      let total = 0;
      const onPlate = h('div', { class: 'onplate' });
      const btns = O.map(([t, img]) => { const c = h('span', { class: 'c' }, ''); let n = 0;
        const b = h('button', { onclick: () => {
          n++; total++; c.textContent = n; b.classList.add('picked');
          if (n === 1) onPlate.append(h('img', { src: food(img), alt: '', class: 'pop' }));
          if (total === 10 || total === 20) confetti(el);
        } }, h('img', { src: food(img), alt: '' }), t, c); return b; });
      const plate = h('div', { class: 'tplate', html: plateSVG(false) }, onPlate);
      el.append(h('div', { class: 'body' }, header('Одна зміна, яку я спробую завтра', 'Рефлексія'), h('div', { class: 'tom' }, plate, h('div', { class: 'opts' }, btns))),
        say('kraplia', '', { side: 'left', left: '30px', bottom: '140px', h: 280 }));
      return {};
    } });

  // 17. Джерела
  add({ stage: 'refl', title: 'Джерела', bg: 'img/bg/class.webp', bgcls: 'dim',
    tip: 'Повний список із посиланнями — у PDF «Джерела» з набору.',
    build(el) {
      const L = ['<b>МОН.</b> Модельна навчальна програма «Здоров\'я, безпека та добробут. 5–6 класи», наказ №795 від 12.07.2021.',
        '<b>ВООЗ.</b> Healthy diet. Fact sheet, 26.01.2026.', '<b>Гарвардська школа громадського здоров\'я.</b> Healthy Eating Plate.',
        '<b>ЮНІСЕФ Україна.</b> «Повна тарілка здоров\'я», 26.06.2025.', '<b>Суспільне / ЦГЗ.</b> Тарілка здорового харчування, 24.01.2021.',
        '<b>МОЗ України.</b> Чи можна пити воду під час їжі.', '<b>Закон №2639-VIII</b> «Про інформацію для споживачів щодо харчових продуктів» (ст. 12, 15, 18, 23).',
        '<b>Держпродспоживслужба</b> на kmu.gov.ua: нові правила читання етикетки, 06.08.2019.', '<b>EUFIC.</b> Харчові настанови в країнах Європи.',
        '<b>Слово і діло.</b> МОЗ презентувало тарілку здорового харчування, 13.12.2017.',
        'Герої мультиків і навчальні етикетки — художня вигадка. Тарілку намальовано заново за моделлю Гарварду.'];
      el.append(h('div', { class: 'body' }, header('Джерела', 'Для вчителя'), h('ol', { class: 'srcs paper' }, L.map(t => h('li', { html: t })))));
      return {};
    } });

  // ------------------------------------------------------------ рушій
  const stage = $('#stage');
  let cur = -1, step = 0, api = {};
  // підказка вчителю за замовчуванням схована: урок транслюють класу. Лампочка вмикає її, вибір пам'ятаємо на пристрої
  let tipOn = false;
  try { tipOn = localStorage.getItem('tarilka_tip') === '1'; } catch (e) {}
  const stageScale = () => Math.min(innerWidth / 1920, innerHeight / 1080);
  const fit = () => { stage.style.transform = `translate(-50%,-50%) scale(${stageScale()})`; };

  // каркас
  const stagesEl = h('div', { class: 'stages' }, STAGES.map(([id, t], i) => h('button', { class: 'stage', 'data-st': id, onclick: () => go(S.findIndex(s => s.stage === id)) }, h('span', { class: 'n' }, String(i + 1)), t)));
  const offline = location.protocol === 'file:';
  const homeBtn = offline ? null : h('a', { class: 'tb-btn', href: '../../../app/#/pack/tarilka', html: ICON.home + 'До набору' });
  const tipBtn = h('button', { class: 'tb-btn' + (tipOn ? ' on' : ''), title: 'Підказка вчителю (T)', 'aria-label': 'Підказка вчителю', html: ICON.tip, onclick: () => toggleTip() });
  const toggleTip = () => { tipOn = !tipOn; tipBtn.classList.toggle('on', tipOn); tipEl.classList.toggle('hide', !tipOn); try { localStorage.setItem('tarilka_tip', tipOn ? '1' : '0'); } catch (e) {} };
  const ovBtn = h('button', { class: 'tb-btn', title: 'Усі екрани (O)', 'aria-label': 'Усі екрани', html: ICON.grid, onclick: () => toggleOv() });
  const fsBtn = h('button', { class: 'tb-btn', title: 'На весь екран (F)', 'aria-label': 'На весь екран', html: ICON.full, onclick: () => fullscreen() });
  stage.append(h('div', { class: 'topbar' }, homeBtn, stagesEl, h('div', { class: 'tb-right' }, tipBtn, ovBtn, fsBtn)));
  const tipEl = h('div', { class: 'tip' + (tipOn ? '' : ' hide') });
  const dots = h('div', { class: 'dots' });
  const nextBtn = h('button', { id: 'next', class: 'next', onclick: () => next(), html: '<span>Далі</span>' + ICON.next });
  const backBtn = h('button', { class: 'back', 'aria-label': 'Назад', onclick: () => prev(), html: ICON.back });
  stage.append(h('div', { class: 'botbar' }, backBtn, dots, tipEl, nextBtn));
  const ov = h('div', { class: 'ov' });
  stage.append(ov);

  const scenes = S.map((s, i) => {
    const el = h('section', { class: 'scene ' + (s.cls || '') }, h('div', { class: 'bg ' + (s.bgcls || ''), style: { backgroundImage: `url(${s.bg})` } }));
    stage.insertBefore(el, stage.querySelector('.topbar'));
    return el;
  });
  const built = [];

  function paintChrome() {
    const s = S[cur];
    const si = STAGES.findIndex(x => x[0] === s.stage);
    [...stagesEl.children].forEach((b, i) => { b.classList.toggle('now', i === si); b.classList.toggle('done', i < si); });
    tipEl.innerHTML = '<b>Вчителю</b>' + s.tip;
    const p = api.progress ? api.progress() : s.steps ? [step, s.steps + 1] : null;
    dots.replaceChildren(...(p && p[1] > 1 ? Array.from({ length: p[1] }, (_, k) => h('i', { class: k === p[0] ? 'on' : '' })) : []));
    nextBtn.querySelector('span').textContent = cur === S.length - 1 ? 'Кінець' : 'Далі';
    backBtn.style.visibility = cur === 0 && step === 0 ? 'hidden' : 'visible';
    nextBtn.style.visibility = cur === S.length - 1 ? 'hidden' : 'visible';
    try { history.replaceState(null, '', location.pathname + location.search + '#' + (cur + 1)); } catch (e) {}
  }
  function go(i, atEnd) {
    i = Math.max(0, Math.min(S.length - 1, i));
    if (cur >= 0 && built[cur] && built[cur].leave) built[cur].leave();
    if (cur >= 0) scenes[cur].classList.remove('on');
    cur = i;
    if (!built[i]) built[i] = S[i].build(scenes[i], go) || {};
    api = built[i];
    step = atEnd && S[i].steps ? S[i].steps : 0;
    if (api.step) api.step(step);
    scenes[i].classList.add('on');
    nextBtn.classList.remove('pulse');
    if (ov.classList.contains('on')) toggleOv(false);
    paintChrome();
  }
  function next() {
    nextBtn.classList.remove('pulse');
    if (api.next && api.next()) return paintChrome();
    const s = S[cur];
    if (s.steps && step < s.steps) { step++; api.step(step); if (step === s.steps) nextBtn.classList.add('pulse'); return paintChrome(); }
    if (cur < S.length - 1) go(cur + 1);
  }
  function prev() {
    if (api.prev && api.prev()) return paintChrome();
    const s = S[cur];
    if (s.steps && step > 0) { step--; api.step(step); return paintChrome(); }
    if (cur > 0) go(cur - 1, true);
  }
  function toggleOv(force) {
    const on = force == null ? !ov.classList.contains('on') : force;
    ov.classList.toggle('on', on); ovBtn.classList.toggle('on', on);
    if (!on) return;
    ov.replaceChildren(h('button', { class: 'tb-btn close', onclick: () => toggleOv(false) }, 'Закрити ✕'),
      ...STAGES.map(([id, t], si) => [h('h3', {}, `${si + 1}. ${t}`),
        h('div', { class: 'grid' }, S.map((s, i) => s.stage === id ? h('button', { class: i === cur ? 'now' : '', onclick: () => go(i) }, h('small', {}, `Екран ${i + 1}`), s.title) : null))]).flat());
  }
  function fullscreen() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }

  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') fullscreen();
    else if (e.key === 'o' || e.key === 'O' || e.key === 'щ' || e.key === 'Щ') toggleOv();
    else if (e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') toggleTip();
    else if (e.key === 'Escape' && ov.classList.contains('on')) toggleOv(false);
  });
  addEventListener('resize', fit);
  fit();
  go((parseInt(location.hash.slice(1), 10) || 1) - 1, /[?&]all(&|$)/.test(location.search));
})();
