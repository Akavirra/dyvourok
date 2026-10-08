/* Адмінка: продажі, новий код, покупці, заявки з сайту, демо. */
  const $ = id => document.getElementById(id);
  let token = sessionStorage.getItem('dyvo_admin') || '';
  let all = [];
  let pre = [];
  let editing = '';          // код, картка якого зараз редагується
  let fromPre = '';          // контакт заявки, з якої заповнили форму нового коду

  async function call(method, body, path = 'codes') {
    const r = await fetch('/api/admin/' + path, { method, headers: { 'authorization': 'Bearer ' + token, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (r.status === 403) throw new Error('forbidden');
    if (!r.ok) throw new Error(data.error || 'http ' + r.status);
    return data;
  }
  const plural = (n, one, few, many) => n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const button = (label, cls, fn) => { const b = el('button', cls, label); b.type = 'button'; b.onclick = fn; return b; };
  let toastTimer;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1700);
  }
  function copy(text, what) {
    const done = () => toast((what || 'Текст') + ' — скопійовано ✓');
    try { navigator.clipboard.writeText(text).then(done, () => prompt('Скопіюйте вручну (Ctrl+C):', text)); }
    catch (e) { prompt('Скопіюйте вручну (Ctrl+C):', text); }
  }

  // ---- вибір кнопками-чіпами замість випадного списку; значення лишається в прихованому select
  function chipify(sel) {
    const box = el('div', 'chips');
    sel.hidden = true; sel.after(box);
    sel._sync = () => box.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b.dataset.v === sel.value));
    [...sel.options].forEach(o => { const b = button(o.textContent, 'chip', () => { sel.value = o.value; sel._sync(); }); b.dataset.v = o.value; box.append(b); });
    sel._sync();
  }
  const setSel = (id, v) => { $(id).value = v; if ($(id)._sync) $(id)._sync(); };
  document.querySelectorAll('select[data-chips]').forEach(chipify);

  async function load() {
    const d = await call('GET');
    all = d.codes || [];
    render();
    await loadPre();
    renderSales();
    loadDemo();
  }

  // ---- дані покупця: нові поля або здогадка зі старої нотатки (коди, створені до окремих полів)
  const PRICE = 250;
  const SOURCE_LABEL = { messenger: 'Messenger', instagram: 'Instagram', site: 'Сайт', tiktok: 'TikTok', other: 'Інше', '': '—' };
  const GRADE_LABEL = { '1-4': '1–4', '5-7': '5–7', '8-11': '8–11', '': '—' };
  const KIND_LABEL = { sale: 'Продаж', gift: 'Подарунок', test: 'Тест' };
  const kindOf = c => (c.kind && c.kind !== 'sale') ? c.kind : /^Власник/i.test(c.note || '') ? 'test' : 'sale';
  const emailOf = c => c.email || ((c.contact || '').match(/[^\s,;·]+@[^\s,;·]+\.[a-z]{2,}/i) || [''])[0];
  function sourceOf(c) {
    if (c.source) return c.source;
    const t = (c.contact || '').toLowerCase();
    return /messenger|фб|fb/.test(t) ? 'messenger' : /insta|інста/.test(t) ? 'instagram' : /tiktok|тікток/.test(t) ? 'tiktok' : /сайт|site/.test(t) ? 'site' : '';
  }
  function gradeOf(c) {
    if (c.grade) return c.grade;
    const m = (c.contact || '').match(/(\d{1,2})\s*-?\s*(?:й\s*)?клас/i);
    const n = m ? parseInt(m[1], 10) : 0;
    return n >= 1 && n <= 4 ? '1-4' : n >= 5 && n <= 7 ? '5-7' : n >= 8 && n <= 11 ? '8-11' : '';
  }
  const amountOf = c => (c.amount == null ? PRICE : c.amount);
  const paidOf = c => c.paid_at || c.created_at;
  const isSale = c => kindOf(c) === 'sale' && !c.revoked;
  const notActivated = c => isSale(c) && !c.devices && Date.now() - c.created_at > 864e5;
  const dayKey = ms => { const d = new Date(ms); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
  const fmtDate = ms => new Date(ms).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  const toDateInput = ms => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const fromDateInput = v => v ? new Date(v + 'T12:00').getTime() : null;
  function ago(ms) {
    const m = Math.round((Date.now() - ms) / 6e4);
    if (m < 2) return 'щойно';
    if (m < 60) return m + ' хв тому';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' год тому';
    if (dayKey(ms) === dayKey(Date.now() - 864e5)) return 'учора';
    return fmtDate(ms);
  }
  // аватарка: ініціали й колір, сталий для імені
  const AVA = ['#C8341F', '#1F4E8C', '#2E7D4F', '#B07A00', '#7A4E9C', '#2F7A7A'];
  const initials = s => (s || '?').replace(/[«»"']/g, '').split(/\s+/).filter(w => /\p{L}/u.test(w[0] || '')).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  const colorFor = s => AVA[[...(s || '')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % AVA.length];
  function avatar(name) { const a = el('div', 'ava', initials(name)); a.style.background = colorFor(name); a.setAttribute('aria-hidden', 'true'); return a; }

  // ---- тексти для покупця (ті самі, що на сторінці шаблонів)
  const APP = location.origin + '/app/';
  const SUBJECT = 'Ваш код доступу до «Машини часу рідної мови»';
  const hiOf = c => c.hi || 'Вітаємо';
  const howto = c => `1. Відкрийте ${APP}
2. Вставте код у поле «Код доступу» й натисніть «Увійти» — відкриється весь набір «Машина часу рідної мови». (Якщо раніше відкривали демо, спершу натисніть «Ввести код» угорі.)
3. На сторінці набору вгорі оберіть свій клас: 1–4, 5–7 або 8–11.
4. Щоб працювало без інтернету, натисніть там же «Робота без інтернету → Зберегти» (≈100 МБ).`;
  const WISH = `Якщо виникнуть питання чи щось не відкриється — пишіть сюди або на info@dyvourok.com.ua, ми завжди на зв'язку й швидко допоможемо 🙂

Бажаємо натхненного уроку, і щоб ваші учні з радістю мандрували в Машині часу! 📜✨`;
  const messageFor = c => `${hiOf(c)}, дякуємо! Оплату отримали 💛 Ось ваш код доступу: ${c.code}

${howto(c)}
${emailOf(c) ? `\nКод та інструкцію дублюємо на пошту ${emailOf(c)}.\n` : ''}
${WISH}`;
  const letterFor = c => `${hiOf(c)}, вітаємо!

Дякуємо за покупку в «Дивоуроці» 💛

Ваш код доступу: ${c.code}

Як почати:
${howto(c)}

Код працює на ${c.max_devices || 3} пристроях (наприклад, дошка, ноутбук і телефон). Щоб перенести доступ на інший пристрій, на старому натисніть іконку людини вгорі → «Вийти з цього пристрою».

Роздатку для друку (PDF) і сценарій уроку знайдете в наборі: розділи «Роздатка» та «Для вчителя».

${WISH}

Команда «Дивоурок»`;
  const reminderFor = c => `${hiOf(c)}, вітаємо! Вдалося відкрити набір «Машина часу рідної мови»? 🙂 Нагадую ваш код: ${c.code}

${howto(c)}

Якщо щось не виходить — напишіть, допоможу.`;

  // код-фішка (клік — копіювати лише код) і кнопки готових текстів
  function copySet(c) {
    const box = el('div', 'p-acts');
    const chip = button(c.code, 'codechip', () => copy(c.code, 'Код'));
    chip.title = 'Копіювати лише код';
    box.append(chip,
      button('Повідомлення', 'btn soft sm', () => copy(messageFor(c), 'Повідомлення')),
      button('Лист', 'btn soft sm', () => copy(letterFor(c), 'Лист')),
      button('Тема листа', 'btn soft sm', () => copy(SUBJECT, 'Тема листа')));
    return box;
  }
  function menu(items) {
    const d = el('details', 'menu');
    const s = el('summary', null, '⋯'); s.setAttribute('aria-label', 'Ще дії');
    const pop = el('div', 'pop');
    items.forEach(([label, fn, danger]) => pop.append(button(label, danger ? 'danger' : '', () => { d.open = false; fn(); })));
    d.append(s, pop);
    return d;
  }
  document.addEventListener('click', e => document.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; }));

  // ---- продажі
  function renderSales() {
    const sales = all.filter(isSale);
    const now = Date.now(), today = dayKey(now);
    const sum = list => list.reduce((s, c) => s + amountOf(c), 0);
    const tToday = sales.filter(c => dayKey(paidOf(c)) === today);
    const tWeek = sales.filter(c => paidOf(c) > now - 7 * 864e5);
    const kpi = (n, money, label) => { const d = el('div', 'kpi'); d.append(el('b', null, n), el('span', null, `${label} · ${money.toLocaleString('uk-UA')} ₴`)); return d; };
    $('kpis').replaceChildren(kpi(tToday.length, sum(tToday), 'сьогодні'), kpi(tWeek.length, sum(tWeek), 'за 7 днів'), kpi(sales.length, sum(sales), 'усього'));
    const tally = (fn, labels) => Object.entries(sales.reduce((m, c) => (m[fn(c)] = (m[fn(c)] || 0) + 1, m), {}))
      .sort((a, b) => b[1] - a[1]).map(([k, n]) => `${labels[k] || k} ${n}`).join(', ');
    $('sales-split').textContent = sales.length ? `Звідки: ${tally(sourceOf, SOURCE_LABEL)}. Клас: ${tally(gradeOf, GRADE_LABEL)}. Тестові й подарункові коди сюди не входять.` : 'Продажів поки немає — усе попереду 🙂';
    const lazy = sales.filter(notActivated);
    const fresh = pre.filter(p => (p.status || 'new') === 'new');
    const todo = [];
    if (fresh.length) todo.push(`Нові заявки з сайту без відповіді: ${fresh.length} — нижче в «Заявках».`);
    if (lazy.length) todo.push(`Не відкрили набір понад добу: ${lazy.map(c => c.note || c.code).join(', ')} — надішліть «Нагадування».`);
    $('todo').hidden = !todo.length;
    $('todo').replaceChildren(...todo.map(t => el('div', null, t)));
  }

  // ---- покупці й коди
  function statusPill(c) {
    const [cls, text] = c.revoked ? ['bad', 'заблоковано']
      : c.expires_at && c.expires_at < Date.now() ? ['bad', 'минув термін']
      : c.devices >= c.max_devices ? ['full', 'усі пристрої зайняті']
      : notActivated(c) ? ['warn-p', 'ще не входили']
      : c.devices ? ['ok', 'користуються'] : ['gray', 'код видано'];
    return el('span', 'pill ' + cls, text);
  }
  function render() {
    const q = $('filter').value.trim().toLowerCase();
    const rows = all.filter(c => !q || [c.code, c.note, c.contact, c.email, c.hi].some(v => (v || '').toLowerCase().includes(q)));
    const n = all.filter(isSale).length;
    $('codes-count').textContent = n ? plural(n, 'покупець', 'покупці', 'покупців') : '';
    $('rows').replaceChildren(...(rows.length ? rows.map(personCard) : [el('div', 'empty', q ? 'Нікого не знайдено.' : 'Поки немає жодного коду. Створіть перший вище 🙂')]));
  }
  function personCard(c) {
    const kind = kindOf(c);
    const lazy = notActivated(c);
    const card = el('article', 'person' + (lazy ? ' warn' : '') + (c.revoked ? ' off' : ''));
    const head = el('div', 'p-head');
    head.append(el('span', 'name', c.note || 'Без імені'));
    if (c.hi) head.append(el('span', 'hi', '«' + c.hi + '»'));
    head.append(statusPill(c));
    if (kind !== 'sale') head.append(el('span', 'pill gray', KIND_LABEL[kind]));
    head.append(el('span', 'right', `${c.devices}/${c.max_devices} пристроїв${c.last_seen ? ' · вхід ' + ago(c.last_seen) : ''}`));
    const info = el('div', 'p-info');
    const parts = [emailOf(c), SOURCE_LABEL[sourceOf(c)], gradeOf(c) ? GRADE_LABEL[gradeOf(c)] + ' клас' : '', kind === 'sale' ? amountOf(c) + ' ₴' : '', 'оплата ' + fmtDate(paidOf(c))].filter(x => x && x !== '—');
    info.append(el('div', null, parts.join(' · ')));
    if (c.contact) info.append(el('div', 'sub', c.contact));
    if (c.packs !== 'mova') info.append(el('div', 'sub', 'Набори: ' + (c.packs === '*' ? 'усі' : c.packs)));
    const acts = copySet(c);
    if (lazy) acts.append(button('Нагадування', 'btn sun sm', () => copy(reminderFor(c), 'Нагадування')));
    acts.append(button(editing === c.code ? 'Закрити' : 'Редагувати', 'btn ghost sm', () => { editing = editing === c.code ? '' : c.code; render(); }));
    const more = [[c.revoked ? 'Розблокувати код' : 'Заблокувати код', () => act(c.revoked ? 'restore' : 'revoke', c.code), !c.revoked]];
    if (c.devices) more.push(['Скинути пристрої', () => { if (confirm('Скинути всі пристрої коду ' + c.code + '? Покупцю треба буде ввести код заново.')) act('reset-devices', c.code); }]);
    acts.append(menu(more));
    card.append(avatar(c.note || c.code), head, info, acts);
    if (editing === c.code) card.append(editBox(c));
    return card;
  }
  function editBox(c) {
    const box = el('div', 'edit');
    const field = (label, input, span) => { const l = el('label', 'f ' + span); l.append(label, input); return l; };
    const inp = (v, type) => { const i = el('input'); if (type) i.type = type; i.value = v ?? ''; return i; };
    const sel = (opts, v) => { const s = el('select'); Object.entries(opts).forEach(([k, label]) => { const o = el('option', null, label); o.value = k; s.append(o); }); s.value = v; return s; };
    const f = {
      note: inp(c.note), hi: inp(c.hi), email: inp(emailOf(c), 'email'),
      source: sel(SOURCE_LABEL, sourceOf(c)), grade: sel(GRADE_LABEL, gradeOf(c)),
      amount: inp(amountOf(c), 'number'), paid_at: inp(toDateInput(paidOf(c)), 'date'),
      kind: sel(KIND_LABEL, kindOf(c)), contact: inp(c.contact)
    };
    const grid = el('div', 'grid');
    grid.append(field('Покупець (бачить покупець)', f.note, 'c5'), field('Звертання', f.hi, 'c3'), field('Пошта', f.email, 'c4'),
      field('Звідки', f.source, 'c3'), field('Клас', f.grade, 'c2'), field('Сума, ₴', f.amount, 'c2'), field('Дата оплати', f.paid_at, 'c3'), field('Тип', f.kind, 'c2'),
      field('Нотатка', f.contact, 'c12'));
    const err = el('span', 'muted');
    const save = button('Зберегти', 'btn sm', async () => {
      const fields = Object.fromEntries(Object.entries(f).map(([k, i]) => [k, i.value]));
      fields.paid_at = fromDateInput(fields.paid_at);
      try { await call('POST', { action: 'update', code: c.code, fields }); editing = ''; toast('Збережено ✓'); load(); }
      catch (e) { err.textContent = 'Не вдалося зберегти: ' + e.message; }
    });
    const row = el('div', 'p-acts'); row.append(save, button('Скасувати', 'btn ghost sm', () => { editing = ''; render(); }), err);
    box.append(grid, row);
    return box;
  }
  async function act(action, code) { await call('POST', { action, code }); toast('Готово ✓'); load(); }

  // ---- заявки з сайту
  const STATUS = [['new', 'Нова'], ['written', 'Написали'], ['paid', 'Оплачено'], ['declined', 'Відмова']];
  async function loadPre() {
    const d = await call('GET', null, 'preorders');
    pre = d.preorders || [];
    const week = pre.filter(p => p.created_at > Date.now() - 7 * 864e5).length;
    const fresh = pre.filter(p => (p.status || 'new') === 'new').length;
    $('pre-count').textContent = pre.length;
    $('pre-week').textContent = week ? `· +${week} за тиждень` : '';
    $('lead-badge').hidden = !fresh; $('lead-badge').textContent = fresh;
    const st = Object.fromEntries(STATUS);
    const tally = fn => Object.entries(pre.reduce((m, p) => (m[fn(p)] = (m[fn(p)] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
    $('pre-stats').textContent = pre.length ? `Статус: ${tally(p => st[p.status || 'new'])}. Класи: ${tally(p => p.grade || '—')}. Звідки: ${tally(p => p.source || '—')}.` : '';
    $('pre-rows').replaceChildren(...(pre.length ? pre.map(leadCard) : [el('div', 'empty', 'Заявок поки немає. Вони з\'являться тут, щойно хтось залишить контакт на сайті.')]));
  }
  function leadCard(p) {
    const card = el('article', 'person' + ((p.status || 'new') === 'declined' ? ' off' : ''));
    const head = el('div', 'p-head');
    head.append(el('span', 'name', p.name || 'Без імені'));
    if (p.grade) head.append(el('span', 'pill gray', p.grade.replace('-', '–') + ' клас'));
    head.append(el('span', 'right', ago(p.created_at)));
    const info = el('div', 'p-info');
    info.append(el('div', null, p.contact + (p.source ? ' · з ' + p.source : '')));
    if (p.comment) info.append(el('div', 'sub', '«' + p.comment + '»'));
    const acts = el('div', 'p-acts');
    const sel = el('select', 'status ' + (p.status || 'new'));
    sel.setAttribute('aria-label', 'Статус заявки');
    STATUS.forEach(([v, label]) => { const o = el('option', null, label); o.value = v; sel.append(o); });
    sel.value = p.status || 'new';
    sel.onchange = async () => { await call('POST', { action: 'status', contact: p.contact, status: sel.value }, 'preorders'); p.status = sel.value; toast('Статус змінено ✓'); await loadPre(); renderSales(); };
    acts.append(sel,
      button('Створити код', 'btn sm', () => fillFromPreorder(p)),
      button('Копіювати контакт', 'btn soft sm', () => copy(p.contact, 'Контакт')),
      menu([['Видалити заявку', async () => { if (confirm('Видалити заявку ' + p.contact + '?')) { await call('POST', { action: 'delete', contact: p.contact }, 'preorders'); toast('Заявку видалено'); loadPre(); } }, true]]));
    card.append(avatar(p.name || p.contact), head, info, acts);
    return card;
  }
  function fillFromPreorder(p) {
    fromPre = p.contact;
    $('note').value = p.name || '';
    $('hi').value = '';
    $('email').value = p.contact.includes('@') ? p.contact : '';
    setSel('source', 'site');
    setSel('grade', p.grade === '1-2' || p.grade === '3-4' ? '1-4' : (['5-7', '8-11'].includes(p.grade) ? p.grade : ''));
    $('contact').value = p.contact.includes('@') ? '' : 'Контакт із заявки: ' + p.contact;
    $('from-pre').hidden = false;
    $('from-pre').textContent = 'Заповнено із заявки ' + p.contact + '. Допишіть прізвище й звертання. Після створення коду заявка стане «Оплачено».';
    $('new-code').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => $('note').focus(), 400);
  }
  $('pre-copy').onclick = () => {
    const emails = pre.map(p => p.contact).filter(c => c.includes('@') && !c.startsWith('@'));
    copy(emails.join(', '), `E-mail (${emails.length})`);
  };
  $('pre-csv').onclick = () => {
    const cols = ['created_at', 'contact', 'name', 'grade', 'comment', 'source', 'status'];
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = [cols.join(','), ...pre.map(p => cols.map(c => esc(c === 'created_at' ? new Date(p[c]).toISOString() : p[c])).join(','))];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'dyvourok-zaiavky.csv';
    a.click();
  };

  // ---- демо: воронка (app.js шле кроки в /api/track)
  const STEPS = [
    ['start', 'Відкрили демо'],
    ['play', 'Увімкнули мультфільм'],
    ['half', 'Додивились до половини'],
    ['end', 'Додивились до кінця'],
    ['stop', 'Відкрили зупинку квесту'],
    ['task', 'Відкрили завдання'],
    ['done', 'Розв\'язали завдання'],
    ['samples', 'Гортали зразки роздатки', true],
    ['locked', 'Натрапили на замок', true],
    ['code', 'Натиснули «Ввести код»', true],
    ['want', 'Натиснули «Хочу повну версію»'],
    ['preorder', 'Лишили заявку']
  ];
  const COLS = ['start', 'play', 'done', 'want', 'preorder'];
  // переходи з Facebook приходять з кількох адрес (l., lm., m.) — це одне джерело
  const sourceName = s => /(^|\.)facebook\.com$/.test(s) ? 'Facebook (посилання)' : /(^|\.)instagram\.com$/.test(s) ? 'Instagram (посилання)' : s;
  async function loadDemo() {
    const d = await call('GET', null, 'demo?days=' + $('demo-days').value + '&tz=' + new Date().getTimezoneOffset());
    const f = Object.fromEntries((d.funnel || []).map(r => [r.event, r.n]));
    const total = f.start || 0;
    $('demo-sum').textContent = `${total} відкрили · ${f.play || 0} дивились мультфільм · ${plural(f.preorder || 0, 'заявка', 'заявки', 'заявок')}`;
    $('demo-funnel').replaceChildren(...STEPS.map(([e, label, side]) => {
      const n = f[e] || 0, pct = total ? Math.round(n / total * 100) : 0;
      const row = el('div', 'step' + (side ? ' side' : ''));
      row.innerHTML = `<div class="lbl"></div><div class="bar"><i style="width:${n ? pct : 0}%"></i></div><div class="num">${n} <span>${e === 'start' ? '' : '· ' + pct + '%'}</span></div>`;
      row.firstChild.textContent = label;
      return row;
    }));
    const table = (rows, key, elId, empty) => {
      const m = {};
      rows.forEach(r => { const k = key === 'source' ? sourceName(r[key]) : r[key]; (m[k] = m[k] || {})[r.event] = ((m[k] || {})[r.event] || 0) + r.n; });
      const keys = Object.keys(m).sort(key === 'day' ? (a, b) => b.localeCompare(a) : (a, b) => (m[b].start || 0) - (m[a].start || 0));
      $(elId).replaceChildren(...(keys.length ? keys : [null]).map(k => {
        const tr = document.createElement('tr');
        if (k === null) { tr.innerHTML = `<td colspan="6" class="muted">${empty}</td>`; return tr; }
        const label = key === 'day' ? new Date(k + 'T12:00').toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' }) : k;
        [label, ...COLS.map(c => m[k][c] || 0)].forEach(v => tr.append(el('td', null, v)));
        return tr;
      }));
    };
    table(d.sources || [], 'source', 'demo-src', 'Поки ніхто не відкривав демо за цей період.');
    table(d.daily || [], 'day', 'demo-daily', '—');
  }
  $('demo-days').onchange = loadDemo;

  // ---- вхід
  $('enter').onclick = async () => {
    token = $('token').value.trim();
    try {
      await load();
      sessionStorage.setItem('dyvo_admin', token);
      localStorage.setItem('dyvo_notrack', 'true');   // власні проходи демо не псують статистику
      $('login').hidden = true; $('panel').hidden = false; $('topbar').hidden = false;
    } catch (e) { $('login-err').textContent = e.message === 'forbidden' ? 'Токен не підходить.' : 'Помилка: ' + e.message; }
  };
  $('token').addEventListener('keydown', e => { if (e.key === 'Enter') $('enter').click(); });
  $('top-new').addEventListener('click', () => setTimeout(() => $('note').focus(), 400));

  // ---- новий код
  $('paid').value = toDateInput(Date.now());
  $('create').onclick = async () => {
    const body = {
      note: $('note').value, hi: $('hi').value, email: $('email').value, source: $('source').value, grade: $('grade').value,
      amount: $('amount').value, paidAt: fromDateInput($('paid').value), kind: $('kind').value, contact: $('contact').value,
      count: $('count').value, maxDevices: $('max').value, packs: $('packs').value, days: $('days').value
    };
    if (!body.note.trim() && body.kind === 'sale' && !confirm('Створити код без імені покупця?')) return;
    let d;
    try { d = await call('POST', body); }
    catch (e) { toast('Не вдалося створити: ' + e.message); return; }
    const codes = d.codes || [];
    $('created-box').hidden = false;
    $('created').textContent = codes.join('\n');
    $('letter-actions').replaceChildren(copySet({ code: codes[0], hi: body.hi, email: body.email, max_devices: parseInt(body.maxDevices, 10) || 3 }));
    toast('Код створено ✓');
    if (fromPre) { try { await call('POST', { action: 'status', contact: fromPre, status: 'paid' }, 'preorders'); } catch (e) {} }
    fromPre = ''; $('from-pre').hidden = true;
    ['note', 'hi', 'email', 'contact'].forEach(id => $(id).value = '');
    $('amount').value = PRICE; $('paid').value = toDateInput(Date.now());
    setSel('kind', 'sale'); setSel('grade', ''); setSel('source', 'messenger');
    load();
  };

  $('filter').addEventListener('input', render);
  if (token) { $('token').value = token; $('enter').click(); }
