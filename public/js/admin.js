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
    loadAccounts();
    loadNews();
    loadDemo();
  }

  // ---- дані покупця: нові поля або здогадка зі старої нотатки (коди, створені до окремих полів)
  const PRICE_SWITCH = Date.parse('2026-10-20T00:00:00+03:00');   // ціна для перших покупців (250 ₴) — до 19.10 включно, далі 300 ₴
  const priceAt = ms => (ms >= PRICE_SWITCH ? 300 : 250);
  const PRICE = priceAt(Date.now());
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
  const amountOf = c => (c.amount == null ? priceAt(c.created_at) : c.amount);
  const paidOf = c => c.paid_at || c.created_at;
  const isSale = c => kindOf(c) === 'sale' && !c.revoked;
  const notActivated = c => isSale(c) && !c.devices && !c.user_id && Date.now() - c.created_at > 864e5;   // прив'язаний до акаунта — теж активовано
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
2. ${emailOf(c) ? `Увійдіть через Google або пошту ${emailOf(c)} — набір відкриється сам і буде доступний на будь-якому пристрої. Або` : 'Увійдіть через Google чи пошту й натисніть «Додати код», або'} вставте код у поле «Маєте код доступу?» і натисніть «Увійти з кодом». (Якщо раніше відкривали демо, спершу натисніть «Увійти» угорі.)
3. На сторінці набору вгорі оберіть свій клас: 1–4, 5–7 або 8–11.
4. Щоб провести весь урок без інтернету, натисніть там же «Увесь набір без інтернету → Зберегти весь набір» (≈100 МБ). Квест, мультфільми, поради, відповіді та роздатка збережуться в цьому браузері.
5. Якщо потрібні окремі файли в папці «Завантаження», відкрийте в наборі розділ «Завантажити матеріали».`;
  const WISH = `Якщо виникнуть питання чи щось не відкриється — пишіть сюди або на info@dyvourok.com.ua, ми завжди на зв'язку й швидко допоможемо 🙂

Бажаємо натхненного уроку, і щоб ваші учні з радістю мандрували в Машині часу! 📜✨`;
  const FOLLOW = 'Підписуйтесь на нашу сторінку facebook.com/dyvourok — там ідеї для уроків і перші новини про нові набори 💛';
  const messageFor = c => `${hiOf(c)}, дякуємо! Оплату отримали 💛 Ось ваш код доступу: ${c.code}

${howto(c)}
${emailOf(c) ? `\nКод та інструкцію дублюємо на пошту ${emailOf(c)}.\n` : ''}
${WISH}

${FOLLOW}`;
  const letterFor = c => `${hiOf(c)}, вітаємо!

Дякуємо за покупку в «Дивоуроці» 💛

Ваш код доступу: ${c.code}

Як почати:
${howto(c)}

Через акаунт (Google або пошта) набір відкривається на будь-якій кількості ваших пристроїв, а прогрес класів синхронізується. Сам код без акаунта працює на ${c.max_devices || 3} пристроях.

Роздатку для друку (PDF) і сценарій уроку знайдете в наборі: розділи «Роздатка» та «Для вчителя».

${WISH}

