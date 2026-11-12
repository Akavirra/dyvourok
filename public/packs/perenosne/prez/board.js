/* «Робот Буквалик і чарівні окуляри» — урок на дошці (укр. мова, 3 клас). Сцена 1920×1080.
   ЗГЕНЕРОВАНО den-movy/perenosne/board/build_board.py — не редагуйте вручну. Рушій — з tarilka/prez/board.js. */
(() => {
  'use strict';
  const D = window.PERENOSNE_DATA || { subs: {}, qr: {} };
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      // змінні CSS (--c) через Object.assign не ставляться — лише setProperty
      else if (k === 'style' && typeof v === 'object') for (const [p, x] of Object.entries(v)) { if (p.startsWith('--')) e.style.setProperty(p, x); else e.style[p] = x; }
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

  // ============================================================ «Робот Буквалик і чарівні окуляри» — екрани
  // Приклади — з den-movy/perenosne/DZHERELA.md (P.., D.. у коментарях). Сюжет і персонажі — 🎭.
  const art = n => `img/art/${n}.webp`;
  const cut = n => `img/cut/c_${n}.webp`;   // ілюстрації з прозорим фоном (наліпки)
  // ілюстрація на кольоровому колі з білим контуром — як у презентації
  const sticker = (src, tone, cls) => h('div', { class: 'stk ' + (tone || 'gold') + (cls ? ' ' + cls : '') }, h('i'), h('img', { src, alt: '' }));
  const ch = n => `img/char/${n}.webp`;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // короткі репліки Буквалика (bo_ — похвала, bn_ — підказка); якщо файла ще немає — тихо пропускаємо
  const voice = (() => {
    let a = null;
    return id => { try { if (a) a.pause(); a = new Audio(`../media/audio/${id}.mp3`); a.volume = Math.max(0.2, +store.get('dyvo_vol', 1) || 1); a.play().catch(() => {}); } catch (e) {} };
  })();
  // Похвала й підказки звучать рідко: не частіше ніж раз на 12 с (підказка — 15 с), фрази йдуть по колу без повторів поспіль.
  // Репліки-вступи екранів (b0_01, bk_01, bf_01…) — лише перший раз за урок.
  const said = new Set();
  const once = id => { if (said.has(id)) return; said.add(id); voice(id); };
  const ring = (ids, gap) => { let k = Math.random() * ids.length | 0, last = -1e9;
    return (force) => { const now = Date.now(); if (!force && now - last < gap) return; last = now; k = (k + 1) % ids.length; voice(ids[k]); }; };
  const praise = ring(['bo_01', 'bo_02', 'bo_03'], 12000);
  const hint = ring(['bn_01', 'bn_02'], 15000);

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

  // ------------------------------------------------------------ батарейка розуміння (наскрізна гра уроку)
  // кожна вправа заряджає один раз; рівень = сума виконаних вправ, тож «Назад» нічого не ламає
  const battery = (() => {
    const got = {};
    const fill = h('i');
    const pct = h('b', {}, '0 %');
    const el = h('button', { class: 'battery', title: 'Батарейка розуміння Буквалика', onclick: () => el.classList.toggle('big') },
      h('img', { src: ch('bukvalyk_head'), alt: '' }), h('span', { class: 'cell' }, fill), pct);
    const level = () => Math.min(100, Object.values(got).reduce((a, b) => a + b, 0));
    const paint = () => { const l = level(); fill.style.width = l + '%'; pct.textContent = l + ' %'; el.classList.toggle('full', l >= 100); };
    return { el, level, charge(id, n) { if (got[id]) return false; got[id] = n; paint(); el.classList.remove('zap'); void el.offsetWidth; el.classList.add('zap'); return true; } };
  })();

  // ------------------------------------------------------------ екрани
  const STAGES = [['start', 'Початок'], ['kalig', 'Каліграфія'], ['new', 'Нове'], ['play', 'Граємо'], ['create', 'Творимо'], ['refl', 'Підсумок']];
  const S = [];
  const add = o => S.push(o);
  const STAGE_NAME = {};

  // 1. Титул
  add({ stage: 'start', title: 'Титул', bg: 'img/bg/class.webp', cls: 'hero',
    tip: 'Відкрийте на весь екран (кнопка вгорі праворуч або F). Далі — велика червона кнопка або стрілка →. Батарейку Буквалика видно в лівому нижньому куті: кожна вправа її заряджає. Підказки ховаються лампочкою або клавішею T.',
    build(el, go) {
      el.append(h('div', { class: 'card pop' },
        h('span', { class: 'kick' }, 'Українська мова · 3 клас'),
        h('h1', {}, 'Робот Буквалик і чарівні окуляри'),
        h('p', {}, 'Уживання слів у прямому і переносному значенні'),
        h('button', { class: 'start', onclick: () => go(1), html: 'Почати урок ' + ICON.next })),
        h('img', { class: 'hero-bot', src: ch('bukvalyk'), alt: '' }));
    } });

  // 2. Хто це летить? — повітряна куля у вікні (без тривог і ракет)
  add({ stage: 'start', title: 'Хто це летить?', bg: 'img/bg/class.webp', steps: 1,
    tip: 'Натисніть «Далі» — у вікні з’явиться паперова повітряна куля. Спитайте: «Хто це летить до нашого класу?» Вислухайте 2–3 здогадки і вмикайте мультик.',
    build(el) {
      const ball = h('img', { class: 'balloon', src: art('balloon'), alt: '' });
      const bot = h('img', { class: 'balloon-bot', src: ch('bukvalyk_head'), alt: '' });
      const q = h('div', { class: 'bigq paper' }, 'Хто це летить до нашого класу?');
      el.append(h('div', { class: 'fly' }, ball, bot), q);
      return { step(s) { el.classList.toggle('flying', s >= 1); if (s >= 1) once('b0_01'); } };
    } });

  // відео
  const video = (n, title, stage, tip, bg) => add({ stage, title: 'Мультик ' + n, bg: 'img/bg/paper.webp', tip,
    build(el) {
      const p = vplayer(`../media/m${n}.mp4`, `../media/m${n}.jpg`, D.subs['m' + n] || []);   // субтитри — окремо (data.js), вмикаються в плеєрі
      p.video.addEventListener('ended', () => { $('#next').classList.add('pulse'); if (n === 2) battery.charge('m2', 10); if (n === 3) { battery.charge('m3', 10); confetti(el); } });
      el.append(h('div', { class: 'body' }, header(title, 'Мультик ' + n), h('div', { class: 'vid' }, h('div', { class: 'vbox' }, p.box))));
      return { leave() { p.video.pause(); } };
    } });

  video(1, 'Буквалик прилітає', 'start', 'Після мультика спитайте: «Чому Буквалик так дивно все зрозумів? Чи справді осінь — із золота?» Субтитри вмикаються кнопкою в куті.', 'yard');

  // 4. Каліграфічна хвилинка «Принтер Буквалика» (K1, P02)
  const KALIG = [
    ['З з', 'Велика і мала літера З'],
    ['зо  зл  зе', 'З’єднання'],
    ['золото   золотий', 'Слова'],
    ['Золота осінь.', 'Речення']
  ];
  add({ stage: 'kalig', title: 'Каліграфічна хвилинка', bg: 'img/bg/paper.webp', steps: KALIG.length + 1,
    tip: 'Буквалик уміє лише ДРУКУВАТИ — діти допомагають йому: переписують надрукований рядок у зошит гарним письмом. Нагадайте про посадку й нахил. Після речення «Золота осінь.» — ще раз «Далі»: Буквалик дивується «Осінь із золота?!». Хай діти пояснять: осінь жовта, як золото. Це і є місток до теми.',
    build(el) {
      const rows = KALIG.map(([txt, lab], i) => h('div', { class: 'kl-row' }, h('b', { class: 'kl-n', title: lab }, String(i + 1)),
        h('div', { class: 'kl-img' }, h('img', { src: 'img/kl/kl_line.webp', alt: '' }), h('img', { class: 'kl-ink2', src: `img/kl/kl_${i + 1}.webp`, alt: txt }))));
      const sheet = h('div', { class: 'kl-sheet paper' }, rows, h('small', { class: 'kl-src' }, 'Шрифт прописів: Propysy © Всеосвіта'));
      const printer = h('div', { class: 'kl-printer' }, h('img', { src: ch('bukvalyk'), alt: '' }));
      const wonder = h('div', { class: 'kl-wonder' },
        h('figure', {}, sticker(cut('lit_osin'), 'blue'), h('figcaption', { class: 'pill blue' }, 'Так подумав Буквалик')),
        h('div', { class: 'kl-q' }, '?!'),
        h('figure', {}, sticker(cut('pr_osin'), 'gold'), h('figcaption', { class: 'pill gold' }, 'А насправді — жовте листя!')));
      el.append(h('div', { class: 'body' }, header('Допоможи Буквалику: напиши красиво!', 'Каліграфічна хвилинка'), h('div', { class: 'kl' }, sheet, printer), wonder));
      return { step(s) {
        rows.forEach((r, i) => r.classList.toggle('on', i < s));
        if (s === 1) once('bk_01');
        el.classList.toggle('wonder', s > KALIG.length);
        if (s > KALIG.length) { once('bk_02'); battery.charge('kalig', 10); }
      } };
    } });

  // 5. Тема й цілі (D1, D2)
  add({ stage: 'new', title: 'Тема уроку', bg: 'img/bg/paper.webp', steps: 3,
    tip: 'Прочитайте тему. Кожне «Далі» відкриває одну ціль уроку. Покажіть окуляри: синя лінза — пряме значення, золота — переносне.',
    build(el) {
      const goals = ['Дізнаюся, що таке пряме і переносне значення слова', 'Навчуся їх розрізняти', 'Вживатиму слова в переносному значенні у своєму мовленні'];
      const lis = goals.map((g, i) => h('li', {}, h('b', {}, String(i + 1)), g));
      el.append(h('div', { class: 'body' }, header('Уживання слів у прямому і переносному значенні', 'Тема уроку'),
        h('div', { class: 'topic' },
          h('div', { class: 'glasses' }, h('img', { src: art('glasses'), alt: '' }), h('span', { class: 'lens blue' }, 'Пряме'), h('span', { class: 'lens gold' }, 'Переносне')),
          h('ol', { class: 'goals paper' }, lis))));
      return { step(s) { lis.forEach((l, i) => l.classList.toggle('on', i < s)); } };
    } });

  video(2, 'Чарівні окуляри', 'new', 'Після мультика попросіть дітей своїми словами сказати правило: пряме — основне значення; переносне — слово «переїхало» до іншого предмета, бо вони чимось схожі.', 'class');

  // 7. Правило-опора (D1–D3)
  add({ stage: 'new', title: 'Правило', bg: 'img/bg/paper.webp', steps: 2,
    tip: 'Опора для дітей. Можна залишити на екрані, поки діти записують приклад у зошит: «залізний цвях — залізний характер».',
    build(el) {
      const a = h('div', { class: 'rule blue paper' }, h('h3', {}, 'Пряме значення'), h('p', {}, 'Основне, перше значення слова.'), h('div', { class: 'ex' }, sticker(cut('pr_tsviakh'), 'blue', 'sm'), h('div', {}, h('b', {}, 'залізний цвях'), h('small', {}, 'справді із заліза'))));
      const b = h('div', { class: 'rule gold paper' }, h('h3', {}, 'Переносне значення'), h('p', {}, 'Слово «переїхало» до іншого предмета, бо вони чимось схожі.'), h('div', { class: 'ex' }, sticker(cut('pr_khlopets'), 'gold', 'sm'), h('div', {}, h('b', {}, 'залізний характер'), h('small', {}, 'міцний, як залізо'))));
      const c = h('div', { class: 'neighbors' }, 'Яке значення в слова? Подивись на його ', h('b', {}, 'сусідів'), '!');
      el.append(h('div', { class: 'body' }, header('Запам’ятай!', 'Правило'), h('div', { class: 'rules' }, a, b), c));
      return { step(s) { b.classList.toggle('on', s >= 1); c.classList.toggle('on', s >= 2); } };
    } });

  // 8. «Окуляри Буквалика» — буквальна картинка → справжнє значення
  const LENS = [
    ['золоте сонце', 'lit_sontse', 'pr_sontse', 'Сонце жовте, як золото'],          // P17
    ['час біжить', 'lit_chas', 'pr_chas', 'Час швидко минає'],                        // P16
    ['золоте серце', 'lit_sertse', 'pr_sertse', 'Добра, щедра людина'],               // P03
    ['тепла усмішка', 'lit_usmishka', 'pr_usmishka', 'Лагідна, приязна усмішка']     // P15
  ];
  add({ stage: 'play', title: 'Окуляри Буквалика', bg: 'img/bg/paper.webp',
    tip: 'Буквалик бачить усе в прямому значенні. Спитайте: «Чи так це насправді? Що означає цей вираз?» Діти пояснюють — потім натисніть окуляри посередині (або «Далі»): з’явиться справжнє значення. Ще «Далі» — наступний вираз.',
    build(el) {
      let i = 0, open = false;
      const word = h('div', { class: 'ln-word' });
      const litBox = h('figure', { class: 'ln-side' }), realBox = h('figure', { class: 'ln-side real' });
      const lensBtn = h('button', { class: 'ln-btn', 'aria-label': 'Увімкнути золоту лінзу', onclick: () => reveal() }, h('img', { src: art('glasses'), alt: '' }), h('span', {}, 'натисни!'));
      const counter = h('div', { class: 'ln-n' });
      const paint = () => {
        const [w, a, b, mean] = LENS[i];
        word.textContent = '«' + w + '»';
        litBox.replaceChildren(sticker(cut(a), 'blue'), h('figcaption', { class: 'pill blue' }, 'Так подумав Буквалик'));
        realBox.replaceChildren(sticker(cut(b), 'gold'), h('figcaption', { class: 'pill gold' }, mean));
        realBox.classList.toggle('on', open); lensBtn.classList.toggle('used', open);
        counter.textContent = `${i + 1} / ${LENS.length}`;
      };
      const reveal = () => { if (open) return; open = true; praise(); paint(); if (i === LENS.length - 1) { battery.charge('lens', 10); $('#next').classList.add('pulse'); } };
      el.append(h('div', { class: 'body' }, h('div', { class: 'ln-top' }, header('Що бачить Буквалик — і що насправді?', 'Окуляри Буквалика'), counter), word, h('div', { class: 'ln' }, litBox, lensBtn, realBox)));
      paint();
      return {
        next() { if (!open) { reveal(); return true; } if (i < LENS.length - 1) { i++; open = false; paint(); return true; } return false; },
        prev() { if (open) { open = false; paint(); return true; } if (i > 0) { i--; open = true; paint(); return true; } return false; },
        progress: () => [i, LENS.length]
      };
    } });

  // 9. Фізхвилинка «Робот-танець» (P01–P08)
  const DANCE = shuffle([
    ['дитина плаче', 0], ['вітер плаче', 1], ['гострий ніж', 0], ['гостре око', 1],
    ['кам’яна стіна', 0], ['кам’яне серце', 1], ['золотий перстень', 0], ['золоте сонце', 1]]);
  add({ stage: 'play', title: 'Фізхвилинка', bg: 'img/bg/paper.webp',
    tip: 'Діти встають. Ви читаєте вираз уголос. Пряме значення — крокуємо, як робот. Переносне — махаємо крилами, як Сова. Після руху «Далі» показує правильну відповідь, ще одне «Далі» — наступний вираз.',
    build(el) {
      let i = -1, shown = false;
      const word = h('div', { class: 'dn-word paper' }, 'Робот-танець!');
      const ans = h('div', { class: 'dn-ans' });
      const legend = h('div', { class: 'dn-legend' },
        h('div', { class: 'blue' }, h('img', { src: ch('bukvalyk'), alt: '' }), h('b', {}, 'Пряме'), h('span', {}, 'крокуємо, як робот')),
        h('div', { class: 'gold' }, h('img', { src: ch('sova'), alt: '' }), h('b', {}, 'Переносне'), h('span', {}, 'махаємо крилами')));
      el.append(h('div', { class: 'body' }, header('Робот-танець', 'Фізхвилинка'), h('div', { class: 'dn' }, word, ans), legend));
      const paint = () => {
        if (i < 0) { word.textContent = 'Робот-танець!'; ans.textContent = ''; ans.className = 'dn-ans'; return; }
        word.textContent = DANCE[i][0];
        ans.className = 'dn-ans' + (shown ? (DANCE[i][1] ? ' gold on' : ' blue on') : '');
        ans.textContent = shown ? (DANCE[i][1] ? 'Переносне — махаємо крилами!' : 'Пряме — крокуємо, як робот!') : '';
      };
      paint();
      return {
        next() {
          if (i < 0) { i = 0; shown = false; once('bf_01'); paint(); return true; }
          if (!shown) { shown = true; paint(); if (i === DANCE.length - 1) { battery.charge('dance', 10); $('#next').classList.add('pulse'); } return true; }
          if (i < DANCE.length - 1) { i++; shown = false; paint(); return true; }
          return false;
        },
        prev() { if (shown) { shown = false; paint(); return true; } if (i > 0) { i--; shown = true; paint(); return true; } if (i === 0) { i = -1; paint(); return true; } return false; },
        progress: () => [Math.max(0, i), DANCE.length]
      };
    } });

  // 10. «Розсортуй у кошики» — перетягування або «торкни картку → торкни кошик»
  const SORT = [
    ['залізний цвях', 0], ['залізний характер', 1], ['тепла шапка', 0], ['теплі слова', 1], ['хлопчик біжить', 0],
    ['час біжить', 1], ['шапка на голові', 0], ['шапка снігу', 1], ['золотий ланцюжок', 0], ['золота осінь', 1]];
  add({ stage: 'play', title: 'Розсортуй у кошики', bg: 'img/bg/paper.webp',
    tip: 'Діти по черзі виходять до дошки й перетягують картку в кошик (або торкаються картки, а потім кошика). Правильна картка залишається в кошику, неправильна повертається — Буквалик підкаже: «Перевірте сусідів слова!»',
    build(el) {
      let left = SORT.length, sel = null;
      const baskets = [0, 1].map(k => h('div', { class: 'bk ' + (k ? 'gold' : 'blue'), 'data-k': k },
        h('div', { class: 'bk-h' }, h('img', { src: ch(k ? 'sova' : 'bukvalyk'), alt: '' }), k ? 'Переносне значення' : 'Пряме значення'), h('div', { class: 'bk-in' })));
      const pile = h('div', { class: 'pile' });
      const drop = (chip, k) => {
        if (+chip.dataset.k === k) {
          baskets[k].querySelector('.bk-in').append(chip); chip.classList.add('ok'); chip.classList.remove('sel'); praise();
          if (--left === 0) { battery.charge('sort', 10); confetti(el); $('#next').classList.add('pulse'); }
        } else { chip.classList.remove('shake'); void chip.offsetWidth; chip.classList.add('shake'); hint(); }
        sel = null; pile.querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
      };
      shuffle(SORT.slice()).forEach(([t, k]) => {
        const chip = h('div', { class: 'chip paper', 'data-k': k }, t);
        chip.addEventListener('pointerdown', e => {
          if (chip.classList.contains('ok')) return;
          e.preventDefault();
          const sc = stageScale(), r0 = chip.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
          let moved = false;
          chip.setPointerCapture(e.pointerId);
          const mv = ev => { const dx = (ev.clientX - x0) / sc, dy = (ev.clientY - y0) / sc; if (Math.abs(dx) + Math.abs(dy) > 8) moved = true; chip.style.transform = `translate(${dx}px,${dy}px) rotate(-3deg)`; chip.classList.add('drag'); };
          const up = ev => {
            chip.removeEventListener('pointermove', mv); chip.removeEventListener('pointerup', up);
            chip.style.transform = ''; chip.classList.remove('drag');
            if (!moved) { sel = sel === chip ? null : chip; pile.querySelectorAll('.chip').forEach(c => c.classList.toggle('sel', c === sel)); return; }
            const hit = baskets.find(b => { const r = b.getBoundingClientRect(); return ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom; });
            if (hit) drop(chip, +hit.dataset.k);
          };
          chip.addEventListener('pointermove', mv); chip.addEventListener('pointerup', up);
        });
        pile.append(chip);
      });
      baskets.forEach(b => b.addEventListener('click', () => { if (sel) drop(sel, +b.dataset.k); }));
      el.append(h('div', { class: 'body' }, header('Розклади вирази по кошиках', 'Гра'), h('div', { class: 'sort' }, baskets[0], pile, baskets[1])));
    } });

  // 11. Знайди слова в переносному значенні (запасна вправа замість підручника). P02, P06, P07, P04
  const TEXT = [['Час ', 0], ['біжить', 1], [' дуже швидко. Вітер жалібно ', 0], ['плаче', 1], [' в димарі. У бабусі ', 0], ['золоте', 1],
    [' серце. Тато забив ', 0], ['залізний', 2], [' цвях. Мама дарує ', 0], ['теплу', 1], [' усмішку.', 0]];
  add({ stage: 'play', title: 'Слова-перевертні в тексті', bg: 'img/bg/paper.webp',
    tip: 'Якщо працюєте за підручником — виконайте вправу з нього, а цей екран пропустіть. Тут діти знаходять слова в переносному значенні: торкніться слова — воно засвітиться золотим (правильно) або Буквалик підкаже. Пастка: «залізний цвях» — пряме значення!',
    build(el) {
      let found = 0; const need = TEXT.filter(t => t[1] === 1).length;
      const p = h('p', { class: 'tx paper' }, TEXT.map(([t, k]) => k ? h('button', { class: 'w', onclick: e => {
        const b = e.currentTarget; if (b.classList.contains('ok')) return;
        if (k === 1) { b.classList.add('ok'); praise(); if (++found === need) { battery.charge('text', 10); $('#next').classList.add('pulse'); } }
        else { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); hint(); }
      } }, t) : t));
      el.append(h('div', { class: 'body' }, header('Знайди 4 слова в переносному значенні', 'Читаємо уважно'), p,
        h('div', { class: 'tx-note' }, 'Торкнися слова. Не поспішай: подивись на його сусідів!')));
    } });

  // 12. «Знайди пару» — робота в парах із картками (таймер)
  add({ stage: 'play', title: 'Знайди пару', bg: 'img/bg/paper.webp',
    tip: 'Роздайте картки «Знайди пару» (рівні А/Б/В — у роздатці). Пара складає однакові слова: пряме значення + переносне. Запустіть таймер на 4 хвилини. Після сигналу 2–3 пари зачитують свої вирази — і батарейка заряджається.',
    build(el) {
      let t = 240, iv = null;
      const face = h('div', { class: 'tm-face' }, '4:00');
      const paint = () => { face.textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
      const start = h('button', { class: 'tm-go', onclick: () => {
        if (iv) { clearInterval(iv); iv = null; start.textContent = 'Далі ▶'; return; }
        start.textContent = 'Пауза';
        iv = setInterval(() => { t--; paint(); if (t <= 0) { clearInterval(iv); iv = null; start.textContent = 'Час!'; battery.charge('pairs', 10); praise(true); $('#next').classList.add('pulse'); } }, 1000);
      } }, 'Старт ▶');
      const done = h('button', { class: 'tm-done', onclick: () => { battery.charge('pairs', 10); praise(); } }, 'Ми впоралися!');
      const sample = h('div', { class: 'pr-sample' },
        h('div', { class: 'pc blue paper' }, 'залізний ', h('b', {}, 'цвях')), h('span', { class: 'pr-plus' }, '+'),
        h('div', { class: 'pc gold paper' }, 'залізний ', h('b', {}, 'характер')));
      el.append(h('div', { class: 'body' }, header('Знайди пару', 'Працюємо в парах'),
        h('div', { class: 'pr' }, h('div', { class: 'pr-how paper' }, h('h3', {}, 'Як грати'),
          h('ol', {}, h('li', {}, 'Розкладіть картки текстом догори.'), h('li', {}, 'Знайдіть два вирази з однаковим словом.'), h('li', {}, 'Синя картка — пряме значення, золота — переносне.'), h('li', {}, 'Прочитайте пару вголос.')), sample),
          h('div', { class: 'timer paper' }, face, h('div', { class: 'row' }, start, done)))));
      return { leave() { if (iv) { clearInterval(iv); iv = null; start.textContent = 'Далі ▶'; } } };
    } });

  // 13. Оживи природу (P13 — «так кажуть у віршах і казках»)
  const NATURE = [['сонце', 'Сонце всміхається дітям.'], ['вітер', 'Вітер плаче за вікном.'], ['струмок', 'Струмок біжить до річки.'], ['ліс', 'Ліс спить під снігом.']];
  add({ stage: 'create', title: 'Оживи природу', bg: 'img/bg/sky.webp',
    tip: 'Діти складають усно речення: природа «робить» те, що роблять люди. Так кажуть у віршах і казках — це переносне значення. Торкніться картки, щоб показати приклад. Банк слів унизу допомагає слабшим учням.',
    build(el) {
      let opened = 0;
      const PIC = { сонце: 'n_sontse', вітер: 'lit_viter', струмок: 'lit_strumok', ліс: 'pr_snih' };
      const cards = NATURE.map(([w, ex]) => h('button', { class: 'nat paper', onclick: e => {
        const c = e.currentTarget; if (c.classList.contains('on')) return; c.classList.add('on'); praise();
        if (++opened === NATURE.length) battery.charge('nature', 10);
      } }, sticker(cut(PIC[w]), 'gold', 'xs'), h('div', {}, h('b', {}, w[0].toUpperCase() + w.slice(1) + '…'), h('span', {}, ex))));
      el.append(h('div', { class: 'body' }, header('Оживи природу!', 'Творча хвилинка'),
        h('div', { class: 'nat-grid' }, cards),
        h('div', { class: 'bank' }, h('b', {}, 'Банк слів:'), ['всміхається', 'плаче', 'біжить', 'спить', 'шепоче', 'співає'].map(w => h('span', {}, w)))));
      return { enter() { once('bt_01'); } };
    } });

  // 14. Квіз «Пряме чи переносне?» — весь клас відповідає разом
  const QUIZ = [['гостре око', 1], ['кам’яна стіна', 0], ['час біжить', 1], ['тепла шапка', 0], ['золоте серце', 1], ['вітер плаче', 1]];
  add({ stage: 'create', title: 'Квіз', bg: 'img/bg/paper.webp',
    tip: 'Клас відповідає хором або піднімає синю чи жовту картку. Ви натискаєте кнопку з відповіддю класу — Буквалик скаже, чи правильно. «Далі» — наступне питання. Наприкінці видно, скільки правильних відповідей.',
    build(el) {
      let i = 0, ok = 0, answered = false;
      const word = h('div', { class: 'qz-word' });
      const fb = h('div', { class: 'qz-fb' });
      const score = h('div', { class: 'ln-n' });
      const btns = [0, 1].map(k => h('button', { class: 'qz-btn ' + (k ? 'gold' : 'blue'), onclick: () => answer(k) },
        h('img', { src: ch(k ? 'sova' : 'bukvalyk'), alt: '' }), k ? 'Переносне' : 'Пряме'));
      const box = h('div', { class: 'qz' }, word, h('div', { class: 'qz-row' }, btns), fb);
      const final = h('div', { class: 'qz-final paper' });
      final.hidden = true;
      const paint = () => {
        if (i >= QUIZ.length) {
          box.hidden = true; final.hidden = false; score.textContent = '';
          final.replaceChildren(h('img', { src: ch('bukvalyk'), alt: '' }), h('div', {}, h('h3', {}, `${ok} з ${QUIZ.length}!`),
            h('p', {}, ok >= QUIZ.length - 1 ? 'Чудово! Ви справжні знавці переносного значення.' : 'Добре! Ще трохи — і окуляри працюватимуть ідеально.')));
          return;
        }
        box.hidden = false; final.hidden = true;
        word.textContent = '«' + QUIZ[i][0] + '»'; fb.textContent = ''; fb.className = 'qz-fb'; answered = false;
        btns.forEach(b => b.classList.remove('right', 'wrong', 'dim'));
        score.textContent = `${i + 1} / ${QUIZ.length}`;
      };
      const answer = k => {
        if (answered) return; answered = true;
        const right = QUIZ[i][1] === k;
        if (right) { ok++; praise(); } else hint();
        btns[QUIZ[i][1]].classList.add('right'); if (!right) btns[k].classList.add('wrong'); else btns[1 - k].classList.add('dim');
        fb.textContent = right ? 'Правильно!' : (QUIZ[i][1] ? 'Ні — це переносне значення.' : 'Ні — це пряме значення.');
        fb.className = 'qz-fb ' + (right ? 'ok' : 'no');
        if (i === QUIZ.length - 1) battery.charge('quiz', 10);
      };
      el.append(h('div', { class: 'body' }, h('div', { class: 'ln-top' }, header('Пряме чи переносне?', 'Квіз для всього класу'), score), box, final));
      paint();
      return {
        next() { if (i < QUIZ.length) { if (!answered) return true; i++; paint(); if (i >= QUIZ.length) { confetti(el); $('#next').classList.add('pulse'); } return true; } return false; },
        prev() { if (i > 0) { i--; paint(); return true; } return false; },
        progress: () => [Math.min(i, QUIZ.length - 1), QUIZ.length]
      };
    } });

  video(3, 'Перезавантаження', 'refl', 'Мультик заряджає батарейку до кінця. Після нього — рефлексія.', 'class');

  // 15. Рефлексія «Моя батарейка»
  add({ stage: 'refl', title: 'Моя батарейка', bg: 'img/bg/paper.webp',
    tip: 'Діти показують на картці рефлексії (або піднімають руку), наскільки зарядилася їхня «батарейка розуміння». Порахуйте голоси кнопкою «+». Наостанок — домашнє завдання.',
    build(el) {
      const lv = [['full', 'Повна!', 'Я все зрозумів і можу пояснити іншим'], ['half', 'Наполовину', 'Розумію, але ще плутаюся'], ['low', 'Трошки', 'Мені потрібна допомога']];
      const cards = lv.map(([k, t, d]) => { const n = h('b', {}, '0'); let c = 0;
        return h('div', { class: 'choice paper' }, h('div', { class: 'mb ' + k }, h('i')), h('h3', {}, t), h('p', { class: 'why' }, d),
          h('div', { class: 'cnt' }, h('button', { onclick: () => { c = Math.max(0, c - 1); n.textContent = c; } }, '−'), n, h('button', { onclick: () => { c++; n.textContent = c; } }, '+'))); });
      el.append(h('div', { class: 'body' }, header('Як заряджена твоя батарейка?', 'Рефлексія'), h('div', { class: 'choices' }, cards)));
      return { enter() { if (battery.level() >= 100) confetti(el); } };
    } });

  // 16. Домашнє завдання
  add({ stage: 'refl', title: 'Домашнє завдання', bg: 'img/bg/paper.webp',
    tip: 'Завдання на вибір. Малюнки «як зрозумів би Буквалик» можна зібрати на виставку в класі.',
    build(el) {
      el.append(h('div', { class: 'body' }, header('Домашнє завдання — на вибір', 'Удома'),
        h('div', { class: 'hw' },
          h('div', { class: 'hw-c paper' }, h('span', { class: 'letter' }, 'А'), h('h3', {}, 'Склади 2 речення'), h('p', {}, 'зі словом «золотий»: одне — у прямому значенні, друге — у переносному.')),
          h('div', { class: 'hw-c paper' }, h('span', { class: 'letter' }, 'Б'), h('h3', {}, 'Намалюй Буквалика'), h('p', {}, 'Як би він зрозумів вираз «струмок біжить» або «теплі слова»? Підпиши малюнок.'))),
        h('img', { class: 'bye', src: ch('bukvalyk'), alt: '' })));
    } });

  // ------------------------------------------------------------ рушій
  const SG = STAGES.filter(([id]) => S.some(s => s.stage === id)).map(([id, t]) => [id, STAGE_NAME[id] || t]);
  const stage = $('#stage');
  let cur = -1, step = 0, api = {};
  // підказка вчителю за замовчуванням схована: урок транслюють класу. Лампочка вмикає її, вибір пам'ятаємо на пристрої
  let tipOn = false;
  try { tipOn = localStorage.getItem('perenosne_tip') === '1'; } catch (e) {}
  const stageScale = () => Math.min(innerWidth / 1920, innerHeight / 1080);
  const fit = () => { stage.style.transform = `translate(-50%,-50%) scale(${stageScale()})`; };

  // каркас
  const stagesEl = h('div', { class: 'stages' }, SG.map(([id, t], i) => h('button', { class: 'stage', 'data-st': id, onclick: () => go(S.findIndex(s => s.stage === id)) }, h('span', { class: 'n' }, String(i + 1)), t)));
  const offline = location.protocol === 'file:';
  const homeBtn = offline ? null : h('a', { class: 'tb-btn', href: '../../../app/#/pack/perenosne', html: ICON.home + 'До набору' });
  const tipBtn = h('button', { class: 'tb-btn' + (tipOn ? ' on' : ''), title: 'Підказка вчителю (T)', 'aria-label': 'Підказка вчителю', html: ICON.tip, onclick: () => toggleTip() });
  const toggleTip = () => { tipOn = !tipOn; tipBtn.classList.toggle('on', tipOn); tipEl.classList.toggle('hide', !tipOn); try { localStorage.setItem('perenosne_tip', tipOn ? '1' : '0'); } catch (e) {} };
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
  stage.append(battery.el);

  const scenes = S.map((s, i) => {
    const el = h('section', { class: 'scene ' + (s.cls || '') }, h('div', { class: 'bg ' + (s.bgcls || ''), style: { backgroundImage: `url(${s.bg})` } }));
    stage.insertBefore(el, stage.querySelector('.topbar'));
    return el;
  });
  const built = [];

  function paintChrome() {
    const s = S[cur];
    const si = SG.findIndex(x => x[0] === s.stage);
    [...stagesEl.children].forEach((b, i) => { b.classList.toggle('now', i === si); b.classList.toggle('done', i < si); });
    tipEl.innerHTML = '<b>Вчителю</b>' + s.tip;
    const p = api.progress ? api.progress() : s.steps ? [step, s.steps + 1] : null;
    dots.replaceChildren(...(p && p[1] > 1 ? Array.from({ length: p[1] }, (_, k) => h('i', { class: k === p[0] ? 'on' : '' })) : []));
    nextBtn.querySelector('span').textContent = cur === S.length - 1 ? 'Кінець' : 'Далі';
    battery.el.style.visibility = cur === 0 ? 'hidden' : 'visible';
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
    if (api.enter) api.enter();
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
      ...SG.map(([id, t], si) => [h('h3', {}, `${si + 1}. ${t}`),
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
