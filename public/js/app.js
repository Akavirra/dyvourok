/* Дивоурок — застосунок. Екрани через hash-маршрути, щоб працювало і з диска (file://), і з сервера. */
(function () {
  const app = document.getElementById('app');
  const PACKS = window.DYVO_PACKS || [];
  const OFFLINE_FILE = location.protocol === 'file:';     // архів з диска: сервера немає, доступ повний
  const DEMO_STOPS = ['shevchenko'];                        // що можна пройти без коду
  const CONTACT = 'info@dyvourok.com.ua';

  // ---------------------------------------------------------------- утиліти
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function shuffledNot(arr) { if (arr.length < 2) return arr.slice(); let s; do { s = shuffle(arr); } while (s.every((v, i) => v === arr[i])); return s; }
  // векторні іконки замість емодзі: на частині шкільних дошок кольорових емодзі немає
  const ICONS = {
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    board: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 10h8M8 14h8M8 18h5"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    play: '<circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4z" fill="currentColor"/>',
    wait: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
    doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>'
  };
  const icon = (name, size) => h('span', { class: 'svg-ico', 'aria-hidden': 'true', html:
    `<svg viewBox="0 0 24 24" width="${size || '1em'}" height="${size || '1em'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>` });
  const go = path => { location.hash = path; };
  const asset = (pack, p) => pack.base + p;
  function toast(msg) { const t = h('div', { class: 'toast' }, msg); document.body.append(t); setTimeout(() => t.remove(), 2200); }
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); Sfx.wrong(); }

  const progress = {
    get(pack) { return store.get('dyvo_progress_' + pack.id, {}); },
    done(pack, stopId) { const p = progress.get(pack); p[stopId] = true; store.set('dyvo_progress_' + pack.id, p); },
    reset(pack) { store.set('dyvo_progress_' + pack.id, {}); }
  };
  // ---------------------------------------------------------------- доступ
  // Ліцензія: {note, packs, exp, checked} — копія того, що сервер записав у HttpOnly-кукі сесії.
  const license = {
    get() {
      if (OFFLINE_FILE) return { note: 'Офлайн-версія', packs: '*', exp: Infinity };
      const l = store.get('dyvo_lic', null);
      return l && l.exp > Date.now() ? l : null;
    },
    set(l) { store.set('dyvo_lic', { ...l, checked: Date.now() }); store.set('dyvo_demo', false); },
    clear() { try { localStorage.removeItem('dyvo_lic'); } catch (e) {} },
    allows(packId) { const l = license.get(); return !!l && (l.packs === '*' || l.packs.split(',').includes(packId)); }
  };
  const isDemo = () => !license.get() && store.get('dyvo_demo', false);
  const hasAccess = () => !!license.get() || isDemo();
  const canOpen = (pack, stopId) => license.allows(pack.id) || DEMO_STOPS.includes(stopId);

  function deviceId() {
    let id = store.get('dyvo_device', null);
    if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)); store.set('dyvo_device', id); }
    return id;
  }
  function deviceLabel() {
    const ua = navigator.userAgent;
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Пристрій';
    const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return `${os} ${br}`.trim();
  }
  async function api(path, method, body) {
    const res = await fetch(path, { method, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok, status: res.status, data };
  }
  // раз на добу перевіряємо, що код не заблоковано (без інтернету — працюємо до кінця сесії)
  async function refreshLicense() {
    const l = license.get();
    if (OFFLINE_FILE || !l || !navigator.onLine || Date.now() - (l.checked || 0) < 864e5) return;
    try {
      const r = await api('/api/session', 'POST');
      if (r.ok) license.set(r.data);
      else if (r.status === 401) { license.clear(); toast('Доступ на цьому пристрої завершено. Введіть код ще раз.'); route(); }
    } catch (e) {}
  }
  const mailLink = () => h('a', { class: 'mail', href: 'mailto:' + CONTACT }, CONTACT);
  const contactLine = (lead = 'Питання чи проблеми з доступом? Пишіть на ') => h('p', { class: 'muted contact' }, lead, mailLink());
  const buyHint = () => h('div', {}, h('p', { class: 'muted' }, 'Код доступу надходить на пошту одразу після покупки.'), contactLine('Питання? Пишіть на '));
  function lockedDialog() {
    Sfx.wrong();
    const r = h('div', { class: 'reward', role: 'dialog', 'aria-label': 'Потрібен доступ' },
      h('div', { class: 'card pop' },
        h('div', { class: 'kicker' }, 'Демо-версія'),
        h('span', { style: 'font-size:64px;color:var(--red)' }, icon('lock')),
        h('h2', {}, 'Ця частина відкривається з кодом доступу'),
        h('p', {}, 'У демо можна пройти зупинку «Тарас Шевченко». Повний набір — 5 епох, мультфільми, роздатка і сценарій уроку.'),
        h('button', { class: 'btn big', onclick: () => { r.remove(); store.set('dyvo_demo', false); route(); } }, 'Ввести код'),
        h('button', { class: 'btn ghost', onclick: () => r.remove() }, 'Повернутися'),
        contactLine('Як придбати: ')));
    document.body.append(r);
  }

  // ---------------------------------------------------------------- каркас
  function frame(crumbs, body) {
    const soundBtn = h('button', { class: 'icon-btn', title: 'Звук', 'aria-label': 'Увімкнути або вимкнути звук', onclick: () => { soundBtn.replaceChildren(icon(Sfx.toggle() ? 'sound' : 'mute')); } }, icon(Sfx.on ? 'sound' : 'mute'));
    const fsBtn = h('button', { class: 'icon-btn', title: 'На весь екран', 'aria-label': 'На весь екран', onclick: () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
    } }, icon('full'));
    const userBtn = hasAccess() ? h('button', { class: 'icon-btn', title: 'Доступ', 'aria-label': 'Доступ і вихід', onclick: () => go('#/account') }, icon('user')) : null;
    const top = h('header', { class: 'topbar' },
      h('img', { class: 'logo', src: 'brand/dyvourok-logo.svg', alt: 'Дивоурок', onclick: () => go('#/library') }),
      h('div', { class: 'crumb' }, crumbs),
      h('div', { class: 'spacer' }),
      isDemo() ? h('button', { class: 'btn', style: 'padding:10px 18px;font-size:.85em', onclick: () => { store.set('dyvo_demo', false); route(); } }, 'Ввести код') : null,
      userBtn, soundBtn, fsBtn);
    app.replaceChildren(top, h('main', { class: 'screen' }, body));
  }

  // ---------------------------------------------------------------- заставка
  function splash(next) {
    const canvas = h('canvas', { 'aria-hidden': 'true' });
    const word = h('div', { class: 'word' }, 'Дивоурок');
    const tap = h('div', { class: 'tap' }, 'Натисніть, щоб почати');
    const el = h('div', { class: 'splash', role: 'button', tabindex: '0', 'aria-label': 'Почати' }, canvas, word, tap);
    document.body.append(el);
    let ready = false;
    DyvoStar.playBloom(canvas, () => { word.classList.add('show'); setTimeout(() => { tap.classList.add('show'); ready = true; }, 450); });
    const start = () => {
      if (!ready) return;
      Sfx.unlock(); Sfx.bloom();
      el.classList.add('hide');
      setTimeout(() => el.remove(), 500);
      next();
    };
    el.addEventListener('click', start);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') start(); });
  }

  // ---------------------------------------------------------------- вхід за кодом
  function gate() {
    const input = h('input', { id: 'code', placeholder: 'КОД ДОСТУПУ', autocomplete: 'off', 'aria-label': 'Код доступу' });
    const err = h('div', { class: 'err', role: 'status' });
    const MESSAGES = {
      invalid: 'Такого коду немає. Перевірте, чи немає помилки.',
      revoked: `Цей код заблоковано. Напишіть нам на ${CONTACT} — розберемося.`,
      expired: `Термін дії коду завершився. Щоб продовжити, напишіть на ${CONTACT}.`,
      devices: `Код уже активовано на максимальній кількості пристроїв. Вийдіть з нього на одному з них або напишіть на ${CONTACT}.`
    };
    const btn = h('button', { class: 'btn big', onclick: () => submit() }, 'Увійти');
    async function submit() {
      err.textContent = '';
      btn.disabled = true;
      try {
        const r = await api('/api/activate', 'POST', { code: input.value, deviceId: deviceId(), label: deviceLabel() });
        if (r.ok) { license.set(r.data); Sfx.right(); go('#/library'); route(); return; }
        err.textContent = MESSAGES[r.data.error] || 'Не вдалося перевірити код. Спробуйте ще раз.';
        shake(input);
      } catch (e) {
        err.textContent = 'Немає зв\'язку з сервером. Для першого входу потрібен інтернет.';
      } finally { btn.disabled = false; }
    }
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    frame('Вхід', h('div', { class: 'gate' },
      h('img', { src: 'brand/dyvourok-mark.svg', alt: '', style: 'width:120px' }),
      h('h1', {}, 'Вітаємо в «Дивоуроці»!'),
      h('p', { class: 'lead' }, 'Введіть код доступу, який ви отримали після покупки.'),
      input, err, btn,
      h('button', { class: 'btn ghost', onclick: () => { store.set('dyvo_demo', true); Sfx.tap(); go('#/library'); route(); } }, 'Спробувати безкоштовно'),
      buyHint()));
    setTimeout(() => input.focus(), 50);
  }

  // ---------------------------------------------------------------- бібліотека
  function library() {
    const cards = PACKS.map(p => h('button', { class: 'pack-card', onclick: () => { Sfx.tap(); go('#/pack/' + p.id); } },
      h('div', { class: 'cover' }, h('span', { class: 'date' }, p.date), h('img', { src: asset(p, p.cover), alt: '' })),
      h('div', { class: 'body' }, h('h3', {}, p.title), h('div', { class: 'muted' }, p.subtitle))));
    const soon = ['Новий рік і Різдво', 'Шевченківські дні', 'Весна і Великдень'].map(t => h('div', { class: 'pack-card soon' },
      h('div', { class: 'cover' }, 'Незабаром'), h('div', { class: 'body' }, h('h3', {}, t))));
    frame(h('b', {}, 'Бібліотека'), [
      h('div', { class: 'kicker' }, 'Ваші набори'),
      h('h1', {}, 'Що будемо дивувати сьогодні?'),
      h('div', { class: 'shelf' }, cards, soon)]);
  }

  // ---------------------------------------------------------------- набір
  function packHome(pack) {
    const done = Object.keys(progress.get(pack)).length;
    const item = (ico, title, note, path, main) => h('button', { class: 'menu-item' + (main ? ' main' : ''), onclick: () => { Sfx.tap(); go(path); } },
      h('div', { class: 'ico' }, icon(ico)), h('h3', {}, title), h('div', { class: 'muted' }, note));
    frame([pack.title], [
      h('div', { class: 'pack-head' },
        h('div', { class: 'kicker' }, pack.subtitle),
        h('h1', {}, pack.title)),
      h('div', { class: 'menu' },
        item('clock', 'Машина часу', done ? `Пройдено ${done} з ${pack.stops.length} зупинок — продовжити` : 'Інтерактивна подорож для дошки: 5 епох, 5 завдань, одне слово', `#/pack/${pack.id}/map`, true),
        item('film', 'Мультфільми', 'Класики розповідають про себе', `#/pack/${pack.id}/cartoons`),
        item('print', 'Роздатка', 'Робочі аркуші, плакати, грамоти для друку', `#/pack/${pack.id}/handouts`),
        item('board', 'Для вчителя', 'Сценарій на 45 хвилин і відповіді', `#/pack/${pack.id}/teacher`))]);
  }

  function letterBar(pack) {
    const prog = progress.get(pack);
    return h('div', { class: 'letters' }, h('span', { class: 'lbl' }, 'Зібрані букви:'),
      pack.stops.map(s => h('div', { class: 'slot' + (prog[s.id] ? ' on' : '') }, prog[s.id] ? s.letter : '')));
  }

  function medal(pack, s) {
    return s.portrait ? h('img', { src: asset(pack, s.portrait), alt: '' }) : h('span', { class: 'ph', 'aria-hidden': 'true' }, '✦');
  }

  function map(pack) {
    const prog = progress.get(pack);
    const all = pack.stops.every(s => prog[s.id]);
    const stops = pack.stops.map((s, i) => h('button', { class: 'stop' + (prog[s.id] ? ' done' : '') + (canOpen(pack, s.id) ? '' : ' closed'), onclick: () => {
      if (!canOpen(pack, s.id)) return lockedDialog();
      Sfx.pick(i); go(`#/pack/${pack.id}/stop/${s.id}`);
    } },
      h('div', { class: 'medal' }, medal(pack, s)),
      prog[s.id] ? h('div', { class: 'badge' }, s.letter) : null,
      canOpen(pack, s.id) ? null : h('div', { class: 'badge lock' }, icon('lock')),
      h('div', { class: 'year' }, s.year),
      h('div', { class: 'who' }, s.who)));
    const fin = h('button', { class: 'stop final' + (all ? '' : ' locked'), onclick: () => { if (!license.allows(pack.id)) return lockedDialog(); if (all) { Sfx.pick(5); go(`#/pack/${pack.id}/final`); } else { toast('Спершу пройдіть усі зупинки'); Sfx.wrong(); } } },
      h('div', { class: 'medal' }, all ? chestSvg(false) : h('span', { class: 'ph' }, icon('lock'))),
      h('div', { class: 'year' }, 'Сьогодні'),
      h('div', { class: 'who' }, 'Скриня зі словом'));
    frame([pack.title, ' · ', h('b', {}, 'Машина часу')], h('div', { class: 'map-wrap' },
      h('div', {}, h('div', { class: 'kicker' }, 'Обирайте епоху'), h('h2', {}, 'Машина часу рідної мови')),
      h('div', { class: 'timeline' }, stops, fin),
      letterBar(pack),
      h('div', { style: 'text-align:center' }, h('button', { class: 'btn ghost', onclick: () => { if (confirmReset.armed) { progress.reset(pack); route(); } else { confirmReset.armed = true; toast('Натисніть ще раз, щоб почати спочатку'); setTimeout(() => confirmReset.armed = false, 2500); } } }, '↺ Почати спочатку'))));
  }
  const confirmReset = { armed: false };

  // ---------------------------------------------------------------- зупинка
  function stop(pack, s) {
    const video = s.video
      ? h('div', { class: 'video-box' }, h('video', { src: asset(pack, s.video), poster: s.poster ? asset(pack, s.poster) : null, controls: true, playsinline: true, preload: 'metadata' }))
      : h('div', { class: 'video-box soon' }, h('div', { class: 'big' }, icon('film')), 'Мультфільм про цього героя з\'явиться незабаром', h('div', { class: 'muted' }, 'А поки прочитайте розповідь і виконайте завдання'));
    frame([pack.title, ' · ', h('b', {}, s.who)], [
      h('div', { class: 'stop-screen' },
        video,
        h('div', { class: 'stop-side' },
          h('div', {}, h('div', { class: 'kicker' }, s.year), h('h2', {}, s.who)),
          h('div', { class: 'speech' }, s.intro),
          h('button', { class: 'btn big', onclick: () => { Sfx.tap(); go(`#/pack/${pack.id}/task/${s.id}`); } }, 'До завдання →'),
          h('button', { class: 'btn ghost', onclick: () => go(`#/pack/${pack.id}/map`) }, '← До мапи')))]);
  }

  function taskScreen(pack, s) {
    const solved = () => {
      Sfx.letter();
      progress.done(pack, s.id);
      const r = h('div', { class: 'reward', role: 'dialog', 'aria-label': 'Нагорода' },
        h('div', { class: 'card pop' },
          h('div', { class: 'kicker' }, 'Молодці!'),
          h('div', { class: 'big-letter' }, s.letter),
          h('h2', {}, `Ви отримали букву «${s.letter}»`),
          h('button', { class: 'btn big', onclick: () => { r.remove(); go(`#/pack/${pack.id}/map`); } }, 'До мапи')));
      document.body.append(r);
      const rect = r.querySelector('.big-letter').getBoundingClientRect();
      DyvoStar.burst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    };
    const t = s.task;
    frame([pack.title, ' · ', s.who, ' · ', h('b', {}, t.title)], h('div', { class: 'task' },
      h('div', { class: 'kicker' }, s.who + ' · ' + s.year),
      h('h2', {}, t.title),
      h('p', { class: 'prompt' }, t.prompt),
      TASKS[t.type](t, solved),
      h('button', { class: 'btn ghost no-print', onclick: () => go(`#/pack/${pack.id}/stop/${s.id}`) }, '← Назад')));
  }

  // ---------------------------------------------------------------- типи завдань
  const TASKS = {
    // розшифрувати слово за ключем: натискати відповідні букви по черзі
    cipher(t, solved) {
      let i = 0;
      const glyphs = t.word.map(g => h('div', { class: 'g' }, g));
      const row = h('div', { class: 'answer-row' }, h('span', { class: 'ph' }, 'Натисніть першу букву'));
      const mark = () => glyphs.forEach((g, k) => g.classList.toggle('cur', k === i));
      mark();
      const keys = h('div', { class: 'keys' }, shuffle(t.key).map(([gl, cy]) => h('button', { class: 'key', onclick: e => {
        if (i >= t.answer.length) return;
        if (cy === t.answer[i]) {
          if (i === 0) row.replaceChildren();
          row.append(h('div', { class: 'ans pop' }, cy));
          Sfx.pick(i); i++; mark();
          if (i === t.answer.length) setTimeout(solved, 500);
        } else shake(e.currentTarget);
      } }, h('span', { class: 'gl' }, gl), '=', cy)));
      return h('div', { style: 'display:flex;flex-direction:column;gap:22px;align-items:center' }, h('div', { class: 'glag-word' }, glyphs), row, keys);
    },

    // розставити картки по порядку
    order(t, solved) {
      let i = 0;
      const row = h('div', { class: 'answer-row', style: 'flex-direction:column' }, h('span', { class: 'ph' }, 'Яка подія була найпершою?'));
      const chips = h('div', { class: 'chips' }, shuffledNot(t.items).map(txt => h('button', { class: 'chip wide', onclick: e => {
        if (txt === t.items[i]) {
          if (i === 0) row.replaceChildren();
          row.append(h('div', { class: 'ans num pop' }, `${i + 1}. ${txt}`));
          e.currentTarget.classList.add('picked'); Sfx.pick(i); i++;
          if (i === t.items.length) setTimeout(solved, 500);
        } else shake(e.currentTarget);
      } }, txt)));
      return h('div', { style: 'display:flex;flex-direction:column;gap:22px;align-items:center;width:100%' }, row, chips);
    },

    // зібрати рядки з розсипаних слів
    words(t, solved) {
      let round = 0;
      const box = h('div', { style: 'display:flex;flex-direction:column;gap:22px;align-items:center;width:100%' });
      const dots = h('div', { class: 'progress-dots' }, t.rounds.map(() => h('i')));
      function play() {
        dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k <= round));
        const line = t.rounds[round];
        let i = 0;
        const row = h('div', { class: 'answer-row' }, h('span', { class: 'ph' }, 'З якого слова починається рядок?'));
        const chips = h('div', { class: 'chips' }, shuffledNot(line).map(w => h('button', { class: 'chip', onclick: e => {
          if (w === line[i]) {
            if (i === 0) row.replaceChildren();
            row.append(h('div', { class: 'ans pop' }, w));
            e.currentTarget.classList.add('picked'); Sfx.pick(i); i++;
            if (i === line.length) {
              round++;
              setTimeout(() => round < t.rounds.length ? (Sfx.right(), play()) : solved(), 700);
            }
          } else shake(e.currentTarget);
        } }, w)));
        box.replaceChildren(dots, row, chips);
      }
      play();
      return box;
    },

    // знайти пари, що римуються
    pairs(t, solved) {
      let sel = null, found = 0;
      const partner = {};
      t.pairs.forEach(([a, b]) => { partner[a] = b; partner[b] = a; });
      const chips = h('div', { class: 'chips', style: 'max-width:900px' }, shuffle(t.pairs.flat()).map(w => h('button', { class: 'chip', onclick: e => {
        const el = e.currentTarget;
        if (!sel) { sel = el; el.classList.add('sel'); Sfx.tap(); return; }
        if (sel === el) { el.classList.remove('sel'); sel = null; return; }
        if (partner[sel.dataset.w] === w) {
          sel.classList.replace('sel', 'good'); el.classList.add('good');
          Sfx.pick(found); found++; sel = null;
          if (found === t.pairs.length) setTimeout(solved, 500);
        } else { shake(el); sel.classList.remove('sel'); sel = null; }
      }, 'data-w': w }, w)));
      return chips;
    },

    // вікторина з варіантами
    quiz(t, solved) {
      let q = 0;
      const box = h('div', { style: 'display:flex;flex-direction:column;gap:22px;align-items:center;width:100%' });
      const dots = h('div', { class: 'progress-dots' }, t.questions.map(() => h('i')));
      function ask() {
        dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k <= q));
        const cur = t.questions[q];
        box.replaceChildren(dots, h('div', { class: 'quiz-q' }, cur.q), h('div', { class: 'chips' }, cur.options.map((o, k) => h('button', { class: 'chip wide', onclick: e => {
          if (k === cur.a) {
            e.currentTarget.classList.add('good'); Sfx.right(); q++;
            setTimeout(() => q < t.questions.length ? ask() : solved(), 700);
          } else shake(e.currentTarget);
        } }, o))));
      }
      ask();
      return box;
    }
  };

  // ---------------------------------------------------------------- фінал
  function chestSvg(open) {
    // піксельна скриня 12×10; при відкритті кришка піднімається, всередині сяє зірка
    const R = '#C8341F', D = '#8E2414', Y = '#F2B530', I = '#2A1714';
    const rows = open ? [
      '..DDDDDDDD..', '.DRRRRRRRRD.', '.DRRRRRRRRD.', '............',
      '.DDDDDDDDDD.', 'DRRRRYYRRRRD', 'DRRRRYYRRRRD', 'DDDDDDDDDDDD', 'DRRRRRRRRRRD', 'DDDDDDDDDDDD'
    ] : [
      '............', '............', '..DDDDDDDD..', '.DRRRRRRRRD.', 'DDDDDDDDDDDD',
      'DRRRRYYRRRRD', 'DRRRRYYRRRRD', 'DDDDDDDDDDDD', 'DRRRRRRRRRRD', 'DDDDDDDDDDDD'
    ];
    const col = { R, D, Y, I };
    let s = '<svg viewBox="0 -3 12 13" class="chest" shape-rendering="crispEdges" aria-hidden="true">';
    rows.forEach((row, y) => [...row].forEach((c, x) => { if (col[c]) s += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col[c]}"/>`; }));
    if (open) [[5, 2], [6, 2], [5.5, 1], [5.5, 0], [4, 1.5], [7, 1.5], [5.5, -1.5], [2.5, 0], [8.5, 0]].forEach(([x, y], k) =>
      s += `<rect x="${x}" y="${y}" width="${k < 4 ? 1 : 0.6}" height="${k < 4 ? 1 : 0.6}" fill="${Y}"/>`);
    return h('div', { html: s + '</svg>' });
  }

  function final(pack) {
    const target = pack.word;
    let i = 0;
    const row = h('div', { class: 'answer-row' }, h('span', { class: 'ph' }, 'Складіть слово з букв, які ви зібрали'));
    const chest = h('div', {}, chestSvg(false));
    const letters = pack.stops.map(s => s.letter);
    const chips = h('div', { class: 'chips' }, shuffledNot(letters).map(l => h('button', { class: 'chip', style: 'font-size:2em;min-width:2.2em', onclick: e => {
      if (l === target[i]) {
        if (i === 0) row.replaceChildren();
        row.append(h('div', { class: 'ans pop', style: 'font-size:1.8em' }, l));
        e.currentTarget.classList.add('picked'); Sfx.pick(i); i++;
        if (i === target.length) setTimeout(openChest, 400);
      } else shake(e.currentTarget);
    } }, l)));
    const wrap = h('div', { class: 'final' },
      h('div', { class: 'kicker' }, 'Фінал'),
      h('h1', {}, 'Відкрийте скриню'),
      chest, row, chips);
    function openChest() {
      Sfx.win();
      chest.replaceChildren(chestSvg(true));
      const r = chest.getBoundingClientRect();
      DyvoStar.burst(r.left + r.width / 2, r.top + r.height / 3, 110);
      setTimeout(() => {
        wrap.replaceChildren(
          h('div', { class: 'diploma pop' },
            h('img', { src: 'brand/dyvourok-logo.svg', alt: 'Дивоурок', style: 'height:48px' }),
            h('div', { class: 'dtitle' }, 'ДИПЛОМ'),
            h('div', { class: 'lead' }, 'мандрівника в часі'),
            h('input', { id: 'diploma-name', placeholder: 'Ім\'я або назва класу', 'aria-label': 'Ім\'я' }),
            h('p', { class: 'lead' }, `за подорож від першої абетки до сьогодення та слово «${target}», яке ми зберегли разом`),
            h('div', { class: 'muted' }, `${pack.date} · День української писемності та мови`),
            h('div', { class: 'license-mark' }, 'Ліцензія: ' + ((license.get() || {}).note || 'Дивоурок'))),
          h('div', { class: 'chips no-print' },
            h('button', { class: 'btn', onclick: () => window.print() }, icon('print'), 'Надрукувати диплом'),
            h('button', { class: 'btn ghost', onclick: () => go(`#/pack/${pack.id}/map`) }, 'До мапи')));
      }, 1600);
    }
    frame([pack.title, ' · ', h('b', {}, 'Фінал')], wrap);
  }

  // ---------------------------------------------------------------- мультфільми, роздатка, вчитель
  function cartoons(pack) {
    const player = h('div', { class: 'player' });
    const list = h('div', { class: 'list' }, pack.cartoons.map(c => h('button', { class: 'row' + (c.ready ? '' : ' off'), onclick: () => {
      if (!c.ready) { toast('Цей мультфільм ще в роботі'); return; }
      if (!license.allows(pack.id) && !c.demo) return lockedDialog();
      Sfx.tap();
      player.replaceChildren(h('h3', {}, c.title), h('video', { src: asset(pack, c.file), controls: true, autoplay: true, playsinline: true }));
      player.scrollIntoView({ behavior: 'smooth' });
    } }, h('span', { style: 'font-size:1.8em;color:var(--red)' }, icon(c.ready ? 'play' : 'wait')), h('div', { class: 'grow' }, h('h3', {}, c.title), h('div', { class: 'muted' }, c.ready ? 'Дивитися' : 'Незабаром')))));
    frame([pack.title, ' · ', h('b', {}, 'Мультфільми')], [h('h2', {}, 'Мультфільми'), list, player]);
  }

  function handouts(pack) {
    if (!license.allows(pack.id)) { lockedDialog(); return packHome(pack); }
    frame([pack.title, ' · ', h('b', {}, 'Роздатка')], [
      h('h2', {}, 'Роздатка для друку'),
      h('div', { class: 'list' }, pack.handouts.map(d => h('a', { class: 'row', href: asset(pack, d.file), target: '_blank', rel: 'noopener' },
        h('span', { style: 'font-size:1.8em;color:var(--red)' }, icon('doc')),
        h('div', { class: 'grow' }, h('h3', {}, d.title), h('div', { class: 'muted' }, d.note)),
        h('span', { class: 'btn' }, 'Відкрити'))))]);
  }

  function teacher(pack) {
    if (!license.allows(pack.id)) { lockedDialog(); return packHome(pack); }
    const t = pack.teacher;
    frame([pack.title, ' · ', h('b', {}, 'Для вчителя')], [
      h('h2', {}, 'Сценарій заходу на 45 хвилин'),
      h('div', { class: 'teacher' },
        h('div', { class: 'card-soft' }, h('table', { class: 'plan' }, t.minutes.map(([m, txt]) => h('tr', {}, h('td', {}, m), h('td', {}, txt))))),
        h('div', { style: 'display:flex;flex-direction:column;gap:22px' },
          h('div', { class: 'card-soft' }, h('h3', {}, 'Поради'), h('ul', { class: 'clean' }, t.tips.map(x => h('li', {}, x)))),
          h('div', { class: 'card-soft' }, h('h3', {}, 'Відповіді'), h('ul', { class: 'clean' }, t.answers.map(x => h('li', {}, x))))))]);
  }

  function account() {
    const l = license.get();
    frame(h('b', {}, 'Доступ'), h('div', { class: 'gate' },
      h('h1', {}, l ? 'Ваш доступ' : 'Демо-режим'),
      l ? h('div', { class: 'card-soft', style: 'width:100%;text-align:left' },
        h('div', {}, h('b', {}, 'Власник: '), l.note || '—'),
        h('div', {}, h('b', {}, 'Набори: '), l.packs === '*' ? 'усі' : l.packs),
        OFFLINE_FILE ? null : h('div', {}, h('b', {}, 'Сесія до: '), new Date(l.exp).toLocaleDateString('uk-UA')))
        : h('p', { class: 'lead' }, 'Без коду доступна зупинка «Тарас Шевченко».'),
      l && !OFFLINE_FILE ? h('button', { class: 'btn ghost', onclick: async () => {
        try { await api('/api/session', 'DELETE'); } catch (e) {}
        license.clear(); toast('Ви вийшли. Місце для пристрою звільнено.'); go('#/'); route();
      } }, 'Вийти з цього пристрою') : null,
      !l ? h('button', { class: 'btn big', onclick: () => { store.set('dyvo_demo', false); route(); } }, 'Ввести код') : null,
      h('p', { class: 'muted' }, 'Один код працює на кількох пристроях (наприклад, дошка, ноутбук і телефон). Щоб перенести доступ на новий пристрій, вийдіть на старому.'),
      contactLine()));
  }

  // ---------------------------------------------------------------- маршрути
  function route() {
    if (!hasAccess()) return gate();
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'account') return account();
    const pack = PACKS.find(p => p.id === parts[1]);
    const byId = id => pack && pack.stops.find(s => s.id === id);
    if (parts[0] !== 'pack' || !pack) return library();
    const view = parts[2];
    if (!view) return packHome(pack);
    if (view === 'map') return map(pack);
    const s = byId(parts[3]);
    if ((view === 'stop' || view === 'task') && s && !canOpen(pack, s.id)) { lockedDialog(); return map(pack); }
    if (view === 'stop' && s) return stop(pack, s);
    if (view === 'task' && s) return taskScreen(pack, s);
    if (view === 'final') { if (!license.allows(pack.id)) { lockedDialog(); return map(pack); } return final(pack); }
    if (view === 'cartoons') return cartoons(pack);
    if (view === 'handouts') return handouts(pack);
    if (view === 'teacher') return teacher(pack);
    return packHome(pack);
  }

  window.addEventListener('hashchange', () => { document.querySelectorAll('.reward').forEach(r => r.remove()); route(); });
  let seen = false;
  try { seen = sessionStorage.getItem('dyvo_splash') === '1'; sessionStorage.setItem('dyvo_splash', '1'); } catch (e) {}
  if (seen) route(); else { route(); splash(() => {}); }
  refreshLicense();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