${FOLLOW}

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

  // ---- розділи: один на екрані, адреса #розділ; «Новий код» — висувна панель поверх будь-якого розділу
  const VIEWS = ['sales', 'codes', 'leads', 'accounts', 'news', 'demo'];
  function show(v) {
    if (v === 'new-code') { openNew(); v = current; }
    if (!VIEWS.includes(v)) v = 'sales';
    current = v;
    VIEWS.forEach(id => { $(id).hidden = id !== v; });
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.view === v));
    if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v);
    window.scrollTo(0, 0);
  }
  let current = 'sales';
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  function openNew() {
    $('new-code').classList.add('on'); $('scrim').classList.add('on'); $('new-code').setAttribute('aria-hidden', 'false');
    setTimeout(() => $('note').focus(), 230);
  }
  function closeNew() { $('new-code').classList.remove('on'); $('scrim').classList.remove('on'); $('new-code').setAttribute('aria-hidden', 'true'); }
  $('top-new').onclick = openNew;
  document.querySelectorAll('[data-new]').forEach(b => { b.onclick = openNew; });
  $('new-close').onclick = closeNew;
  $('scrim').onclick = closeNew;
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('new-code').classList.contains('on')) closeNew();
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'n' || e.key === 'т') && !$('panel').hidden) { e.preventDefault(); openNew(); }
  });
  const go = (v, after) => { location.hash = v; show(v); if (after) after(); };

  // ---- огляд: гроші, що зробити, останні продажі й заявки
  function renderSales() {
    const sales = all.filter(isSale);
    const now = Date.now(), today = dayKey(now);
    const sum = list => list.reduce((s, c) => s + amountOf(c), 0);
    const tToday = sales.filter(c => dayKey(paidOf(c)) === today);
    const tWeek = sales.filter(c => paidOf(c) > now - 7 * 864e5);
    const kpi = (n, money, label) => { const d = el('div', 'kpi'); d.append(el('b', null, n), el('span', null, `${label} · ${money.toLocaleString('uk-UA')} ₴`)); return d; };
    const lazy = sales.filter(notActivated);
    const fresh = pre.filter(p => (p.status || 'new') === 'new');
    const used = sales.filter(c => c.devices || c.user_id).length;
    const plain = (n, label) => { const d = el('div', 'kpi'); d.append(el('b', null, n), el('span', null, label)); return d; };
    $('kpis').replaceChildren(kpi(tToday.length, sum(tToday), 'сьогодні'), kpi(tWeek.length, sum(tWeek), 'за 7 днів'), kpi(sales.length, sum(sales), 'усього'),
      plain(sales.length ? Math.round(used / sales.length * 100) + '%' : '—', `відкрили набір · ${used} з ${sales.length}`));
    $('ov-date').textContent = new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });

    const tally = (fn, labels) => Object.entries(sales.reduce((m, c) => (m[fn(c)] = (m[fn(c)] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]);
    const splitRow = (title, rows, labels) => {
      const r = el('div', 'split-row'); const chips = el('div', 'chips');
      rows.forEach(([k, n]) => { const s = el('span', null, (labels[k] || k) + ' '); s.append(el('b', null, n)); chips.append(s); });
      r.append(el('span', null, title), chips); return r;
    };
    $('sales-split').replaceChildren(...(sales.length
      ? [splitRow('Звідки', tally(sourceOf, SOURCE_LABEL), SOURCE_LABEL), splitRow('Клас', tally(gradeOf, GRADE_LABEL), { ...GRADE_LABEL, '': 'не вказано' }),
         el('div', 'muted', 'Тестові й подарункові коди сюди не входять.')]
      : [el('div', 'muted', 'Продажів поки немає — усе попереду 🙂')]));

    const todo = [];
    if (fresh.length) todo.push([`Нові заявки з сайту без відповіді: ${fresh.length}.`, 'Відкрити заявки', () => go('leads', () => setLeadTab('new'))]);
    if (lazy.length) todo.push([`Не відкрили набір понад добу: ${lazy.map(c => c.note || c.code).join(', ')} — надішліть «Нагадування».`, 'Показати', () => go('codes', () => setCodeTab('lazy'))]);
    $('todo').hidden = !todo.length;
    $('todo').replaceChildren(...todo.map(([t, label, fn]) => { const d = el('div'); d.append(el('span', null, t), button(label, 'btn sun sm', fn)); return d; }));

    const recent = sales.slice().sort((a, b) => paidOf(b) - paidOf(a)).slice(0, 6);
    $('ov-sales').replaceChildren(...(recent.length ? recent.map(c => mini(c.note || c.code, [SOURCE_LABEL[sourceOf(c)], gradeOf(c) ? GRADE_LABEL[gradeOf(c)] + ' клас' : ''].filter(x => x && x !== '—').join(' · ') || c.code,
      [el('span', null, amountOf(c) + ' ₴ · ' + ago(paidOf(c))), statusPill(c)])) : [el('div', 'empty', 'Ще немає продажів.')]));
    const leads = fresh.slice(0, 6);
    $('ov-leads').replaceChildren(...(leads.length ? leads.map(p => {
      const m = mini(p.name || p.contact, p.contact + (p.grade ? ' · ' + p.grade.replace('-', '–') + ' клас' : ''), [el('span', null, ago(p.created_at)), button('Створити код', 'btn sm', () => fillFromPreorder(p))]);
      return m;
    }) : [el('div', 'empty', 'Нових заявок немає ✓')]));
  }
  function mini(name, sub, right) {
    const row = el('div', 'mini');
    const r = el('div', 'r'); r.append(...right);
    row.append(avatar(name), el('b', null, name), r, el('div', 'sub', sub));
    return row;
  }

  // ---- покупці й коди
  function statusPill(c) {
    const [cls, text] = c.revoked ? ['bad', 'заблоковано']
      : c.expires_at && c.expires_at < Date.now() ? ['bad', 'минув термін']
      : c.devices >= c.max_devices ? ['full', 'усі пристрої зайняті']
      : notActivated(c) ? ['warn-p', 'ще не входили']
      : c.user_id ? ['ok', 'в акаунті']
      : c.devices ? ['ok', 'користуються'] : ['gray', 'код видано'];
    return el('span', 'pill ' + cls, text);
  }
  // вкладки-фільтри над списком; лічильник у кожній
  function tabs(boxId, defs, active, pick) {
    $(boxId).replaceChildren(...defs.map(([v, label, n]) => {
      const b = button(label + (n != null ? ' · ' + n : ''), 'chip' + (v === active ? ' on' : ''), () => pick(v));
      return b;
    }));
  }
  const CODE_TABS = [['all', 'Усі', () => true], ['sale', 'Продажі', isSale], ['lazy', 'Ще не входили', notActivated],
    ['free', 'Подарунки й тести', c => kindOf(c) !== 'sale' && !c.revoked], ['off', 'Заблоковані', c => !!c.revoked]];
  let codeTab = 'all';
  function setCodeTab(v) { codeTab = v; render(); }
  function render() {
    const q = $('filter').value.trim().toLowerCase();
    const match = c => !q || [c.code, c.note, c.contact, c.email, c.hi, c.account_email].some(v => (v || '').toLowerCase().includes(q));
    const test = (CODE_TABS.find(t => t[0] === codeTab) || CODE_TABS[0])[2];
    const rows = all.filter(c => test(c) && match(c));
    const n = all.filter(isSale).length;
    $('codes-count').textContent = n ? plural(n, 'покупець', 'покупці', 'покупців') : '';
    $('nav-codes').textContent = n || '';
    tabs('code-tabs', CODE_TABS.map(([v, label, fn]) => [v, label, all.filter(c => fn(c) && match(c)).length]), codeTab, setCodeTab);
    $('rows').replaceChildren(...(rows.length ? rows.map(personCard) : [el('div', 'empty', q || codeTab !== 'all' ? 'Нікого не знайдено.' : 'Поки немає жодного коду. Натисніть «+ Новий код» 🙂')]));
  }
  function personCard(c) {
    const kind = kindOf(c);
    const lazy = notActivated(c);
    const card = el('article', 'person' + (lazy ? ' warn' : '') + (c.revoked ? ' off' : '') + (editing === c.code ? ' editing' : ''));
    const head = el('div', 'p-head');
    head.append(el('span', 'name', c.note || 'Без імені'));
    if (c.hi) head.append(el('span', 'hi', '«' + c.hi + '»'));
    head.append(statusPill(c));
    if (kind !== 'sale') head.append(el('span', 'pill gray', KIND_LABEL[kind]));
    head.append(el('span', 'right', `${c.devices}/${c.max_devices} пристроїв${c.last_seen ? ' · вхід ' + ago(c.last_seen) : ''}`));
    const info = el('div', 'p-info');
    const parts = [emailOf(c), SOURCE_LABEL[sourceOf(c)], gradeOf(c) ? GRADE_LABEL[gradeOf(c)] + ' клас' : '', kind === 'sale' ? amountOf(c) + ' ₴' : '', 'оплата ' + fmtDate(paidOf(c))].filter(x => x && x !== '—');
    info.append(el('div', null, parts.join(' · ')));
    if (c.account_email) info.append(el('div', 'sub', 'Акаунт: ' + c.account_email));
    if (c.contact) info.append(el('div', 'sub', c.contact));
    if (c.packs !== 'mova') info.append(el('div', 'sub', 'Набори: ' + (c.packs === '*' ? 'усі' : c.packs)));
    const acts = copySet(c);
    if (lazy) acts.append(button('Нагадування', 'btn sun sm', () => copy(reminderFor(c), 'Нагадування')));
    acts.append(button(editing === c.code ? 'Закрити' : 'Редагувати', 'btn ghost sm', () => { editing = editing === c.code ? '' : c.code; render(); }));
    const more = [[c.revoked ? 'Розблокувати код' : 'Заблокувати код', () => act(c.revoked ? 'restore' : 'revoke', c.code), !c.revoked]];
    if (c.user_id) more.push(['Відв’язати від акаунта', async () => { if (confirm('Відв’язати код ' + c.code + ' від акаунта ' + (c.account_email || '') + '? Код лишиться дійсним.')) { await call('POST', { action: 'unlink', code: c.code }, 'accounts'); toast('Відв’язано ✓'); load(); } }]);
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

  // ---- акаунти вчителів (вхід через Google або пошту)
  let accounts = [];
  async function loadAccounts() {
    try { accounts = (await call('GET', null, 'accounts')).accounts || []; } catch (e) { $('acc-stats').textContent = 'Не вдалося завантажити акаунти: ' + e.message; return; }
    const withCodes = accounts.filter(a => a.codes.length).length;
    const news = accounts.filter(a => a.news === 1).length;
    const week = accounts.filter(a => a.created_at > Date.now() - 7 * 864e5).length;
    $('nav-acc').textContent = accounts.length || '';
    $('acc-count').textContent = accounts.length ? plural(accounts.length, 'акаунт', 'акаунти', 'акаунтів') + (week ? ` · +${week} за тиждень` : '') : '';
    $('acc-stats').textContent = accounts.length ? `З кодом: ${withCodes}. Без покупки: ${accounts.length - withCodes}. Погодилися на листи: ${news}. Через Google: ${accounts.filter(a => a.google).length}.` : '';
    renderAccounts();
  }
  function renderAccounts() {
    const q = $('acc-filter').value.trim().toLowerCase();
    const rows = accounts.filter(a => !q || [a.email, a.name, a.school, ...a.codes.map(c => c.code + ' ' + c.note)].some(v => (v || '').toLowerCase().includes(q)));
    $('acc-rows').replaceChildren(...(rows.length ? rows.map(accountCard) : [el('div', 'empty', q ? 'Нікого не знайдено.' : 'Акаунтів поки немає. Вони з’являться, щойно хтось увійде через Google або пошту.')]));
  }
  function accountCard(a) {
    const card = el('article', 'person');
    const head = el('div', 'p-head');
    head.append(el('span', 'name', a.name || a.email));
    head.append(el('span', 'pill ' + (a.codes.length ? 'ok' : 'gray'), a.codes.length ? 'є набір' : 'без покупки'));
    if (a.news === 1) head.append(el('span', 'pill gray', 'листи ✓'));
    head.append(el('span', 'right', (a.google ? 'Google' : 'пошта') + ' · ' + plural(a.sessions, 'пристрій', 'пристрої', 'пристроїв') + (a.last_seen ? ' · був ' + ago(a.last_seen) : '')));
    const info = el('div', 'p-info');
    info.append(el('div', null, [a.name ? a.email : '', a.school, 'з ' + fmtDate(a.created_at)].filter(Boolean).join(' · ')));   // без імені пошта вже в заголовку
    a.codes.forEach(c => {
      const line = el('div', 'sub');
      line.append(el('span', null, c.code + ' — ' + (c.note || 'без імені') + (c.packs !== 'mova' ? ' · ' + (c.packs === '*' ? 'усі набори' : c.packs) : '') + (c.revoked ? ' · заблоковано' : '') + ' '),
        button('відв’язати', 'linkish', async () => { if (confirm('Відв’язати код ' + c.code + ' від ' + a.email + '? Код лишиться дійсним.')) { await call('POST', { action: 'unlink', code: c.code }, 'accounts'); toast('Відв’язано ✓'); load(); } }));
      info.append(line);
    });
    const acts = el('div', 'p-acts');
    acts.append(
      button('Прив’язати код', 'btn sm', async () => {
        const code = prompt('Код, який прив’язати до ' + a.email + ' (якщо він в іншому акаунті — перейде сюди):');
        if (!code) return;
        try { await call('POST', { action: 'link', code, email: a.email }, 'accounts'); toast('Прив’язано ✓'); load(); }
        catch (e) { alert(e.message === 'invalid' ? 'Такого коду немає.' : 'Не вдалося: ' + e.message); }
      }),
      button('Копіювати пошту', 'btn soft sm', () => copy(a.email, 'Пошту')),
      menu([['Вийти на всіх пристроях', async () => { if (confirm('Завершити всі сесії ' + a.email + '?')) { await call('POST', { action: 'logout', id: a.id }, 'accounts'); toast('Готово ✓'); loadAccounts(); } }, true]]));
    card.append(avatar(a.name || a.email), head, info, acts);
    return card;
  }
  $('acc-filter').addEventListener('input', renderAccounts);
  $('acc-news').onclick = () => {
    const emails = accounts.filter(a => a.news === 1).map(a => a.email);
    if (!emails.length) { toast('Поки ніхто не погодився на листи'); return; }
    copy(emails.join(', '), `E-mail для розсилки (${emails.length})`);
  };

  // ---- оголошення в застосунку (дзвіночок і банер)
  let newsItems = [];
  let newsEditing = null;
  const AUD_LABEL = { all: 'усім', buyers: 'тим, хто купив', demo: 'без покупки' };
  async function loadNews() {
    try { newsItems = (await call('GET', null, 'news')).items || []; } catch (e) { $('n-err').textContent = 'Не вдалося завантажити оголошення: ' + e.message; return; }
    $('nav-news').textContent = newsItems.filter(n => newsState(n)[1] === 'показується').length || '';
    $('news-count').textContent = newsItems.length ? plural(newsItems.length, 'оголошення', 'оголошення', 'оголошень') : '';
    $('news-rows').replaceChildren(...(newsItems.length ? newsItems.map(newsCard) : [el('div', 'empty', 'Оголошень ще немає. Напишіть перше вище — його побачать усі, хто відкриє застосунок.')]));
  }
  function newsState(n) {
    const now = Date.now();
    return n.hidden ? ['gray', 'приховано'] : n.starts_at > now ? ['warn-p', 'заплановано'] : n.ends_at && n.ends_at <= now ? ['gray', 'завершено'] : ['ok', 'показується'];
  }
  function newsCard(n) {
    const card = el('article', 'person' + (n.hidden ? ' off' : ''));
    const head = el('div', 'p-head');
    const [cls, label] = newsState(n);
    head.append(el('span', 'name', n.title), el('span', 'pill ' + cls, label));
    if (n.important) head.append(el('span', 'pill warn-p', 'важливе'));
    head.append(el('span', 'right', `побачили ${n.seen} · прочитали ${n.reads}` + (n.button_url ? ` · натиснули ${n.clicks}` : '')));
    const info = el('div', 'p-info');
    info.append(el('div', null, ['з ' + fmtDate(n.starts_at) + (n.ends_at ? ' по ' + fmtDate(n.ends_at - 1) : ''), AUD_LABEL[n.audience] || n.audience, n.grades ? 'версії ' + n.grades.replace(/-/g, '–') : ''].filter(Boolean).join(' · ')));
    if (n.body) info.append(el('div', 'sub news-body', n.body));
    if (n.button_url) info.append(el('div', 'sub', 'Кнопка «' + (n.button_label || '—') + '» → ' + n.button_url));
    const acts = el('div', 'p-acts');
    acts.append(button('Редагувати', 'btn ghost sm', () => fillNews(n)),
      button(n.hidden ? 'Показати' : 'Приховати', 'btn soft sm', async () => { await call('POST', { ...n, hidden: !n.hidden }, 'news'); toast(n.hidden ? 'Знову показується ✓' : 'Приховано ✓'); loadNews(); }),
      menu([['Видалити', async () => { if (confirm('Видалити оголошення «' + n.title + '» разом зі статистикою?')) { await call('POST', { action: 'delete', id: n.id }, 'news'); toast('Видалено'); loadNews(); } }, true]]));
    card.append(avatar(n.title), head, info, acts);
    return card;
  }
  function resetNewsForm() {
    newsEditing = null;
    ['n-title', 'n-body', 'n-label', 'n-url', 'n-to'].forEach(id => { $(id).value = ''; });
    $('n-from').value = toDateInput(Date.now());
    setSel('n-aud', 'all');
    document.querySelectorAll('#n-grades input').forEach(i => { i.checked = false; });
    $('n-important').checked = false;
    $('n-save').textContent = 'Опублікувати'; $('n-cancel').hidden = true; $('n-head').textContent = 'Нове оголошення'; $('n-err').textContent = '';
  }
  function fillNews(n) {
    newsEditing = n;
    $('n-title').value = n.title; $('n-body').value = n.body; $('n-label').value = n.button_label; $('n-url').value = n.button_url;
    $('n-from').value = toDateInput(n.starts_at); $('n-to').value = n.ends_at ? toDateInput(n.ends_at - 1) : '';
    setSel('n-aud', n.audience);
    document.querySelectorAll('#n-grades input').forEach(i => { i.checked = (n.grades || '').split(',').includes(i.value); });
    $('n-important').checked = !!n.important;
    $('n-save').textContent = 'Зберегти зміни'; $('n-cancel').hidden = false; $('n-head').textContent = 'Редагування: ' + n.title;
    $('news-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('n-title').focus({ preventScroll: true });
  }
  $('n-cancel').onclick = resetNewsForm;
  $('n-save').onclick = async () => {
    $('n-err').textContent = '';
    const from = $('n-from').value ? new Date($('n-from').value + 'T00:00').getTime() : Date.now();
    const body = {
      id: newsEditing ? newsEditing.id : undefined, hidden: newsEditing ? !!newsEditing.hidden : false,
      title: $('n-title').value, body: $('n-body').value, button_label: $('n-label').value, button_url: $('n-url').value.trim(),
      audience: $('n-aud').value, grades: [...document.querySelectorAll('#n-grades input:checked')].map(i => i.value).join(','),
      important: $('n-important').checked,
      starts_at: newsEditing || from > Date.now() ? from : Date.now(),   // «сьогодні» — одразу, а не з півночі
      ends_at: $('n-to').value ? new Date($('n-to').value + 'T00:00').getTime() + 864e5 : null   // «по» — включно
    };
    if (!body.title.trim()) { $('n-err').textContent = 'Напишіть заголовок.'; return; }
    if (body.button_url && !/^(#\/|https:\/\/)/.test(body.button_url)) { $('n-err').textContent = 'Посилання має починатися з #/ (сторінка застосунку) або https://'; return; }
    try { await call('POST', body, 'news'); toast(newsEditing ? 'Збережено ✓' : 'Опубліковано ✓'); resetNewsForm(); loadNews(); }
    catch (e) { $('n-err').textContent = 'Не вдалося зберегти: ' + e.message; }
  };
  resetNewsForm();

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
    $('nav-leads').textContent = pre.length || '';
    renderLeads();
  }
  let leadTab = 'all';
  function setLeadTab(v) { leadTab = v; renderLeads(); }
  function renderLeads() {
    const stOf = p => p.status || 'new';
    tabs('lead-tabs', [['all', 'Усі', pre.length], ...STATUS.map(([v, label]) => [v, label, pre.filter(p => stOf(p) === v).length])], leadTab, setLeadTab);
    const rows = pre.filter(p => leadTab === 'all' || stOf(p) === leadTab);
    $('pre-rows').replaceChildren(...(rows.length ? rows.map(leadCard) : [el('div', 'empty', pre.length ? 'У цьому статусі заявок немає.' : 'Заявок поки немає. Вони з\'являться тут, щойно хтось залишить контакт на сайті.')]));
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
    $('created-box').hidden = true;
    openNew();
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
    $('demo-sum').textContent = `${$('demo-days').selectedOptions[0].textContent}: ${total} відкрили · ${f.play || 0} дивились мультфільм · ${plural(f.preorder || 0, 'заявка', 'заявки', 'заявок')}`;
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
      $('login-wrap').hidden = true; $('panel').hidden = false; $('topbar').hidden = false;
      show(location.hash.slice(1));
    } catch (e) { $('login-err').textContent = e.message === 'forbidden' ? 'Токен не підходить.' : 'Помилка: ' + e.message; }
  };
  $('token').addEventListener('keydown', e => { if (e.key === 'Enter') $('enter').click(); });

  // ---- новий код
  $('paid').value = toDateInput(Date.now());
  $('amount').value = PRICE;
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
