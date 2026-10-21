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
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const chipLabel = w => { const t = w.replace(/^[«„"(]+|[.,:;!?…»"")\-–—]+$/g, ''); return t.charAt(0).toUpperCase() + t.slice(1); };
  function shuffledNot(arr) { if (arr.length < 2) return arr.slice(); let s; do { s = shuffle(arr); } while (s.every((v, i) => v === arr[i])); return s; }
  // векторні іконки замість емодзі: на частині шкільних дошок кольорових емодзі немає
  const ICONS = {
    site: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
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
    verified: '<path d="M12 3l7 3v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6z"/><path d="M8.5 12l2.2 2.2 4.8-5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
    bell: '<path d="M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21.5a2.2 2.2 0 0 0 4 0"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>',
    playbar: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
    wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10.5 10.5 0 0 1 14 0M8.5 15.5a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    cc: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17 10.2a2.4 2.4 0 1 0 0 3.6"/>'
  };
  const icon = (name, size) => h('span', { class: 'svg-ico', 'aria-hidden': 'true', html:
    `<svg viewBox="0 0 24 24" width="${size || '1em'}" height="${size || '1em'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>` });
  const go = path => { location.hash = path; };
  // ?v=хеш файлу (scripts/stamp_versions.py): після оновлення адреса інша — браузер не покаже стару копію
  const asset = (pack, p) => pack.base + p + (pack.versions && pack.versions[p] ? '?v=' + pack.versions[p] : '');
  function toast(msg) { const t = h('div', { class: 'toast' }, msg); document.body.append(t); setTimeout(() => t.remove(), 2200); }
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); Sfx.wrong(); }

  // ---------------------------------------------------------------- класи й прогрес
  // Стан вчителя: {classes: {t, list: [{id, name, grade}]}, prog: {"<клас або ->|<набір>|<рівень>": {t, s: {<зупинка>: 1}}}}.
  // Лежить на пристрої (dyvo_state); якщо вчитель увійшов в акаунт — синхронізується через /api/state.
  // Злиття: новіший запис перемагає — та сама логіка, що в lib/state.js. Обраний клас — лише на цьому пристрої (dyvo_class).
  const newer = (a, b) => (!a ? b : !b ? a : (b.t || 0) > (a.t || 0) ? b : a);
  function mergeState(a, b) {
    const out = { classes: newer(a.classes, b.classes), prog: {} };
    new Set([...Object.keys(a.prog || {}), ...Object.keys(b.prog || {})]).forEach(k => { out.prog[k] = newer((a.prog || {})[k], (b.prog || {})[k]); });
    return out;
  }
  const cloud = {
    get() {
      let s = store.get('dyvo_state', null);
      if (!s) { s = cloud.migrate(); store.set('dyvo_state', s); }
      s.prog = s.prog || {};
      return s;
    },
    // до появи класів прогрес лежав у dyvo_progress_<набір>[_<рівень>]
    migrate() {
      const s = { classes: null, prog: {} };
      PACKS.forEach(p => (p.grades || [{ id: '' }]).forEach((l, i) => {
        const old = store.get('dyvo_progress_' + p.id + (i ? '_' + l.id : ''), null);
        if (old && Object.keys(old).length) s.prog[['-', p.id, l.id].join('|')] = { t: 1, s: old };
      }));
      return s;
    },
    update(fn) { const s = cloud.get(); fn(s); store.set('dyvo_state', s); cloud.schedule(); },
    clear() { try { localStorage.removeItem('dyvo_state'); localStorage.removeItem('dyvo_class'); } catch (e) {} },
    timer: null,
    lastSync: 0,
    schedule() { if (!isAccount()) return; clearTimeout(cloud.timer); cloud.timer = setTimeout(() => cloud.sync(false), 1500); },
    // rerender — перемалювати бібліотеку, набір чи мапу, якщо з іншого пристрою прийшли зміни
    async sync(rerender) {
      if (OFFLINE_FILE || !isAccount() || !navigator.onLine) return;
      cloud.lastSync = Date.now();
      const before = JSON.stringify(cloud.get());
      try {
        const r = await api('/api/state', 'PUT', { state: cloud.get() });
        if (!r.ok || !r.data.state) return;
        const merged = mergeState(cloud.get(), r.data.state);   // зміни, зроблені поки йшов запит, не губимо
        store.set('dyvo_state', merged);
        const calm = /^#\/(library|pack\/[^/]+(\/map)?)?$/.test(location.hash || '#/') && !document.querySelector('.reward');
        if (rerender && calm && JSON.stringify(merged) !== before) route();
      } catch (e) {}
    }
  };
  const classes = () => ((cloud.get().classes || {}).list || []);
  const currentClass = () => { const id = store.get('dyvo_class', null); return classes().find(c => c.id === id) || null; };
  const saveClasses = list => cloud.update(s => { s.classes = { t: Date.now(), list }; });
  const className = c => (/клас/i.test(c.name) ? c.name : c.name + ' клас');

  // ---------------------------------------------------------------- рівень (вікова версія)
  // pack.grades — вікові версії набору; перша — базова. Для інших зупинка може мати levels[id] = {intro, task},
  // а будь-який об'єкт набору (teacher, description) — свої levels[id]. Вибір запам'ятовується за класом (c.grade),
  // а без класу — на пристрої.
  function levelIdFor(pack, c) {
    const ls = pack.grades;
    if (!ls) return '';
    const id = c && c.grade && ls.some(l => l.id === c.grade) ? c.grade : store.get('dyvo_level_' + pack.id, ls[0].id);
    return (ls.find(l => l.id === id) || ls[0]).id;
  }
  function levelOf(pack) {
    return pack.grades ? pack.grades.find(l => l.id === levelIdFor(pack, currentClass())) : null;
  }
  function byLevel(pack, obj) {
    const l = levelOf(pack);
    return obj && l && obj.levels && obj.levels[l.id] ? { ...obj, ...obj.levels[l.id] } : obj;
  }
  const levelHandouts = pack => { const l = levelOf(pack); return pack.handouts.filter(d => !l || !d.levels || d.levels.includes(l.id)); };
  function levelPicker(pack) {
    if (!pack.grades) return null;
    const cur = levelOf(pack);
    return h('div', { class: 'level-pick', role: 'radiogroup', 'aria-label': 'Вікова версія' },
      h('span', { class: 'lbl' }, 'Версія:'),
      pack.grades.map(l => h('button', { role: 'radio', 'aria-checked': String(l === cur), class: l === cur ? 'on' : '', onclick: () => {
        if (l === cur) return;
        Sfx.tap(); store.set('dyvo_level_' + pack.id, l.id);
        const c = currentClass();
        if (c) saveClasses(classes().map(x => x.id === c.id ? { ...x, grade: l.id } : x));   // клас запам'ятовує свою версію
        route();
      } }, l.label)));
  }

  // прогрес квесту — окремо для кожного класу й вікової версії
  const progKey = (pack, c) => [c ? c.id : '-', pack.id, levelIdFor(pack, c)].join('|');
  const progress = {
    key: pack => progKey(pack, currentClass()),
    get(pack) { return (cloud.get().prog[progress.key(pack)] || {}).s || {}; },
    done(pack, stopId) { const k = progress.key(pack); cloud.update(s => { const e = s.prog[k] || { s: {} }; s.prog[k] = { t: Date.now(), s: { ...e.s, [stopId]: 1 } }; }); },
    reset(pack) { const k = progress.key(pack); cloud.update(s => { s.prog[k] = { t: Date.now(), s: {} }; }); }
  };

  // «Мій клас»: 3-А, 3-Б… — у кожного свій прогрес. Без акаунта класи живуть на пристрої, з акаунтом — на всіх пристроях.
  function classPicker(pack) {
    const cur = currentClass();
    const list = classes();
    const hasStops = pack && pack.stops && pack.stops.length > 0;
    const done = c => hasStops ? Object.keys((cloud.get().prog[progKey(pack, c)] || {}).s || {}).length : 0;
    const isCur = c => (c ? c.id : null) === (cur ? cur.id : null);
    const chip = (c, label) => h('button', { role: 'radio', 'aria-checked': String(isCur(c)), class: isCur(c) ? 'on' : '', onclick: () => {
      if (isCur(c)) return;
      Sfx.tap(); store.set('dyvo_class', c ? c.id : null); route();
    } }, label, hasStops ? h('span', { class: 'cnt' }, `${done(c)}/${pack.stops.length}`) : null);
    return h('div', { class: 'level-pick class-pick', role: 'radiogroup', 'aria-label': 'Мій клас' },
      h('span', { class: 'lbl' }, 'Мій клас:'),
      list.length ? [chip(null, 'Без класу'), ...list.map(c => chip(c, c.name))] : null,
      h('button', { class: 'add', onclick: () => classDialog(null, pack) }, list.length ? '+ Клас' : '+ Додати клас'),
      cur ? h('button', { class: 'add', title: 'Перейменувати або видалити клас', 'aria-label': 'Змінити клас', onclick: () => classDialog(cur, pack) }, '✎') : null,
      list.length ? null : h('span', { class: 'muted hint' }, 'щоб вести прогрес окремо для 3-А, 3-Б…'));
  }
  function classDialog(c, pack) {
    const grades = (pack && pack.grades) || (PACKS.find(p => p.grades) || {}).grades || [];
    let grade = c ? c.grade : (pack ? levelIdFor(pack, null) : '');
    const name = h('input', { class: 'name-input', value: c ? c.name : '', maxlength: '40', placeholder: 'Наприклад, 3-А', 'aria-label': 'Назва класу' });
    const gradeRow = grades.length ? h('div', { class: 'level-pick' }, h('span', { class: 'lbl' }, 'Версія:'),
      grades.map(l => { const b = h('button', { class: l.id === grade ? 'on' : '', onclick: () => { grade = l.id; gradeRow.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); } }, l.label); return b; })) : null;
    const close = () => r.remove();
    const save = () => {
      const n = name.value.trim().slice(0, 40);
      if (!n) { shake(name); return; }
      if (c) saveClasses(classes().map(x => x.id === c.id ? { ...x, name: n, grade } : x));
      else {
        const id = Math.random().toString(36).slice(2, 10);
        saveClasses([...classes(), { id, name: n, grade }]);
        store.set('dyvo_class', id);
      }
      Sfx.right(); close(); route();
    };
    name.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    const r = h('div', { class: 'reward', role: 'dialog', 'aria-label': c ? 'Змінити клас' : 'Новий клас' },
      h('div', { class: 'card pop class-dialog' },
        h('h2', {}, c ? 'Клас ' + c.name : 'Новий клас'),
        h('p', { class: 'muted' }, 'У кожного класу свій прогрес у квесті.' + (isAccount() ? ' Класи збережуться в акаунті й будуть на всіх ваших пристроях.' : ' Увійдіть в акаунт, щоб класи були на всіх ваших пристроях.')),
        name, gradeRow,
        h('button', { class: 'btn big', onclick: save }, c ? 'Зберегти' : 'Додати клас'),
        c ? h('button', { class: 'linkish danger', onclick: () => {
          if (!confirm('Видалити клас ' + c.name + '? Його прогрес у квесті зникне.')) return;
          saveClasses(classes().filter(x => x.id !== c.id)); store.set('dyvo_class', null); close(); route();
        } }, 'Видалити клас') : null,
        h('button', { class: 'btn ghost', onclick: close }, 'Скасувати')));
    document.body.append(r);
    setTimeout(() => name.focus(), 50);
  }
  // ---------------------------------------------------------------- без інтернету
  // Мультфільми, PDF і картинки набору зберігаються цілими файлами в окремий кеш: браузер просить відео частинами (Range),
  // а sw.js нарізає ці частини з кешу. Ключ — адреса з ?v=, тож після оновлення файлу старий запис просто не підходить.
  const MEDIA_CACHE = 'dyvourok-media';
  const canSave = () => !OFFLINE_FILE && 'caches' in window && 'serviceWorker' in navigator;
  function offlineFiles(pack) {
    const files = new Set();
    (pack.stops || []).forEach(s => s.video && files.add(s.video));
    (pack.cartoons || []).forEach(c => c.ready && c.file && files.add(c.file));
    (pack.handouts || []).forEach(d => d.file && files.add(d.file));
    if (pack.teacher) {
      if (pack.teacher.file) files.add(pack.teacher.file);
      Object.values(pack.teacher.levels || {}).forEach(t => t.file && files.add(t.file));
    }
    Object.keys(pack.versions || {}).forEach(p => p.startsWith('img/') && files.add(p));
    return [...files].map(p => new URL(asset(pack, p), document.baseURI).href);
  }
  async function offlineMissing(pack) {
    const c = await caches.open(MEDIA_CACHE);
    const urls = offlineFiles(pack);
    const have = await Promise.all(urls.map(u => c.match(u)));
    return urls.filter((u, i) => !have[i]);
  }
  // onProgress(завантажено байт, файлів готово, файлів усього)
  async function saveOffline(pack, onProgress) {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    const c = await caches.open(MEDIA_CACHE);
    const all = offlineFiles(pack);
    const todo = await offlineMissing(pack);
    let bytes = 0, done = all.length - todo.length;
    onProgress(bytes, done, all.length);
    for (const url of todo) {
      const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      if (res.status === 401) throw new Error('401');
      if (!res.ok) throw new Error('http ' + res.status);
      const reader = res.body.getReader(), chunks = [];
      for (;;) {
        const { done: end, value } = await reader.read();
        if (end) break;
        chunks.push(value); bytes += value.length; onProgress(bytes, done, all.length);
      }
      const blob = new Blob(chunks, { type: res.headers.get('content-type') || '' });
      await c.put(url, new Response(blob, { headers: { 'content-type': blob.type, 'content-length': String(blob.size) } }));
      onProgress(bytes, ++done, all.length);
    }
    // прибрати старі версії файлів цього набору
    const keep = new Set(all);
    for (const req of await c.keys()) if (req.url.includes('/' + pack.base) && !keep.has(req.url)) await c.delete(req);
  }
  function offlineCard(pack) {
    if (!canSave() || !license.allows(pack.id)) return null;
    const isBoard = !!pack.board;
    const titleText = isBoard ? 'Мультфільми та роздатка без інтернету' : 'Увесь набір без інтернету';
    const status = h('div', { class: 'muted' }, 'Перевіряємо…');
    const note = h('div', { class: 'offline-note muted' }, 'Матеріали зберігаються в цьому браузері, а не в папці «Завантаження». Очищення даних браузера видалить цю копію.');
    const bar = h('div', { class: 'offline-bar', hidden: true }, h('span'));
    const btn = h('button', { class: 'btn', hidden: true }, isBoard ? 'Зберегти файли' : 'Зберегти весь набір');
    const card = h('div', { class: 'offline-card card-soft' },
      h('div', { class: 'ico' }, icon('wifi')),
      h('div', { class: 'grow' }, h('h3', {}, titleText), status, note, bar), btn);
    const ready = () => { card.classList.add('ok'); status.textContent = isBoard ? 'Готово. Мультфільми, роздатка та пам\'ятки відкриються без інтернету на цьому пристрої.' : 'Готово. Квест, мультфільми, поради, відповіді та роздатка відкриються без інтернету на цьому пристрої.'; btn.hidden = true; bar.hidden = true; };
    const idle = (msg) => { status.textContent = msg || (isBoard ? 'Збережіть один раз, щоб показувати мультфільми та роздатку без мережі.' : 'Збережіть один раз, щоб провести весь урок без мережі (≈100 МБ).'); btn.hidden = false; btn.disabled = false; btn.textContent = isBoard ? 'Зберегти файли' : 'Зберегти весь набір'; };
    btn.onclick = async () => {
      Sfx.tap();
      btn.disabled = true; btn.textContent = 'Зберігаємо…'; bar.hidden = false;
      try {
        await saveOffline(pack, (b, n, total) => {
          status.textContent = `Зберігаємо: ${n} з ${total} файлів · ${Math.round(b / 1048576)} МБ`;
          bar.firstChild.style.width = Math.round(n / total * 100) + '%';
        });
        ready(); Sfx.right();
      } catch (e) {
        bar.hidden = true;
        idle(e.message === '401' ? 'Сесія завершилась — увійдіть з кодом ще раз і повторіть.'
          : !navigator.onLine ? 'Немає інтернету. Підключіться й натисніть ще раз — збережене не пропаде.'
          : 'Не вдалося зберегти все. Натисніть ще раз — продовжимо з того місця.');
      }
    };
    offlineMissing(pack).then(m => m.length ? idle() : ready()).catch(() => { card.hidden = true; });
    return card;
  }
  async function clearOffline() { try { await caches.delete(MEDIA_CACHE); } catch (e) {} }

  // ---------------------------------------------------------------- доступ
  // Ліцензія: {note, packs, exp, checked} — копія того, що сервер записав у HttpOnly-кукі сесії.
  // Вхід в акаунт додає {account: true, email, name}; packs тоді — з усіх кодів, прив'язаних до акаунта (може бути порожнім).
  const license = {
    get() {
      if (OFFLINE_FILE) return { note: 'Офлайн-версія', packs: '*', exp: Infinity };
      const l = store.get('dyvo_lic', null);
      return l && l.exp > Date.now() ? l : null;
    },
    set(l) {
      store.set('dyvo_lic', { ...l, checked: Date.now() }); store.set('dyvo_demo', false);
      if (l.account && Date.now() - cloud.lastSync > 3000) setTimeout(() => cloud.sync(true), 0);   // щойно увійшли — підтягнути класи й прогрес
      if (Date.now() - news.lastLoad > 3000) setTimeout(() => news.load(), 0);
    },
    clear() { try { localStorage.removeItem('dyvo_lic'); } catch (e) {} },
    allows(packId) { const l = license.get(); return !!l && (l.packs === '*' || l.packs.split(',').includes(packId)); }
  };
  const isDemo = () => !license.get() && store.get('dyvo_demo', false);
  const hasAccess = () => !!license.get() || isDemo();
  const canOpen = (pack, stopId) => license.allows(pack.id) || DEMO_STOPS.includes(stopId);
  const isAccount = () => !!(license.get() || {}).account;
  const ownsAny = () => PACKS.some(p => license.allows(p.id));

  // ---------------------------------------------------------------- статистика демо
  // Анонімно: випадковий id пристрою + назва кроку — щоб в адмінці бачити, чи хтось проходить демо. З кодом не рахуємо;
  // на пристрої, де відкривали адмінку, теж (dyvo_notrack). Джерело dyvo_from записує сайт (site.js).
  const tracked = new Set();
  function track(e) {
    if (OFFLINE_FILE || license.get() || store.get('dyvo_notrack', false) || tracked.has(e)) return;
    tracked.add(e);
    fetch('/api/track', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ v: deviceId(), e, src: store.get('dyvo_from', '') }) }).catch(() => {});
  }
  // в акаунті код додається на сторінці «Акаунт», без акаунта — екран входу
  const enterCode = () => { track('code'); if (isAccount()) { go('#/account'); return; } store.set('dyvo_demo', false); route(); };

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
      else if (r.status === 401) { if (l.account) cloud.clear(); license.clear(); clearOffline(); toast(l.account ? 'Сесія завершилася. Увійдіть ще раз.' : 'Доступ на цьому пристрої завершено. Введіть код ще раз.'); route(); }
    } catch (e) {}
  }
  const mailLink = () => h('a', { class: 'mail', href: 'mailto:' + CONTACT }, CONTACT);
  const contactLine = (lead = 'Питання чи проблеми з доступом? Пишіть на ') => h('p', { class: 'muted contact' }, lead, mailLink());
  const buyHint = () => h('div', {}, h('p', { class: 'muted' }, 'Ще немає коду? ', h('a', { href: 'https://dyvourok.com.ua/?from=app#peredzamovlennia', target: '_blank', rel: 'noopener' }, 'Замовте набір'), ' — надішлемо реквізити й код доступу.'), contactLine('Питання? Пишіть на '));
  function lockedDialog() {
    Sfx.wrong(); track('locked');
    const r = h('div', { class: 'reward', role: 'dialog', 'aria-label': 'Потрібен доступ' },
      h('div', { class: 'card pop' },
        h('div', { class: 'kicker' }, 'Демо-версія'),
        h('span', { style: 'font-size:64px;color:var(--red)' }, icon('lock')),
        h('h2', {}, 'Ця частина відкривається з кодом доступу'),
        h('p', {}, 'У демо можна пройти зупинку «Тарас Шевченко». Повний набір — 5 епох, мультфільми, роздатка і сценарій уроку.'),
        h('button', { class: 'btn big', onclick: () => { r.remove(); enterCode(); } }, isAccount() ? 'Додати код доступу' : 'Увійти або ввести код'),
        h('a', { class: 'btn ghost', href: 'https://dyvourok.com.ua/?from=demo#peredzamovlennia', target: '_blank', rel: 'noopener', onclick: () => track('want') }, 'Хочу повну версію'),
        h('button', { class: 'btn ghost', onclick: () => r.remove() }, 'Повернутися'),
        contactLine('Питання? Пишіть на ')));
    document.body.append(r);
  }

  // ---------------------------------------------------------------- оголошення
  // Новини «Дивоуроку»: дзвіночок у верхній панелі й банер для важливих. Створюються в адмінці (розділ «Оголошення»).
  // Банер — лише в бібліотеці й на сторінці набору, щоб не з'явитися посеред уроку. Копія списку — у dyvo_news (без інтернету).
  const news = {
    items() { return OFFLINE_FILE ? [] : store.get('dyvo_news', []); },
    unread() { return news.items().filter(n => !n.read); },
    // вікові версії, з якими працює вчитель: класи + обрана версія набору на пристрої
    grades() {
      const g = new Set(classes().map(c => c.grade).filter(Boolean));
      PACKS.forEach(p => { const id = levelIdFor(p, null); if (id) g.add(id); });
      return [...g].join(',');
    },
    lastLoad: 0,
    seenSent: new Set(),
    async load() {
      if (OFFLINE_FILE || !navigator.onLine) return;
      news.lastLoad = Date.now();
      try {
        const r = await api('/api/news?d=' + encodeURIComponent(deviceId()) + '&g=' + encodeURIComponent(news.grades()), 'GET');
        if (!r.ok || !Array.isArray(r.data.items)) return;
        const before = JSON.stringify(news.items());
        store.set('dyvo_news', r.data.items);
        news.paintBadge();
        const calm = /^#\/(library|pack\/[^/]+)?$/.test(location.hash || '#/') && !document.querySelector('.reward');
        if (calm && before !== JSON.stringify(r.data.items) && news.unread().some(n => n.important)) route();   // показати новий банер
      } catch (e) {}
    },
    // event: seen — банер показано, read — прочитано (дзвіночок або закрили банер), click — натиснули кнопку
    mark(ids, event) {
      if (!ids.length) return;
      if (event !== 'seen') store.set('dyvo_news', news.items().map(n => ids.includes(n.id) ? { ...n, read: true } : n));
      news.paintBadge();
      fetch('/api/news', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids, event, d: deviceId() }) }).catch(() => {});
    },
    paintBadge() {
      const b = document.getElementById('news-badge');
      if (!b) return;
      const n = news.unread().length;
      b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n);
    }
  };
  // кнопка оголошення: сторінка застосунку (#/…) або зовнішнє https-посилання в новій вкладці
  function newsButton(n, after) {
    if (!n.button_label || !n.button_url) return null;
    const ext = /^https:\/\//.test(n.button_url);
    const onclick = e => { news.mark([n.id], 'click'); if (after) after(); if (!ext) { e.preventDefault(); go(n.button_url); } };
    return ext ? h('a', { class: 'btn compact', href: n.button_url, target: '_blank', rel: 'noopener', onclick }, n.button_label)
      : h('button', { class: 'btn compact', onclick }, n.button_label);
  }
  function newsDialog() {
    Sfx.tap();
    const items = news.items();
    const close = () => r.remove();
    const r = h('div', { class: 'reward', role: 'dialog', 'aria-label': 'Новини' },
      h('div', { class: 'card pop news-dialog' },
        h('h2', {}, 'Новини «Дивоуроку»'),
        items.length ? h('div', { class: 'news-list' }, items.map(n => h('article', { class: 'news-item' + (n.read ? '' : ' unread') },
          h('div', { class: 'news-date' }, new Date(n.starts_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })),
          h('h3', {}, n.title),
          n.body ? h('p', { class: 'news-body' }, n.body) : null,
          newsButton(n, close))))
          : h('p', { class: 'muted' }, navigator.onLine ? 'Поки що новин немає. Тут з\'являтимуться анонси нових наборів і функцій.' : 'Новини завантажаться, коли з\'явиться інтернет.'),
        h('button', { class: 'btn ghost', onclick: close }, 'Закрити')));
    r.addEventListener('click', e => { if (e.target === r) close(); });
    document.body.append(r);
    news.mark(items.filter(n => !n.read).map(n => n.id), 'read');
  }
  function newsBanner() {
    const n = news.unread().find(x => x.important);
    if (!n) return null;
    if (!news.seenSent.has(n.id)) { news.seenSent.add(n.id); news.mark([n.id], 'seen'); }
    const card = h('div', { class: 'card-soft news-banner', role: 'status' },
      h('div', { class: 'ico' }, icon('bell')),
      h('div', { class: 'grow' }, h('h3', {}, n.title), n.body ? h('p', { class: 'news-body' }, n.body) : null),
      h('div', { class: 'news-acts' },
        newsButton(n, () => news.mark([n.id], 'read')),
        h('button', { class: 'icon-btn', title: 'Закрити', 'aria-label': 'Закрити оголошення', onclick: () => { news.mark([n.id], 'read'); card.remove(); } }, '×')));
    return card;
  }

  // ---------------------------------------------------------------- каркас
  function frame(crumbs, body) {
    const soundBtn = h('button', { class: 'icon-btn snd-btn', title: 'Звук', 'aria-label': 'Увімкнути або вимкнути звук', onclick: () => { soundBtn.replaceChildren(icon(Sfx.toggle() ? 'sound' : 'mute')); } }, icon(Sfx.on ? 'sound' : 'mute'));
    const fsBtn = h('button', { class: 'icon-btn fs-btn', title: 'На весь екран', 'aria-label': 'На весь екран', onclick: () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
    } }, icon('full'));
    const userBtn = hasAccess() ? h('button', { class: 'icon-btn', title: isAccount() ? 'Акаунт' : 'Доступ', 'aria-label': 'Акаунт, доступ і вихід', onclick: () => go('#/account') }, icon('user')) : null;
    const top = h('header', { class: 'topbar' },
      h('img', { class: 'logo', src: 'brand/dyvourok-logo.svg', alt: 'Дивоурок', onclick: () => go('#/library') }),
      h('div', { class: 'crumb' }, crumbs),
      h('div', { class: 'spacer' }),
      isDemo() ? h('button', { class: 'btn', style: 'padding:10px 18px;font-size:.85em', onclick: enterCode }, 'Увійти') : null,
      isAccount() && PACKS.some(p => !license.allows(p.id)) ? h('button', { class: 'btn', style: 'padding:10px 18px;font-size:.85em', onclick: enterCode }, 'Додати код') : null,
      OFFLINE_FILE ? null : h('button', { class: 'icon-btn bell', title: 'Новини', 'aria-label': 'Новини «Дивоуроку»', onclick: newsDialog },
        icon('bell'), h('span', { class: 'news-badge', id: 'news-badge', hidden: true })),
      // назад на сайт-вітрину: <base href="../"> веде './' на головну сайту (в офлайн-архіві з диска сайту немає)
      OFFLINE_FILE ? null : h('a', { class: 'site-link', href: './', title: 'На сайт «Дивоурока»', 'aria-label': 'Перейти на сайт «Дивоурока»' }, icon('site'), h('span', { class: 'site-txt' }, 'На сайт')),
      userBtn, soundBtn, fsBtn);
    app.replaceChildren(top, h('main', { class: 'screen' }, body));
    news.paintBadge();
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

  // ---------------------------------------------------------------- вхід: акаунт (Google / пошта) або код
  const CODE_ERRORS = {
    invalid: 'Такого коду немає. Перевірте, чи немає помилки.',
    revoked: `Цей код заблоковано. Напишіть нам на ${CONTACT} — розберемося.`,
    expired: `Термін дії коду завершився. Щоб продовжити, напишіть на ${CONTACT}.`,
    devices: 'Код уже активовано на максимальній кількості пристроїв. Вийдіть з нього на одному з них або увійдіть в акаунт — там обмежень на пристрої немає.',
    taken: `Цей код уже прив'язано до іншого акаунта. Якщо це ваш код, напишіть на ${CONTACT}.`
  };
  const LOGIN_ERRORS = {
    email: 'Перевірте адресу пошти.',
    slow: 'Лист уже надіслано. Зачекайте хвилину й спробуйте ще раз.',
    'mail-off': 'Вхід через пошту тимчасово недоступний. Скористайтеся кодом доступу.',
    'mail-failed': 'Не вдалося надіслати лист. Спробуйте ще раз за хвилину.',
    code: 'Код не підходить. Перевірте цифри з листа.',
    expired: 'Код застарів або використаний. Надішліть новий.'
  };
  const offlineMsg = 'Немає зв\'язку з сервером. Для входу потрібен інтернет.';
  // Код/посилання одноразові: якщо вчитель уже увійшов кнопкою з листа в іншій вкладці, кука сесії вже є —
  // тоді «використаний код» не помилка, просто підхоплюємо сесію акаунта.
  async function alreadySignedIn() {
    try { const r = await api('/api/session', 'POST'); if (r.ok && r.data.account) { license.set(r.data); return true; } } catch (e) {}
    return false;
  }
  const authConfig = { google: true, email: true };
  let authLoaded = null;
  const loadAuthConfig = () => authLoaded || (authLoaded = api('/api/auth/config', 'GET').then(r => { if (r.ok) Object.assign(authConfig, r.data); }).catch(() => {}));

  // Поле коду доступу. Без акаунта — активація на пристрої (/api/activate), в акаунті — прив'язка до акаунта (/api/me).
  function codeBox(onDone) {
    const input = h('input', { class: 'code-input', placeholder: 'КОД ДОСТУПУ', autocomplete: 'off', 'aria-label': 'Код доступу' });
    const err = h('div', { class: 'err', role: 'status' });
    const btn = h('button', { class: 'btn', onclick: () => submit() }, isAccount() ? 'Додати' : 'Увійти з кодом');
    async function submit() {
      err.textContent = '';
      btn.disabled = true;
      try {
        const r = isAccount() ? await api('/api/me', 'POST', { code: input.value })
          : await api('/api/activate', 'POST', { code: input.value, deviceId: deviceId(), label: deviceLabel() });
        if (r.ok) { license.set(r.data); Sfx.right(); onDone(); return; }
        err.textContent = CODE_ERRORS[r.data.error] || 'Не вдалося перевірити код. Спробуйте ще раз.';
        shake(input);
      } catch (e) { err.textContent = offlineMsg; } finally { btn.disabled = false; }
    }
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    return h('div', { class: 'code-box' }, h('div', { class: 'code-row' }, input, btn), err);
  }

  const legal = () => h('p', { class: 'muted legal' }, 'Входячи, ви погоджуєтеся з ',
    h('a', { href: '/oferta', target: '_blank', rel: 'noopener' }, 'умовами'), ' та ',
    h('a', { href: '/pryvatnist', target: '_blank', rel: 'noopener' }, 'політикою конфіденційності'), '.');

  // Вхід в акаунт: Google або 6-значний код з листа
  function loginBox(onDone) {
    const box = h('div', { class: 'login-box' });
    const err = h('div', { class: 'err', role: 'status' });
    const google = h('a', { class: 'btn big google-btn', href: '/api/auth/google', onclick: () => { Sfx.tap(); track('login_google'); } },
      h('span', { class: 'g-mark', 'aria-hidden': 'true' }, 'G'), 'Увійти через Google');
    const email = h('input', { class: 'email-input', type: 'email', placeholder: 'Ваша пошта', autocomplete: 'email', 'aria-label': 'Електронна пошта' });
    const send = h('button', { class: 'btn ghost', onclick: () => sendMail() }, 'Отримати код');
    let sentTo = '';
    async function sendMail() {
      err.textContent = '';
      send.disabled = true;
      const to = sentTo && !email.isConnected ? sentTo : email.value.trim();
      try {
        const r = await api('/api/auth/email', 'POST', { email: to });
        if (r.ok) { sentTo = to; track('login_email'); stepCode(r.data.devCode); return; }
        err.textContent = r.data.error === 'slow' && r.data.wait > 60 ? 'Забагато спроб. Спробуйте трохи пізніше.'
          : LOGIN_ERRORS[r.data.error] || 'Не вдалося надіслати лист. Спробуйте ще раз.';
        if (email.isConnected) shake(email);
      } catch (e) { err.textContent = offlineMsg; } finally { send.disabled = false; }
    }
    function stepCode(devCode) {
      const code = h('input', { class: 'code-input digits', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', placeholder: '••••••', 'aria-label': 'Код з листа' });
      const ok = h('button', { class: 'btn big', onclick: () => verify() }, 'Увійти');
      async function verify() {
        err.textContent = '';
        ok.disabled = true;
        try {
          const r = await api('/api/auth/verify', 'POST', { email: sentTo, code: code.value });
          if (r.ok) { license.set(r.data); Sfx.right(); onDone(); return; }
          if (r.data.error === 'expired' && await alreadySignedIn() && license.get().email === sentTo.toLowerCase()) { Sfx.right(); onDone(); return; }
          err.textContent = LOGIN_ERRORS[r.data.error] || 'Не вдалося увійти. Спробуйте ще раз.';
          shake(code);
        } catch (e) { err.textContent = offlineMsg; } finally { ok.disabled = false; }
      }
      code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 6); if (code.value.length === 6) verify(); });
      code.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
      box.replaceChildren(...[
        h('p', { class: 'lead' }, 'Ми надіслали 6-значний код на ', h('b', {}, sentTo), '. Введіть його тут або натисніть кнопку в листі.'),
        devCode ? h('p', { class: 'muted' }, 'Локальна перевірка: код ' + devCode) : null,
        code, err, ok,
        h('p', { class: 'muted' }, 'Не бачите листа? Перевірте «Спам» або «Промоакції». ',
          h('button', { class: 'linkish', onclick: () => sendMail() }, 'Надіслати ще раз'), ' · ',
          h('button', { class: 'linkish', onclick: () => { err.textContent = ''; stepEmail(); } }, 'Інша пошта'))].filter(Boolean));
      setTimeout(() => code.focus(), 50);
    }
    function stepEmail() {
      if (sentTo) email.value = sentTo;
      box.replaceChildren(...[
        authConfig.google ? google : null,
        authConfig.google && authConfig.email ? h('div', { class: 'or' }, 'або') : null,
        authConfig.email ? h('div', { class: 'email-row' }, email, send) : null,
        err, legal()].filter(Boolean));
    }
    email.addEventListener('keydown', e => { if (e.key === 'Enter') sendMail(); });
    stepEmail();
    loadAuthConfig().then(() => { if (!sentTo) stepEmail(); });
    return box;
  }

  function gate() {
    const done = () => { go('#/library'); route(); };
    frame('Вхід', h('div', { class: 'gate' },
      h('img', { src: 'brand/dyvourok-mark.svg', alt: '', style: 'width:110px' }),
      h('h1', {}, 'Вітаємо в «Дивоуроці»!'),
      h('p', { class: 'lead' }, 'Увійдіть, щоб ваші набори відкривалися на будь-якому пристрої: дошці, ноутбуці чи телефоні.'),
      loginBox(done),
      h('div', { class: 'card-soft code-card' },
        h('h3', {}, 'Маєте код доступу з листа?'),
        h('p', { class: 'muted' }, 'Введіть його тут. А якщо увійдете в акаунт, код збережеться в ньому, і вводити його більше не доведеться.'),
        codeBox(done)),
      h('button', { class: 'btn ghost', onclick: () => { store.set('dyvo_demo', true); Sfx.tap(); go('#/library'); route(); } }, 'Спробувати безкоштовно'),
      buyHint()));
  }

  // Повернення після входу: #/login/<токен> — посилання з листа, #/login-ok — після Google, #/login-error/<причина>
  async function finishLogin(kind, arg) {
    frame('Вхід', h('div', { class: 'gate' }, h('h1', {}, 'Входимо…')));
    const fail = msg => {
      history.replaceState(null, '', location.pathname + location.search + '#/');
      frame('Вхід', h('div', { class: 'gate' }, h('h1', {}, 'Не вдалося увійти'), h('p', { class: 'lead' }, msg),
        h('button', { class: 'btn big', onclick: () => { go(license.get() ? '#/account' : '#/'); route(); } }, 'Спробувати ще раз'), contactLine()));
    };
    if (kind === 'login-error') {
      const why = { cancelled: 'Вхід через Google скасовано.', 'google-off': 'Вхід через Google ще не налаштовано. Скористайтеся поштою або кодом доступу.' };
      return fail(why[arg] || 'Google не підтвердив вхід. Спробуйте ще раз або увійдіть через пошту.');
    }
    try {
      const r = kind === 'login' ? await api('/api/auth/verify', 'POST', { token: arg }) : await api('/api/session', 'POST');
      // повторне натискання кнопки в листі, коли вже увійшли, — просто відкриваємо бібліотеку
      if (!r.ok && kind === 'login' && await alreadySignedIn()) { history.replaceState(null, '', location.pathname + location.search + '#/library'); return route(); }
      if (!r.ok) return fail(kind === 'login' ? 'Посилання застаріло або вже використане. Надішліть новий лист.' : 'Сесію не знайдено. Спробуйте ще раз.');
      license.set(r.data); Sfx.right();
      toast(r.data.email ? 'Ви увійшли як ' + r.data.email : 'Ви увійшли');
      const pending = store.get('dyvo_pending_claim', '');
      const claimPack = PACKS.find(p => p.id === pending && p.claimable);
      if (claimPack) {
        history.replaceState(null, '', location.pathname + location.search + '#/claim/' + claimPack.id);
        return claimFreePack(claimPack);
      }
      history.replaceState(null, '', location.pathname + location.search + '#/library');
      route();
    } catch (e) { fail(offlineMsg); }
  }

  // ---------------------------------------------------------------- бібліотека
  async function claimFreePack(pack) {
    if (!pack || !pack.claimable) return;
    if (!isAccount()) { store.set('dyvo_pending_claim', pack.id); return freePackGate(pack); }
    frame([pack.title], h('div', { class: 'gate' }, h('h1', {}, 'Додаємо набір…'), h('p', { class: 'lead' }, 'Зачекайте кілька секунд.')));
    try {
      const r = await api('/api/packs/claim', 'POST', {
        pack: pack.id,
        grade: levelIdFor(pack, currentClass()),
        source: store.get('dyvo_from', '')
      });
      if (!r.ok) throw new Error(r.data.error || String(r.status));
      license.set(r.data); store.del('dyvo_pending_claim'); Sfx.right();
      toast('Набір додано до вашого акаунта');
      go('#/pack/' + pack.id); route();
    } catch (e) {
      frame([pack.title], h('div', { class: 'gate' },
        h('h1', {}, 'Не вдалося додати набір'),
        h('p', { class: 'lead' }, navigator.onLine ? 'Спробуйте ще раз. Якщо помилка повториться, напишіть нам.' : offlineMsg),
        h('button', { class: 'btn big', onclick: () => claimFreePack(pack) }, 'Спробувати ще раз'), contactLine()));
    }
  }

  function freePackGate(pack) {
    store.set('dyvo_pending_claim', pack.id);
    const done = () => claimFreePack(pack);
    frame([pack.title], h('div', { class: 'gate claim-gate' },
      h('div', { class: 'kicker' }, 'Безкоштовний набір · код не потрібен'),
      h('h1', {}, 'Додайте «' + pack.title + '» до свого акаунта'),
      h('p', { class: 'lead' }, 'Увійдіть через Google або пошту — і весь набір одразу відкриється на дошці, ноутбуці та телефоні.'),
      h('div', { class: 'card-soft claim-benefits' },
        h('b', {}, 'У наборі:'),
        h('ul', { class: 'clean' },
          h('li', {}, 'інтерактивний урок для 1–11 класу;'),
          h('li', {}, 'мультфільми та перевірені джерела;'),
          h('li', {}, 'роздатки, наліпки, закладки й диплом.'))),
      loginBox(done),
      h('p', { class: 'muted legal' }, 'Без оплати й без коду доступу. Учням реєструватися не потрібно.'),
      h('button', { class: 'btn ghost', onclick: () => { store.del('dyvo_pending_claim'); go('#/library'); route(); } }, 'Повернутися до бібліотеки')));
  }

  // Згода на листи: питаємо один раз (news === null), відповідь зберігається в акаунті
  function newsAsk() {
    const l = license.get();
    if (!l || !l.account || l.news === 0 || l.news === 1) return null;
    const answer = async yes => {
      const r = await api('/api/me', 'POST', { news: yes }).catch(() => ({ ok: false }));
      if (!r.ok) { toast(offlineMsg); return; }
      license.set(r.data); card.remove();
      toast(yes ? 'Дякуємо! Нагадаємо перед святами.' : 'Добре, без листів. Змінити можна в акаунті.');
    };
    const card = h('div', { class: 'card-soft news-card' },
      h('div', { class: 'grow' }, h('h3', {}, 'Нагадувати про свята?'),
        h('p', { class: 'muted' }, 'Напишемо, коли вийде новий набір, і нагадаємо за тиждень до свята. Не частіше двох листів на місяць, відписатися можна будь-коли.')),
      h('div', { class: 'news-acts' }, h('button', { class: 'btn', onclick: () => answer(true) }, 'Так, нагадуйте'), h('button', { class: 'btn ghost', onclick: () => answer(false) }, 'Ні, дякую')));
    return card;
  }

  const packSubtitle = p => (p.claimable && license.allows(p.id) ? p.subtitle.replace(/\s*·\s*безкоштовно після входу/i, '') : p.subtitle);

  function packGateBanner(p) {
    if (license.allows(p.id) || p.claimable) return null;
    return h('div', { class: 'card-soft news-banner pack-gate-banner', role: 'status' },
      h('div', { class: 'ico' }, icon('lock')),
      h('div', { class: 'grow' },
        h('h3', {}, 'Демо-доступ до набору «' + p.title + '»'),
        h('p', { class: 'news-body' }, 'У демо відкрита перша зупинка. Повний урок, роздатка для друку та презентація відкриваються за кодом.')),
      h('div', { class: 'news-acts' },
        h('button', { class: 'btn compact', onclick: enterCode }, isAccount() ? 'Ввести код' : 'Увійти з кодом'),
        h('a', { class: 'btn ghost compact', href: 'https://dyvourok.com.ua/?from=demo#peredzamovlennia', target: '_blank', rel: 'noopener' }, 'Замовити набір')));
  }

  function library() {
    const cards = PACKS.map(p => {
      const allowed = license.allows(p.id);
      let badge = null;
      if (p.claimable) {
        badge = h('span', { class: 'free' }, allowed ? 'Додано' : 'Безкоштовно');
      } else {
        badge = allowed ? h('span', { class: 'free' }, 'Доступно') : h('span', { class: 'badge-code' }, icon('lock', '0.85em'), 'За кодом');
      }
      return h('button', { class: 'pack-card' + (allowed ? ' owned' : ''), onclick: () => { Sfx.tap(); go((p.claimable && !allowed ? '#/claim/' : '#/pack/') + p.id); } },
        h('div', { class: 'cover' }, h('span', { class: 'date' }, p.date), badge, h('img', { src: asset(p, p.cover), alt: '' })),
        h('div', { class: 'body' }, h('h3', {}, p.title), h('div', { class: 'muted' }, packSubtitle(p))));
    });
    const soon = [
      { title: 'Новий рік і Різдво', date: 'Грудень' },
      { title: 'Шевченківські дні', date: 'Березень' },
      { title: 'Весна і Великдень', date: 'Квітень' }
    ].map(s => h('div', { class: 'pack-card soon' },
      h('div', { class: 'cover' }, h('span', { class: 'date' }, s.date), 'Незабаром'),
      h('div', { class: 'body' }, h('h3', {}, s.title), h('div', { class: 'muted' }, 'Готуємо до свята'))));
    frame(h('b', {}, 'Бібліотека'), [
      h('div', { class: 'kicker' }, 'Каталог уроків'),
      h('h1', {}, 'Що будемо дивувати сьогодні?'),
      newsBanner() || newsAsk(),   // не дві великі картки поспіль: спершу оголошення, потім питання про листи
      h('div', { class: 'shelf' }, cards, soon)]);
  }

  // ---------------------------------------------------------------- набір
  function packHome(pack) {
    const done = Object.keys(progress.get(pack)).length;
    const item = (ico, title, note, path, main) => h('button', { class: 'menu-item' + (main ? ' main' : ''), onclick: () => { Sfx.tap(); go(path); } },
      h('div', { class: 'ico' }, icon(ico)), h('h3', {}, title), h('div', { class: 'muted' }, note));
    const lp = byLevel(pack, pack);
    const gateBanner = packGateBanner(pack);
    frame([pack.title], [
      gateBanner || newsBanner(),   // одна картка зверху, не дві: у демо — про доступ, інакше — оголошення
      h('div', { class: 'pack-head' },
        h('div', { class: 'kicker' }, packSubtitle(pack)),
        h('h1', {}, pack.title),
        lp.description ? h('p', { class: 'lead' }, lp.description) : null,
        classPicker(pack),
        levelPicker(pack)),
      h('div', { class: 'menu' },
        pack.board ? boardItem(pack)
          : item('clock', 'Машина часу', done ? `Пройдено ${done} з ${pack.stops.length} зупинок — продовжити` : 'Інтерактивна подорож для дошки: 5 епох, 5 завдань, одне слово', `#/pack/${pack.id}/map`, true),
        item('film', 'Мультфільми', (pack.notes && pack.notes.cartoons) || 'Класики розповідають про себе', `#/pack/${pack.id}/cartoons`),
        item('print', 'Роздатка', license.allows(pack.id) ? ((pack.notes && pack.notes.handouts) || 'Робочі аркуші, плакати, грамоти для друку') : 'Подивитися зразки сторінок', `#/pack/${pack.id}/handouts`),
        item('board', 'Для вчителя', 'Сценарій на 45 хвилин і відповіді', `#/pack/${pack.id}/teacher`),
        item('verified', 'Джерела й фактчек', 'Чим підтверджено факти заняття', `#/pack/${pack.id}/sources`),
        license.allows(pack.id) ? item('download', 'Завантажити матеріали', (pack.notes && pack.notes.downloads) || 'Презентація PowerPoint, мультфільми, роздатка та сценарій', `#/pack/${pack.id}/downloads`)
          : levelSlides(pack).length ? item('download', 'Презентація PowerPoint', 'Подивитися зразки слайдів', `#/pack/${pack.id}/downloads`) : null),
      offlineCard(pack)]);
  }

  // Інтерактив для дошки, що живе окремою сторінкою (набір «Шлях зернини»): відкриваємо з поточною версією класу.
  function boardItem(pack) {
    const b = pack.board, lv = levelOf(pack), g = { '1-4': 1, '5-7': 2, '8-11': 3 }[lv ? lv.id : '1-4'] || 1;
    return h('button', { class: 'menu-item main', onclick: () => { Sfx.tap(); track('board_' + pack.id); location.href = b.url + '?g=' + g + '&from=app'; } },
      h('div', { class: 'ico' }, icon(b.icon || 'clock')), h('h3', {}, b.title), h('div', { class: 'muted' }, (b.notes && b.notes[lv ? lv.id : '1-4']) || b.note));
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
      h('div', {}, h('div', { class: 'kicker' }, 'Обирайте епоху' + (levelOf(pack) ? ' · ' + levelOf(pack).label : '')), h('h2', {}, pack.title), classPicker(pack)),
      h('div', { class: 'timeline' }, stops, fin),
      letterBar(pack),
      h('div', { style: 'text-align:center' }, h('button', { class: 'btn ghost', onclick: () => { if (confirmReset.armed) { progress.reset(pack); route(); } else { confirmReset.armed = true; toast('Натисніть ще раз, щоб почати спочатку'); setTimeout(() => confirmReset.armed = false, 2500); } } }, '↺ Почати спочатку'))));
  }
  const confirmReset = { armed: false };

  // ---------------------------------------------------------------- плеєр
  // Власні кнопки замість браузерних: субтитри вмикаються за бажанням (тексти — pack.subs, у кадрі їх немає),
  // у меню немає «Завантажити». Повністю заборонити збереження відео браузер не дозволяє — лише ускладнити.
  const SUB_SIZES = [['s', 'Малі'], ['m', 'Середні'], ['l', 'Великі']];
  const fmtTime = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function player(pack, file, { poster, autoplay, fallback } = {}) {
    const pref = store.get('dyvo_subs', { on: true, size: 'm' });
    const cues = (pack.subs && pack.subs[file]) || [];
    const video = h('video', { src: asset(pack, file), poster: poster || null, playsinline: true, preload: 'metadata',
      controlslist: 'nodownload noplaybackrate noremoteplayback', disablepictureinpicture: true, disableremoteplayback: true });
    // висока якість (R2) недоступна — беремо стиснену копію з сайту (локальний перегляд, збій сховища)
    if (fallback) video.addEventListener('error', () => { if (video.dataset.fb) return; video.dataset.fb = 1; video.src = asset(pack, fallback); if (autoplay) video.play().catch(() => {}); }, { once: true });
    const sub = h('div', { class: 'vp-sub', 'aria-live': 'off' });
    const bigPlay = h('button', { class: 'vp-big', 'aria-label': 'Відтворити' }, icon('playbar'));
    const playBtn = h('button', { class: 'vp-btn', 'aria-label': 'Відтворити або пауза' }, icon('playbar'));
    const seek = h('input', { class: 'vp-seek', type: 'range', min: 0, max: 1000, value: 0, step: 1, 'aria-label': 'Перемотування' });
    const time = h('span', { class: 'vp-time' }, '0:00 / 0:00');
    // гучність: окремо від «звуків інтерфейсу» (Sfx) — щоб було видно, чи звук мультфільму ввімкнено
    // зберігаємо лише рівень; «без звуку» не запам'ятовуємо, щоб наступного разу мультфільм не стартував німим
    const vol = { v: Math.max(0.2, +store.get('dyvo_vol', 1) || 1), m: false };
    const volBtn = h('button', { class: 'vp-btn vp-vol-btn', 'aria-label': 'Вимкнути або ввімкнути звук мультфільму' });
    const volRange = h('input', { class: 'vp-vol', type: 'range', min: 0, max: 100, step: 1, 'aria-label': 'Гучність мультфільму' });
    const ccBtn = h('button', { class: 'vp-btn vp-cc', 'aria-label': 'Субтитри', 'aria-haspopup': 'true' }, icon('cc'), h('span', { class: 'vp-cc-label' }, 'Субтитри'));
    const menu = h('div', { class: 'vp-menu', role: 'menu', hidden: true });
    const fsBtn = h('button', { class: 'vp-btn', 'aria-label': 'На весь екран' }, icon('full'));
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
      video.volume = vol.v;
      video.muted = vol.m;
      const silent = vol.m || vol.v === 0;
      volBtn.replaceChildren(icon(silent ? 'mute' : 'sound'));
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

    let shown = -1;
    const showSub = () => {
      const t = video.currentTime;
      const i = pref.on ? cues.findIndex(c => t >= c[0] && t <= c[1]) : -1;
      if (i === shown) return;
      shown = i;
      sub.replaceChildren(...(i >= 0 ? [h('span', {}, cues[i][2])] : []));
    };
    const toggle = () => { if (video.paused) video.play().catch(() => {}); else video.pause(); };
    const syncBtn = () => {
      playBtn.replaceChildren(icon(video.paused ? 'playbar' : 'pause'));
      box.classList.toggle('playing', !video.paused);
    };
    const syncTime = () => {
      const d = video.duration || 0;
      if (!seeking) seek.value = d ? Math.round(video.currentTime / d * 1000) : 0;
      time.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(d);
    };
    let seeking = false;
    seek.addEventListener('input', () => { seeking = true; if (video.duration) video.currentTime = seek.value / 1000 * video.duration; });
    seek.addEventListener('change', () => { seeking = false; });
    // субтитри за кадром — точніше, ніж timeupdate (4 рази на секунду)
    const tick = () => { showSub(); syncTime(); if (!video.paused && box.isConnected) requestAnimationFrame(tick); };
    video.addEventListener('play', () => { syncBtn(); requestAnimationFrame(tick); });
    video.addEventListener('pause', () => { syncBtn(); poke(); });
    video.addEventListener('ended', () => { syncBtn(); track('end'); });
    video.addEventListener('play', () => track('play'), { once: true });
    video.addEventListener('timeupdate', () => {
      const part = video.duration ? video.currentTime / video.duration : 0;
      if (part >= 0.5) track('half');
      if (part >= 0.95) track('end');
    });
    ['loadedmetadata', 'seeked', 'timeupdate'].forEach(ev => video.addEventListener(ev, () => { syncTime(); showSub(); }));
    video.onclick = toggle;
    bigPlay.onclick = toggle;
    playBtn.onclick = toggle;
    fsBtn.onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();   // iPhone: лише системний повноекранний режим
    };
    // кнопки ховаються, коли мультфільм іде й мишка не рухається
    let idle;
    const poke = () => { box.classList.remove('idle'); clearTimeout(idle); if (!video.paused) idle = setTimeout(() => menu.hidden && box.classList.add('idle'), 2500); };
    box.addEventListener('pointermove', poke);
    box.addEventListener('pointerdown', poke);
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
      poke();
    });
    applyPref();
    applyVol();
    if (autoplay) video.play().catch(() => {});
    return box;
  }

  // ---------------------------------------------------------------- зупинка
  function stop(pack, s) {
    track('stop');
    const vsrc = !license.allows(pack.id) && s.demoVideo ? s.demoVideo : s.video;   // demoVideo — окреме відео для демо, якщо задано
    const video = vsrc
      ? h('div', { class: 'video-box' }, player(pack, vsrc, { poster: s.poster ? asset(pack, s.poster) : null }))
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
    track('task');
    const solved = () => {
      Sfx.letter(); track('done');
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
        // на картках усі слова з великої букви й без розділових знаків, щоб не підказувати перше й останнє слово;
        // у зібраному рядку — як в оригіналі. Порівнюємо за написом на картці: однакові слова («Ні… ні») взаємозамінні.
        const chips = h('div', { class: 'chips' }, shuffledNot(line).map(w => h('button', { class: 'chip', onclick: e => {
          if (chipLabel(w) === chipLabel(line[i])) {
            if (i === 0) row.replaceChildren();
            row.append(h('div', { class: 'ans pop' }, line[i]));
            e.currentTarget.classList.add('picked'); Sfx.pick(i); i++;
            if (i === line.length) {
              round++;
              setTimeout(() => round < t.rounds.length ? (Sfx.right(), play()) : solved(), 700);
            }
          } else shake(e.currentTarget);
        } }, chipLabel(w))));
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

  // рядок на дипломі: школа й педагог із профілю акаунта
  function teacherLine() {
    const l = license.get() || {};
    const parts = [l.school, l.name ? 'Педагог: ' + l.name : ''].filter(Boolean);
    return l.account && parts.length ? h('div', { class: 'diploma-teacher' }, parts.join(' · ')) : null;
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
            h('input', { id: 'diploma-name', placeholder: 'Ім\'я або назва класу', 'aria-label': 'Ім\'я', value: currentClass() ? className(currentClass()) : null }),
            h('p', { class: 'lead' }, `за подорож від першої абетки до сьогодення та слово «${target}», яке ми зберегли разом`),
            h('div', { class: 'muted' }, `${pack.date} · День української писемності та мови`),
            teacherLine(),
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
    const slot = h('div', { class: 'player' });
    const list = h('div', { class: 'list' }, pack.cartoons.map(c => h('button', { class: 'row' + (c.ready ? '' : ' off'), onclick: () => {
      if (!c.ready) { toast('Цей мультфільм ще в роботі'); return; }
      if (!license.allows(pack.id) && !c.demo) return lockedDialog();
      Sfx.tap();
      slot.replaceChildren(h('h3', {}, c.title), player(pack, c.file, { autoplay: true, poster: c.poster ? asset(pack, c.poster) : null, fallback: c.download }));
      slot.scrollIntoView({ behavior: 'smooth' });
    } }, h('span', { style: 'font-size:1.8em;color:var(--red)' }, icon(c.ready ? 'play' : 'wait')), h('div', { class: 'grow' }, h('h3', {}, c.title), h('div', { class: 'muted' }, c.ready ? 'Дивитися' : 'Незабаром')))));
    frame([pack.title, ' · ', h('b', {}, 'Мультфільми')], [h('h2', {}, 'Мультфільми'), list, slot]);
  }

  // демо: зразки картинками з водяним знаком «ЗРАЗОК» (сторінки роздатки, слайди презентації); справжні файли — лише з кодом
  const previewPages = (pack, list, prefix) => list.flatMap(d => Array.from({ length: d.previews || 0 }, (_, i) => asset(pack, `img/${d.preview || prefix}${String(i + 1).padStart(2, '0')}.jpg`)));
  const levelSlides = pack => { const l = levelOf(pack); return previewPages(pack, (pack.presentations || []).filter(d => !l || !d.levels || d.levels.includes(l.id)), 'pptx14-'); };
  function sampleViewer(pages, what) {
    return i => {
      const img = h('img', { src: pages[i], alt: `${what} ${i + 1}` });
      const count = h('div', { class: 'muted' }, `${i + 1} з ${pages.length}`);
      const show = n => { i = (n + pages.length) % pages.length; img.src = pages[i]; img.alt = `${what} ${i + 1}`; count.textContent = `${i + 1} з ${pages.length}`; };
      const close = () => { box.remove(); removeEventListener('keydown', keys); };
      const keys = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(i + 1); else if (e.key === 'ArrowLeft') show(i - 1); };
      const box = h('div', { class: 'lightbox', role: 'dialog', 'aria-label': what, onclick: e => { if (e.target === box) close(); } },
        h('button', { class: 'icon-btn nav prev', 'aria-label': 'Попередній', onclick: () => show(i - 1) }, '‹'),
        h('figure', {}, img, count),
        h('button', { class: 'icon-btn nav next', 'aria-label': 'Наступний', onclick: () => show(i + 1) }, '›'),
        h('button', { class: 'icon-btn close', 'aria-label': 'Закрити', onclick: close }, '×'));
      addEventListener('keydown', keys);
      document.body.append(box);
    };
  }
  function handoutSamples(pack) {
    const pages = previewPages(pack, levelHandouts(pack), 'handout-');
    if (!pages.length) { lockedDialog(); return packHome(pack); }
    track('samples');
    const open = sampleViewer(pages, 'Зразок сторінки роздатки');
    frame([pack.title, ' · ', h('b', {}, 'Роздатка')], [
      h('h2', {}, 'Роздатка для друку'),
      levelPicker(pack),
      h('div', { class: 'card-soft sample-note' },
        h('div', { class: 'kicker' }, 'Демо-версія'),
        h('p', {}, 'Так виглядають сторінки роздатки. У повному наборі — PDF для друку без водяних знаків (' + levelHandouts(pack).map(d => d.note).join(', ') + ') і відповіді для вчителя.'),
        h('div', { class: 'chips' },
          h('button', { class: 'btn', onclick: enterCode }, 'Ввести код'),
          h('a', { class: 'btn ghost', href: 'https://dyvourok.com.ua/?from=demo-rozdatka#peredzamovlennia', target: '_blank', rel: 'noopener', onclick: () => track('want') }, 'Хочу повну версію'))),
      h('div', { class: 'samples' }, pages.map((src, i) => h('button', { class: 'sample', 'aria-label': `Зразок сторінки ${i + 1}`, onclick: () => { Sfx.tap(); open(i); } },
        h('img', { src, alt: '', loading: 'lazy', onload: e => e.target.naturalWidth > e.target.naturalHeight && e.target.parentNode.classList.add('wide') }))))]);
  }

  function handouts(pack) {
    if (!license.allows(pack.id)) return handoutSamples(pack);
    frame([pack.title, ' · ', h('b', {}, 'Роздатка')], [
      h('h2', {}, 'Роздатка для друку'),
      levelPicker(pack),
      h('div', { class: 'list' }, levelHandouts(pack).map(d => h('a', { class: 'row', href: asset(pack, d.file), target: '_blank', rel: 'noopener' },
        h('span', { style: 'font-size:1.8em;color:var(--red)' }, icon('doc')),
        h('div', { class: 'grow' }, h('h3', {}, d.title), h('div', { class: 'muted' }, d.note)),
        h('span', { class: 'btn' }, 'Відкрити'))))]);
  }

  function teacher(pack) {
    if (!license.allows(pack.id)) { lockedDialog(); return packHome(pack); }
    const t = byLevel(pack, pack.teacher);
    frame([pack.title, ' · ', h('b', {}, 'Для вчителя')], [
      h('h2', {}, 'Сценарій заходу на 45 хвилин'),
      levelPicker(pack),
      h('div', { class: 'teacher' },
        h('div', { class: 'card-soft' }, h('table', { class: 'plan' }, t.minutes.map(([m, txt]) => h('tr', {}, h('td', {}, m), h('td', {}, txt))))),
        h('div', { style: 'display:flex;flex-direction:column;gap:22px' },
          h('div', { class: 'card-soft' }, h('h3', {}, 'Поради'), h('ul', { class: 'clean' }, t.tips.map(x => h('li', {}, x)))),
          h('div', { class: 'card-soft' }, h('h3', {}, 'Відповіді'), h('ul', { class: 'clean' }, t.answers.map(x => h('li', {}, x))))))]);
  }

  function slideSamples(pack) {
    const pages = levelSlides(pack);
    if (!pages.length) { lockedDialog(); return packHome(pack); }
    track('slides');
    const open = sampleViewer(pages, 'Зразок слайда');
    frame([pack.title, ' · ', h('b', {}, 'Презентація')], [
      h('h2', {}, 'Презентація PowerPoint'),
      levelPicker(pack),
      h('div', { class: 'card-soft sample-note' },
        h('div', { class: 'kicker' }, 'Демо-версія'),
        h('p', {}, 'Так виглядає зупинка «Тарас Шевченко» у презентації. У повному наборі — файл PowerPoint для вашого класу без водяних знаків: усі 5 зупинок, мультфільми вже всередині, анімації й відповіді відкриваються по кліку, працює без інтернету, можна редагувати під свій клас.'),
        h('div', { class: 'chips' },
          h('button', { class: 'btn', onclick: enterCode }, 'Ввести код'),
          h('a', { class: 'btn ghost', href: 'https://dyvourok.com.ua/?from=demo-pptx#peredzamovlennia', target: '_blank', rel: 'noopener', onclick: () => track('want') }, 'Хочу повну версію'))),
      h('div', { class: 'samples slides' }, pages.map((src, i) => h('button', { class: 'sample slide', 'aria-label': `Зразок слайда ${i + 1}`, onclick: () => { Sfx.tap(); open(i); } },
        h('img', { src, alt: '', loading: 'lazy' }))))]);
  }

  function downloads(pack) {
    if (!license.allows(pack.id)) return slideSamples(pack);
    const fileRow = (title, note, file, kind, name) => h('a', {
      class: 'row download-row', href: asset(pack, file) + (name ? '?name=' + encodeURIComponent(name) : ''), download: name || file.split('/').pop(),
      onclick: () => track('download_' + kind)
    }, h('span', { class: 'download-ico' }, icon('download')),
    h('div', { class: 'grow' }, h('h3', {}, title), h('div', { class: 'muted' }, note)),
    h('span', { class: 'btn ghost compact' }, 'Завантажити'));
    const cartoonsList = pack.cartoons.filter(c => c.ready).map(c => fileRow(c.title, 'MP4 з озвученням', c.download || c.file, 'video'));
    const handoutsList = levelHandouts(pack).map(d => fileRow(d.title, d.note, d.file, 'pdf'));
    const lv = levelOf(pack);
    const pptList = (pack.presentations || []).filter(d => !lv || !d.levels || d.levels.includes(lv.id)).map(d => fileRow(d.title, d.note, d.file, 'pptx', d.name));
    const teacherData = byLevel(pack, pack.teacher);
    const guide = fileRow('Сценарій, поради та відповіді', '1 сторінка A4 · PDF', teacherData.file, 'teacher');
    frame([pack.title, ' · ', h('b', {}, 'Завантаження')], [
      h('div', { class: 'download-head' },
        h('h2', {}, 'Завантажити окремі матеріали'),
        h('p', { class: 'lead' }, 'Файли з’являться у папці «Завантаження». Для інтерактивного квесту скористайтеся кнопкою «Зберегти весь набір» на головній сторінці набору.')),
      levelPicker(pack),
      pptList.length ? h('section', { class: 'download-section' }, h('h3', {}, 'Презентація PowerPoint'), h('p', { class: 'muted download-note' }, 'Для уроку без застосунку: клікабельна карта, анімації «по кліку», вікторини й нотатки для вчителя. Можна редагувати під свій клас.'), h('div', { class: 'list' }, pptList)) : null,
      h('section', { class: 'download-section' }, h('h3', {}, 'Мультфільми'), h('p', { class: 'muted download-note' }, 'У файлах є озвучення. Субтитри вмикаються лише у плеєрі «Дивоуроку».'), h('div', { class: 'list' }, cartoonsList)),
      h('section', { class: 'download-section' }, h('h3', {}, 'Роздатка для обраного класу'), h('div', { class: 'list' }, handoutsList)),
      h('section', { class: 'download-section' }, h('h3', {}, 'Для вчителя'), h('div', { class: 'list' }, guide)),
      h('div', { class: 'muted download-foot' },
        h('p', {}, 'Завантажені файли не оновлюються автоматично. Актуальна версія завжди залишається у «Дивоуроці».'),
        h('p', {}, 'На iPhone або iPad файл може спочатку відкритися. Тоді натисніть «Поділитися» та виберіть «Зберегти у Файли».'))
    ]);
  }

  function sources(pack) {
    const data = pack.sources;
    if (!data || !data.groups) return packHome(pack);
    const sourceCount = data.groups.reduce((count, group) => count + group.items.length, 0);
    const jump = group => {
      const target = document.getElementById('sources-' + group.id);
      if (target) target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    };
    const sourceLink = source => h('a', {
      class: 'source-row', href: source.url, target: '_blank', rel: 'noopener noreferrer',
      'aria-label': `${source.title}. Відкрити джерело в новій вкладці`
    },
      h('span', { class: 'source-kind ' + source.type }, source.label),
      h('span', { class: 'source-copy' },
        h('strong', {}, source.title),
        h('span', {}, source.detail)),
      h('span', { class: 'source-open', 'aria-hidden': 'true' }, 'Відкрити ↗'));
    frame([pack.title, ' · ', h('b', {}, 'Джерела й фактчек')], [
      h('header', { class: 'sources-head' },
        h('div', { class: 'kicker' }, `Перевірено ${data.checked} · ${sourceCount} джерела`),
        h('h2', {}, 'Джерела й фактчек'),
        h('p', { class: 'lead' }, data.intro),
        h('div', { class: 'evidence-legend', 'aria-label': 'Типи використаних джерел' },
          h('span', {}, h('b', {}, 'Офіційні'), ' закони та установи'),
          h('span', {}, h('b', {}, 'Первинні'), ' твори й документи'),
          h('span', {}, h('b', {}, 'Академічні'), ' енциклопедії та дослідження'))),
      h('nav', { class: 'source-jumps', 'aria-label': 'Розділи джерел' },
        data.groups.map(group => h('button', { onclick: () => jump(group) }, group.short || group.title))),
      h('div', { class: 'source-groups' }, data.groups.map((group, index) => h('section', { class: 'source-group', id: 'sources-' + group.id },
        h('div', { class: 'source-topic' },
          h('span', { class: 'source-number', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0')),
          h('div', {}, h('h3', {}, group.title), h('p', {}, group.fact))),
        h('div', { class: 'source-list' }, group.items.map(sourceLink))))),
      h('aside', { class: 'source-note' },
        h('div', { class: 'source-note-icon' }, icon('verified')),
        h('div', {}, h('h3', {}, 'Як ми перевіряємо матеріали'), h('p', {}, data.method))),
      h('p', { class: 'source-offline muted' }, 'Список джерел зберігається разом із набором. Для відкриття зовнішніх сторінок потрібен інтернет.')
    ]);
  }

  function account() {
    const l = license.get();
    const logout = async () => {
      try { await api('/api/session', 'DELETE'); } catch (e) {}
      await clearOffline();   // збережені файли набору не лишаються на пристрої після виходу
      if (l.account) cloud.clear();   // класи й прогрес лишаються в акаунті, на чужій дошці — ні
      license.clear(); toast(l.account ? 'Ви вийшли з акаунта на цьому пристрої.' : 'Ви вийшли. Місце для пристрою звільнено.'); go('#/'); route();
    };
    const packNames = packs => packs === '*' ? 'усі' : packs ? packs.split(',').map(id => (PACKS.find(p => p.id === id) || { title: id }).title).join(', ') : 'поки немає';
    const day = ms => new Date(ms).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });

    if (l && l.account) {
      const nameInput = h('input', { class: 'name-input', value: l.name || '', maxlength: '120', placeholder: 'Ім\'я та прізвище', 'aria-label': 'Ім\'я' });
      const schoolInput = h('input', { class: 'name-input', value: l.school || '', maxlength: '160', placeholder: 'Наприклад, Ліцей № 5, м. Житомир', 'aria-label': 'Школа' });
      const saveProfile = h('button', { class: 'btn ghost compact', onclick: async () => {
        const r = await api('/api/me', 'POST', { name: nameInput.value, school: schoolInput.value }).catch(() => ({ ok: false }));
        if (r.ok) { license.set(r.data); Sfx.right(); toast('Збережено'); } else toast(offlineMsg);
      } }, 'Зберегти');
      const news = h('input', { type: 'checkbox', checked: l.news === 1, onchange: async () => {
        const r = await api('/api/me', 'POST', { news: news.checked }).catch(() => ({ ok: false }));
        if (r.ok) { license.set(r.data); toast(news.checked ? 'Дякуємо! Повідомимо про нові набори.' : 'Листів більше не надсилатимемо.'); }
        else { news.checked = !news.checked; toast(offlineMsg); }
      } });
      const purchases = h('div', { class: 'account-details' }, h('p', { class: 'muted' }, 'Завантажуємо…'));
      const devices = h('div', { class: 'account-details' });
      api('/api/me', 'GET').then(r => {
        if (!r.ok) { purchases.replaceChildren(h('p', { class: 'muted' }, 'Не вдалося завантажити дані акаунта.')); return; }
        const d = r.data;
        const owned = [
          ...(d.free_packs || []).map(p => h('li', {}, h('b', {}, packNames(p.pack_id)), ' · безкоштовно · додано ' + day(p.claimed_at))),
          ...d.codes.map(c => h('li', {}, h('b', {}, packNames(c.packs)), c.since ? ' · з ' + day(c.since) : '', ' · код ', c.code,
            c.expires_at ? ' · діє до ' + day(c.expires_at) : ''))
        ];
        purchases.replaceChildren(owned.length
          ? h('ul', { class: 'clean' }, owned)
          : h('p', { class: 'muted' }, 'Наборів ще немає. Безкоштовний набір можна додати в бібліотеці, а придбаний — відкрити кодом з листа.'));
        const others = d.sessions.filter(x => !x.current).length;
        devices.replaceChildren(...[
          h('ul', { class: 'clean' }, d.sessions.map(x => h('li', {}, x.label || 'Пристрій', x.current ? ' (цей пристрій)' : ' · востаннє ' + new Date(x.last_seen).toLocaleDateString('uk-UA')))),
          others ? h('button', { class: 'linkish', onclick: async () => {
            if (!confirm('Вийти з акаунта на всіх інших пристроях (' + others + ')?')) return;
            const r2 = await api('/api/me', 'POST', { action: 'logout-others' }).catch(() => ({ ok: false }));
            if (r2.ok) { toast('Готово: інші пристрої вийшли з акаунта'); route(); } else toast(offlineMsg);
          } }, 'Вийти на всіх інших пристроях') : null].filter(Boolean));
      }).catch(() => purchases.replaceChildren(h('p', { class: 'muted' }, offlineMsg)));
      const list = classes();

      return frame(h('b', {}, 'Акаунт'), h('div', { class: 'gate account' },
        h('h1', {}, 'Ваш акаунт'),
        h('div', { class: 'card-soft account-card' },
          h('div', {}, h('b', {}, 'Пошта: '), l.email),
          h('label', { class: 'name-label' }, h('b', {}, 'Ім\'я'), nameInput),
          h('label', { class: 'name-label' }, h('b', {}, 'Школа'), schoolInput),
          h('p', { class: 'muted small' }, 'Ім\'я й школа з\'являться на дипломах учнів.'),
          h('div', {}, saveProfile),
          h('label', { class: 'check' }, news, h('span', {}, 'Повідомляти про нові набори й нагадувати за тиждень до свята. Не частіше двох листів на місяць.'))),
        h('div', { class: 'card-soft account-card' },
          h('h3', {}, 'Мої набори'),
          purchases),
        h('div', { class: 'card-soft code-card' },
          h('h3', {}, 'Додати код доступу'),
          h('p', { class: 'muted' }, 'Код прив\'яжеться до акаунта. Обмеження на кількість пристроїв для акаунта немає.'),
          codeBox(() => { toast('Код додано'); route(); })),
        h('div', { class: 'card-soft account-card' },
          h('h3', {}, 'Мої класи'),
          list.length ? h('div', { class: 'chips' }, list.map(c => h('button', { class: 'chip', onclick: () => classDialog(c, PACKS[0]) }, c.name, ' ✎')))
            : h('p', { class: 'muted' }, 'Класів ще немає. Додайте їх на сторінці набору («Мій клас»), щоб вести прогрес квесту окремо для кожного.'),
          h('button', { class: 'linkish', onclick: () => classDialog(null, PACKS[0]) }, '+ Додати клас')),
        h('div', { class: 'card-soft account-card' },
          h('h3', {}, 'Де ви увійшли'),
          devices),
        h('button', { class: 'btn ghost', onclick: logout }, 'Вийти на цьому пристрої'),
        ownsAny() ? contactLine() : buyHint(),   // у buyHint уже є рядок з поштою
        h('button', { class: 'linkish danger', onclick: async () => {
          if (!confirm('Видалити акаунт ' + l.email + '? Класи й прогрес зникнуть. Куплені коди лишаться дійсними: їх можна буде ввести знову.')) return;
          if (!confirm('Точно видалити? Цю дію не можна скасувати.')) return;
          const r = await api('/api/me', 'DELETE').catch(() => ({ ok: false }));
          if (!r.ok) { toast(offlineMsg); return; }
          await clearOffline(); cloud.clear(); license.clear();
          toast('Акаунт видалено.'); go('#/'); route();
        } }, 'Видалити акаунт')));
    }

    frame(h('b', {}, 'Доступ'), h('div', { class: 'gate' },
      h('h1', {}, l ? 'Ваш доступ' : 'Демо-режим'),
      l ? h('div', { class: 'card-soft', style: 'width:100%;text-align:left' },
        h('div', {}, h('b', {}, 'Власник: '), l.note || '—'),
        h('div', {}, h('b', {}, 'Набори: '), packNames(l.packs)),
        OFFLINE_FILE ? null : h('div', {}, h('b', {}, 'Сесія до: '), new Date(l.exp).toLocaleDateString('uk-UA')))
        : h('p', { class: 'lead' }, 'Без коду доступна зупинка «Тарас Шевченко».'),
      OFFLINE_FILE ? null : h('div', { class: 'card-soft code-card' },
        h('h3', {}, l ? 'Збережіть доступ в акаунті' : 'Увійдіть'),
        h('p', { class: 'muted' }, l ? 'Увійдіть через Google або пошту: ваш код перейде в акаунт, набір відкриватиметься на будь-якому пристрої без коду, а класи й прогрес синхронізуються.'
          : 'Увійдіть в акаунт, щоб відкрити свої набори.'),
        loginBox(() => { toast('Ви увійшли'); route(); })),
      l && !OFFLINE_FILE ? h('button', { class: 'btn ghost', onclick: logout }, 'Вийти з цього пристрою') : null,
      !l ? h('button', { class: 'btn ghost', onclick: () => { store.set('dyvo_demo', false); go('#/'); route(); } }, 'Ввести код доступу') : null,
      l ? h('p', { class: 'muted' }, 'Один код працює на кількох пристроях (наприклад, дошка, ноутбук і телефон). Щоб перенести доступ на новий пристрій, вийдіть на старому.') : null,
      contactLine()));
  }

  // ---------------------------------------------------------------- маршрути
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    // посилання «Спробувати безкоштовно» з сайту: одразу в демо набору (#/demo/mova/sources — одразу на потрібну сторінку)
    if (parts[0] === 'demo') {
      if (!license.get()) store.set('dyvo_demo', true);
      // без набору — у бібліотеку: там і безкоштовні набори, і демо платних
      if (!parts[1]) { history.replaceState(null, '', location.pathname + location.search + '#/library'); return route(); }
      // replaceState з повним шляхом: відносна адреса розв'язалася б від <base> і вела б на головну сайту
      history.replaceState(null, '', location.pathname + location.search + '#/pack/' + (parts[1] || 'mova') + (parts[2] ? '/' + parts.slice(2).join('/') : ''));
      return route();
    }
    if (parts[0] === 'login' || parts[0] === 'login-ok' || parts[0] === 'login-error') return finishLogin(parts[0], parts[1]);
    const requestedPack = PACKS.find(p => p.id === (parts[0] === 'claim' ? parts[1] : parts[1]));
    if (parts[0] === 'claim' && requestedPack && requestedPack.claimable) {
      if (license.allows(requestedPack.id)) { go('#/pack/' + requestedPack.id); return; }
      return isAccount() ? claimFreePack(requestedPack) : freePackGate(requestedPack);
    }
    if (!hasAccess()) {
      if (parts[0] === 'pack' && requestedPack && requestedPack.claimable) return freePackGate(requestedPack);
      return gate();
    }
    if (isDemo()) track('start');
    if (parts[0] === 'account') return account();
    const pack = requestedPack;
    const byId = id => pack && pack.stops.find(s => s.id === id);
    if (parts[0] !== 'pack' || !pack) return library();
    if (pack.claimable && !license.allows(pack.id)) return freePackGate(pack);
    const view = parts[2];
    if (!view) return packHome(pack);
    if (view === 'map') return map(pack);
    const s = byLevel(pack, byId(parts[3]));
    if ((view === 'stop' || view === 'task') && s && !canOpen(pack, s.id)) { lockedDialog(); return map(pack); }
    if (view === 'stop' && s) return stop(pack, s);
    if (view === 'task' && s) return taskScreen(pack, s);
    if (view === 'final') { if (!license.allows(pack.id)) { lockedDialog(); return map(pack); } return final(pack); }
    if (view === 'cartoons') return cartoons(pack);
    if (view === 'handouts') return handouts(pack);
    if (view === 'teacher') return teacher(pack);
    if (view === 'sources') return sources(pack);
    if (view === 'downloads') return downloads(pack);
    return packHome(pack);
  }

  window.addEventListener('hashchange', () => { document.querySelectorAll('.reward').forEach(r => r.remove()); route(); });
  let seen = false;
  try { seen = sessionStorage.getItem('dyvo_splash') === '1'; sessionStorage.setItem('dyvo_splash', '1'); } catch (e) {}
  if (/[?&]nosplash/.test(location.search)) seen = true;   // для скриншотів і вбудовування
  if (seen) route(); else { route(); splash(() => {}); }
  refreshLicense();
  cloud.sync(true);
  news.load();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - cloud.lastSync > 30000) cloud.sync(true);
    if (Date.now() - news.lastLoad > 10 * 6e4) news.load();
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
