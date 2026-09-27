/* Адмінка кодів доступу. */
  const $ = id => document.getElementById(id);
  let token = sessionStorage.getItem('dyvo_admin') || '';
  let all = [];
  let lastCreated = [];

  async function call(method, body, path = 'codes') {
    const r = await fetch('/api/admin/' + path, { method, headers: { 'authorization': 'Bearer ' + token, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (r.status === 403) throw new Error('forbidden');
    return data;
  }

  async function load() {
    const d = await call('GET');
    all = d.codes || [];
    render();
    loadPre();
  }

  // ---- передзамовлення
  let pre = [];
  async function loadPre() {
    const d = await call('GET', null, 'preorders');
    pre = d.preorders || [];
    const week = pre.filter(p => p.created_at > Date.now() - 7 * 864e5).length;
    $('pre-count').textContent = pre.length;
    $('pre-week').textContent = week ? `(+${week} за тиждень)` : '';
    const tally = key => Object.entries(pre.reduce((m, p) => (m[p[key] || '—'] = (m[p[key] || '—'] || 0) + 1, m), {}))
      .sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n}`).join(', ');
    $('pre-stats').textContent = pre.length ? `Класи — ${tally('grade')}. Звідки — ${tally('source')}.` : 'Заявок поки немає.';
    $('pre-rows').replaceChildren(...pre.map(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td></td><td class="code"></td><td></td><td></td><td></td><td></td><td class="actions"></td>';
      const cells = [new Date(p.created_at).toLocaleString('uk-UA'), p.contact, p.name || '—', p.grade || '—', p.comment || '—', p.source || '—'];
      cells.forEach((t, i) => tr.children[i].textContent = t);
      const b = document.createElement('button');
      b.className = 'small ghost'; b.textContent = 'Видалити';
      b.onclick = async () => { if (confirm('Видалити заявку ' + p.contact + '?')) { await call('POST', { action: 'delete', contact: p.contact }, 'preorders'); loadPre(); } };
      tr.lastChild.append(b);
      return tr;
    }));
  }
  const flash = (btn, text) => { const old = btn.textContent; btn.textContent = text; setTimeout(() => btn.textContent = old, 1500); };
  $('pre-copy').onclick = () => {
    const emails = pre.map(p => p.contact).filter(c => c.includes('@') && !c.startsWith('@'));
    navigator.clipboard.writeText(emails.join(', '));
    flash($('pre-copy'), `Скопійовано ${emails.length} ✓`);
  };
  $('pre-csv').onclick = () => {
    const cols = ['created_at', 'contact', 'name', 'grade', 'comment', 'source'];
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = [cols.join(','), ...pre.map(p => cols.map(c => esc(c === 'created_at' ? new Date(p[c]).toISOString() : p[c])).join(','))];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'dyvourok-peredzamovlennia.csv';
    a.click();
  };

  function render() {
    const q = $('filter').value.trim().toLowerCase();
    const rows = all.filter(c => !q || c.code.toLowerCase().includes(q) || (c.note || '').toLowerCase().includes(q));
    $('rows').replaceChildren(...rows.map(c => {
      const tr = document.createElement('tr');
      const status = c.revoked ? '<span class="pill bad">заблоковано</span>'
        : c.expires_at && c.expires_at < Date.now() ? '<span class="pill bad">минув термін</span>'
        : c.devices >= c.max_devices ? '<span class="pill full">ліміт пристроїв</span>' : '<span class="pill ok">активний</span>';
      tr.innerHTML = `<td class="code"></td><td class="note"></td><td class="packs"></td><td>${c.devices} / ${c.max_devices}</td><td>${c.last_seen ? new Date(c.last_seen).toLocaleString('uk-UA') : '—'}</td><td>${status}</td><td class="actions"></td>`;
      tr.querySelector('.code').textContent = c.code;
      tr.querySelector('.note').textContent = c.note || '—';
      tr.querySelector('.packs').textContent = c.packs === '*' ? 'усі' : c.packs;
      const acts = tr.querySelector('.actions');
      const btn = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'small ' + (cls || 'ghost'); b.textContent = label; b.onclick = fn; acts.append(b); };
      btn('Копіювати', () => navigator.clipboard.writeText(c.code));
      btn(c.revoked ? 'Розблокувати' : 'Заблокувати', () => act(c.revoked ? 'restore' : 'revoke', c.code));
      if (c.devices) btn('Скинути пристрої', () => act('reset-devices', c.code));
      return tr;
    }));
  }

  async function act(action, code) { await call('POST', { action, code }); load(); }

  $('enter').onclick = async () => {
    token = $('token').value.trim();
    try { await load(); sessionStorage.setItem('dyvo_admin', token); $('login').hidden = true; $('panel').hidden = false; }
    catch (e) { $('login-err').textContent = 'Токен не підходить.'; }
  };
  $('token').addEventListener('keydown', e => { if (e.key === 'Enter') $('enter').click(); });

  $('create').onclick = async () => {
    const d = await call('POST', { note: $('note').value, count: $('count').value, maxDevices: $('max').value, packs: $('packs').value, days: $('days').value });
    lastCreated = d.codes || [];
    $('created').hidden = false;
    $('created').textContent = lastCreated.join('\n');
    $('letter-actions').hidden = false;
    load();
  };

  $('copy-letter').onclick = () => {
    const text = `Вітаємо! Дякуємо за покупку в «Дивоурок» ✨

Ваш код доступу: ${lastCreated[0]}

Як почати:
1. Відкрийте ${location.origin}/app на дошці чи комп'ютері.
2. Введіть код — і матеріали набору відкриються.
3. Код працює на ${$('max').value} пристроях (наприклад, дошка, ноутбук і телефон).

Порада: натисніть «Встановити» в браузері — «Дивоурок» з'явиться як програма і працюватиме навіть без інтернету.

Питання чи проблеми з доступом? Пишіть на info@dyvourok.com.ua — допоможемо.

Гарного свята з дітьми!`;
    navigator.clipboard.writeText(text);
    $('copy-letter').textContent = 'Скопійовано ✓';
    setTimeout(() => $('copy-letter').textContent = 'Скопіювати лист для покупця', 1500);
  };

  $('filter').addEventListener('input', render);
  if (token) { $('token').value = token; $('enter').click(); }
