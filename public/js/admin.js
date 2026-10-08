/* Адмінка: продажі, демо, заявки з сайту, коди доступу. */
  const $ = id => document.getElementById(id);
  let token = sessionStorage.getItem('dyvo_admin') || '';
  let all = [];
  let pre = [];
  let editing = '';          // код, рядок якого зараз редагується
  let fromPre = '';          // контакт заявки, з якої заповнили форму нового коду

  async function call(method, body, path = 'codes') {
    const r = await fetch('/api/admin/' + path, { method, headers: { 'authorization': 'Bearer ' + token, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (r.status === 403) throw new Error('forbidden');
    if (!r.ok) throw new Error(data.error || 'http ' + r.status);
    return data;
  }
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const flash = (btn, text) => { const old = btn.textContent; btn.textContent = text; setTimeout(() => btn.textContent = old, 1500); };
  function copy(text, btn) {
    const done = () => flash(btn, 'Скопійовано ✓');
    try { navigator.clipboard.writeText(text).then(done, () => prompt('Скопіюйте вручну (Ctrl+C):', text)); }
    catch (e) { prompt('Скопіюйте вручну (Ctrl+C):', text); }
  }

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

  function copySet(c, withLabel) {
    const box = el('div', 'copyset');
    if (withLabel) box.append(el('span', null, 'Копіювати:'));
    [['Код', () => c.code], ['Повідомлення', () => messageFor(c)], ['Лист', () => letterFor(c)], ['Тема листа', () => SUBJECT]].forEach(([label, get]) => {
      const b = el('button', 'small ghost', label);
      b.onclick = () => copy(get(), b);
      box.append(b);
    });
    return box;
  }

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
    $('sales-split').textContent = sales.length ? `Звідки: ${tally(sourceOf, SOURCE_LABEL)}. Клас: ${tally(gradeOf, GRADE_LABEL)}. Тестові й подарункові коди сюди не входять.` : 'Продажів поки немає.';
    const lazy = sales.filter(notActivated);
    const fresh = pre.filter(p => (p.status || 'new') === 'new');
    const todo = [];
    if (lazy.length) todo.push(`Не відкрили набір понад добу: ${lazy.map(c => c.note || c.code).join(', ')} — біля коду є кнопка «Нагадування».`);
    if (fresh.length) todo.push(`Нові заявки з сайту без відповіді: ${fresh.length}.`);
    $('todo').hidden = !todo.length;
    $('todo').replaceChildren(...todo.map(t => el('div', null, t)));
  }

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
    $('demo-funnel').replaceChildren(...STEPS.map(([e, label, side]) => {
      const n = f[e] || 0, pct = total ? Math.round(n / total * 100) : 0;
      const row = document.createElement('div');
      row.className = 'step' + (side ? ' side' : '');
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
        [label, ...COLS.map(c => m[k][c] || 0)].forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.append(td); });
        return tr;
      }));
    };
    table(d.sources || [], 'source', 'demo-src', 'Поки ніхто не відкривав демо за цей період.');
    table(d.daily || [], 'day', 'demo-daily', '—');
  }
  $('demo-days').onchange = loadDemo;

  // ---- заявки з сайту
  const STATUS = [['new', 'Нова'], ['written', 'Написали'], ['paid', 'Оплачено'], ['declined', 'Відмова']];
  async function loadPre() {
    const d = await call('GET', null, 'preorders');
    pre = d.preorders || [];
    const week = pre.filter(p => p.created_at > Date.now() - 7 * 864e5).length;
    $('pre-count').textContent = pre.length;
    $('pre-week').textContent = week ? `(+${week} за тиждень)` : '';
    const tally = key => Object.entries(pre.reduce((m, p) => (m[p[key] || '—'] = (m[p[key] || '—'] || 0) + 1, m), {}))
      .sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n}`).join(', ');
    const st = Object.fromEntries(STATUS);
    $('pre-stats').textContent = pre.length ? `Статус — ${Object.entries(pre.reduce((m, p) => (m[st[p.status || 'new']] = (m[st[p.status || 'new']] || 0) + 1, m), {})).map(([k, n]) => `${k}: ${n}`).join(', ')}. Класи — ${tally('grade')}. Звідки — ${tally('source')}.` : 'Заявок поки немає.';
    $('pre-rows').replaceChildren(...pre.map(p => {
      const tr = document.createElement('tr');
      [new Date(p.created_at).toLocaleString('uk-UA'), p.contact, p.name || '—', p.grade || '—', p.comment || '—', p.source || '—'].forEach((t, i) => {
        const td = el('td', i === 1 ? 'code' : null, t); tr.append(td);
      });
      const sel = el('select', 'small');
      STATUS.forEach(([v, label]) => { const o = el('option', null, label); o.value = v; sel.append(o); });
      sel.value = p.status || 'new';
      sel.onchange = async () => { await call('POST', { action: 'status', contact: p.contact, status: sel.value }, 'preorders'); p.status = sel.value; renderSales(); loadPre(); };
      const tdS = el('td'); tdS.append(sel); tr.append(tdS);
      const acts = el('td', 'actions');
      const mk = el('button', 'small', 'Створити код');
      mk.onclick = () => fillFromPreorder(p);
      const del = el('button', 'small ghost', 'Видалити');
      del.onclick = async () => { if (confirm('Видалити заявку ' + p.contact + '?')) { await call('POST', { action: 'delete', contact: p.contact }, 'preorders'); loadPre(); } };
      acts.append(mk, del); tr.append(acts);
      return tr;
    }));
  }
  function fillFromPreorder(p) {
    fromPre = p.contact;
    $('note').value = p.name || '';
    $('hi').value = '';
    $('email').value = p.contact.includes('@') ? p.contact : '';
    $('source').value = 'site';
    $('grade').value = p.grade === '1-2' || p.grade === '3-4' ? '1-4' : (['5-7', '8-11'].includes(p.grade) ? p.grade : '');
    $('contact').value = p.contact.includes('@') ? '' : 'Контакт із заявки: ' + p.contact;
    $('from-pre').textContent = 'Заповнено із заявки ' + p.contact + ' — допишіть прізвище й звертання. Після створення заявка стане «Оплачено».';
    $('new-code').scrollIntoView({ behavior: 'smooth' });
    $('note').focus();
  }
  $('pre-copy').onclick = () => {
    const emails = pre.map(p => p.contact).filter(c => c.includes('@') && !c.startsWith('@'));
    copy(emails.join(', '), $('pre-copy'));
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

  // ---- коди
  function render() {
    const q = $('filter').value.trim().toLowerCase();
    const rows = all.filter(c => !q || [c.code, c.note, c.contact, c.email, c.hi].some(v => (v || '').toLowerCase().includes(q)));
    const out = [];
    rows.forEach(c => {
      const tr = document.createElement('tr');
      const kind = kindOf(c);
      const status = c.revoked ? '<span class="pill bad">заблоковано</span>'
        : c.expires_at && c.expires_at < Date.now() ? '<span class="pill bad">минув термін</span>'
        : c.devices >= c.max_devices ? '<span class="pill full">ліміт пристроїв</span>'
        : notActivated(c) ? '<span class="pill warn">ще не входили</span>'
        : '<span class="pill ok">активний</span>';
      tr.innerHTML = `<td class="code"></td><td class="note"></td><td class="info"></td><td>${c.devices} / ${c.max_devices}</td><td>${c.last_seen ? new Date(c.last_seen).toLocaleString('uk-UA') : '—'}</td><td>${status}${kind !== 'sale' ? ` <span class="pill gray">${KIND_LABEL[kind]}</span>` : ''}</td><td class="actions"></td>`;
      tr.querySelector('.code').textContent = c.code;
      const noteTd = tr.querySelector('.note');
      noteTd.append(el('div', null, c.note || '—'));
      if (c.hi) noteTd.append(el('div', 'muted', c.hi + ','));
      const info = tr.querySelector('.info');
      const parts = [emailOf(c), SOURCE_LABEL[sourceOf(c)], gradeOf(c) ? GRADE_LABEL[gradeOf(c)] + ' клас' : '', kind === 'sale' ? amountOf(c) + ' ₴' : '', 'оплата ' + fmtDate(paidOf(c))].filter(x => x && x !== '—');
      info.append(el('div', null, parts.join(' · ')));
      if (c.contact) info.append(el('div', 'sub', c.contact));
      if (c.packs !== 'mova') info.append(el('div', 'sub', 'Набори: ' + (c.packs === '*' ? 'усі' : c.packs)));
      const acts = tr.querySelector('.actions');
      acts.append(copySet(c, true));
      const btn = (label, fn, cls) => { const b = el('button', 'small ' + (cls || 'ghost'), label); b.onclick = () => fn(b); acts.append(b); };
      if (notActivated(c)) btn('Нагадування', b => copy(reminderFor(c), b));
      btn(editing === c.code ? 'Закрити' : 'Редагувати', () => { editing = editing === c.code ? '' : c.code; render(); });
      btn(c.revoked ? 'Розблокувати' : 'Заблокувати', () => act(c.revoked ? 'restore' : 'revoke', c.code));
      if (c.devices) btn('Скинути пристрої', () => { if (confirm('Скинути всі пристрої коду ' + c.code + '? Покупцю треба буде ввести код заново.')) act('reset-devices', c.code); });
      out.push(tr);
      if (editing === c.code) out.push(editRow(c));
    });
    $('rows').replaceChildren(...out);
  }

  function editRow(c) {
    const tr = el('tr', 'edit');
    const td = el('td'); td.colSpan = 7; tr.append(td);
    const field = (label, input, flex) => { const l = el('label'); l.style.flex = flex; l.append(label, input); return l; };
    const inp = (v, type) => { const i = el('input'); if (type) i.type = type; i.value = v ?? ''; return i; };
    const sel = (opts, v) => { const s = el('select'); Object.entries(opts).forEach(([k, label]) => { const o = el('option', null, label); o.value = k; s.append(o); }); s.value = v; return s; };
    const f = {
      note: inp(c.note), hi: inp(c.hi), email: inp(emailOf(c), 'email'),
      source: sel(SOURCE_LABEL, sourceOf(c)), grade: sel(GRADE_LABEL, gradeOf(c)),
      amount: inp(amountOf(c), 'number'), paid_at: inp(toDateInput(paidOf(c)), 'date'),
      kind: sel(KIND_LABEL, kindOf(c)), contact: inp(c.contact)
    };
    const r1 = el('div', 'row'), r2 = el('div', 'row'), r3 = el('div', 'row');
    r1.append(field('Покупець (бачить покупець)', f.note, '2 1 220px'), field('Звертання', f.hi, '1 1 140px'), field('Пошта', f.email, '2 1 200px'));
    r2.append(field('Звідки', f.source, '1 1 140px'), field('Клас', f.grade, '1 1 110px'), field('Сума, ₴', f.amount, '0 0 100px'), field('Дата оплати', f.paid_at, '0 0 160px'), field('Тип', f.kind, '1 1 130px'));
    r3.append(field('Нотатка', f.contact, '1 1 300px'));
    const save = el('button', null, 'Зберегти');
    const err = el('span', 'muted');
    save.onclick = async () => {
      const fields = Object.fromEntries(Object.entries(f).map(([k, i]) => [k, i.value]));
      fields.paid_at = fromDateInput(fields.paid_at);
      try { await call('POST', { action: 'update', code: c.code, fields }); editing = ''; load(); }
      catch (e) { err.textContent = 'Не вдалося зберегти: ' + e.message; }
    };
    const actions = el('div', 'row'); actions.append(save, err);
    const wrap = el('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px';
    wrap.append(r1, r2, r3, actions);
    td.append(wrap);
    return tr;
  }

  async function act(action, code) { await call('POST', { action, code }); load(); }

  $('enter').onclick = async () => {
    token = $('token').value.trim();
    try { await load(); sessionStorage.setItem('dyvo_admin', token); localStorage.setItem('dyvo_notrack', 'true'); /* власні проходи демо не псують статистику */ $('login').hidden = true; $('panel').hidden = false; }
    catch (e) { $('login-err').textContent = e.message === 'forbidden' ? 'Токен не підходить.' : 'Помилка: ' + e.message; }
  };
  $('token').addEventListener('keydown', e => { if (e.key === 'Enter') $('enter').click(); });

  $('paid').value = toDateInput(Date.now());
  $('create').onclick = async () => {
    const body = {
      note: $('note').value, hi: $('hi').value, email: $('email').value, source: $('source').value, grade: $('grade').value,
      amount: $('amount').value, paidAt: fromDateInput($('paid').value), kind: $('kind').value, contact: $('contact').value,
      count: $('count').value, maxDevices: $('max').value, packs: $('packs').value, days: $('days').value
    };
    let d;
    try { d = await call('POST', body); }
    catch (e) { $('created').hidden = false; $('created').textContent = 'Не вдалося створити: ' + e.message; return; }
    const codes = d.codes || [];
    $('created').hidden = false;
    $('created').textContent = codes.join('\n');
    const first = { code: codes[0], hi: body.hi, email: body.email, max_devices: parseInt(body.maxDevices, 10) || 3 };
    $('letter-actions').hidden = false;
    $('letter-actions').replaceChildren(copySet(first, true));
    if (fromPre) { try { await call('POST', { action: 'status', contact: fromPre, status: 'paid' }, 'preorders'); } catch (e) {} }
    fromPre = ''; $('from-pre').textContent = '';
    ['note', 'hi', 'email', 'contact'].forEach(id => $(id).value = '');
    $('amount').value = PRICE; $('paid').value = toDateInput(Date.now()); $('kind').value = 'sale'; $('grade').value = ''; $('source').value = 'messenger';
    load();
  };

  $('filter').addEventListener('input', render);
  if (token) { $('token').value = token; $('enter').click(); }
