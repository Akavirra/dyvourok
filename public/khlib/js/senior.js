'use strict';
// Модулі для 5–7 і 8–11 класів: «Лабораторія тіста», «Голоси з минулого», «Зерно і світ», «Фактчек-студія».
// Серйозніший тон: досьє, графіки, першоджерела. Маскоти лише коментують.

const src = (t, url) => `<a class="src" href="${url}" target="_blank" rel="noopener">Джерело: ${esc(t)}</a>`;

// ================================================================ Лабораторія тіста
// Спрощена модель (F29): активність дріжджів від температури (F27, F28), вплив цукру й солі, закваска повільніша.
const Lab = {
  bowls: null, step: 'setup', t: 0, vote: null,
  presets() {
    return [
      { leaven: 'yeast', temp: 30, sugar: 0, salt: 1 },
      { leaven: 'yeast', temp: 30, sugar: 1, salt: 1 },
      { leaven: 'none', temp: 30, sugar: 0, salt: 1 },
    ];
  },
  act(T) { if (T <= 2) return 0; if (T <= 32) return Math.pow((T - 2) / 30, 1.5); if (T <= 45) return 1 - (T - 32) / 13 * 0.75; if (T < 55) return 0.25 * (55 - T) / 10; return 0; },
  rate(b) {
    const lv = { yeast: 1, sour: 0.55, none: 0 }[b.leaven];
    const sug = [1, 1.2, 1.2, 0.85][b.sugar]; const sal = [1.05, 0.95, 0.45][b.salt];
    return lv * this.act(b.temp) * sug * sal;
  },
  COLS: ['#C8341F', '#D9962B', '#5B7F3A'],
  // умови перемикаються торканням (по колу) — без списків і повзунків
  OPT: {
    leaven: { list: ['yeast', 'sour', 'none'], txt: { yeast: 'Дріжджі', sour: 'Закваска', none: 'Без дріжджів' }, ic: { yeast: '🫧', sour: '🫙', none: '🚫' } },
    temp: { list: [5, 30, 60], txt: { 5: 'Холодна вода 5°', 30: 'Тепла вода 30°', 60: 'Гаряча вода 60°' }, ic: { 5: '❄️', 30: '🌡️', 60: '🔥' } },
    sugar: { list: [0, 1, 3], txt: { 0: 'Без цукру', 1: 'Ложка цукру', 3: 'Багато цукру' }, ic: { 0: '⚪', 1: '🍬', 3: '🍭' } },
  },
  start() {
    this.bowls = this.presets().map(p => Object.assign(p, { v: 100, hist: [100] })); this.step = 'setup'; this.t = 0; this.vote = null;
    Scene.go(SceneBackdrop('lab', 'bg_bakery', 'k21'));
    this.render();
  },
  h(v) { return 24 + clamp((v - 100) / 160, 0, 1) * 72; },   // % об'єму → висота тіста в мисці
  render() {
    const st = this.step, steps = ['Умови', 'Прогноз', 'Дослід', 'Висновок'], si = ['setup', 'predict', 'run', 'end'].indexOf(st);
    const chip = (b, i, k) => { const o = this.OPT[k], val = b[k]; return `<button class="lchip${st === 'setup' ? ' edit' : ''}" data-chip="${k}" data-i="${i}"><i>${o.ic[val]}</i>${o.txt[val]}</button>`; };
    const best = this.bowls.reduce((a, b, i) => b.v > this.bowls[a].v ? i : a, 0);
    const bowl = (b, i) => `<div class="lbowl${this.vote === i ? ' voted' : ''}${st === 'predict' ? ' pick' : ''}${st === 'end' && i === best ? ' best' : ''}" data-i="${i}" style="--c:${this.COLS[i]}">
      <div class="lnum"><span>${i + 1}</span><b id="lv${i}">${Math.round(b.v)}%</b></div>
      <div class="ljar"><div class="lmark" style="bottom:${this.h(200)}%"><span>×2</span></div><div class="lmark start" style="bottom:${this.h(100)}%"></div>
        <div class="ldough" id="ld${i}" style="height:${this.h(b.v)}%"></div>${this.vote === i ? '<div class="lvote">✋ прогноз класу</div>' : ''}</div>
      <div class="lchips">${['leaven', 'temp', 'sugar'].map(k => chip(b, i, k)).join('')}</div>
    </div>`;
    const tip = {
      setup: 'Три однакові миски з борошном і водою. Торкніться умови під мискою, щоб змінити її.',
      predict: 'Як ви думаєте: у якій мисці тісто підніметься найвище? Голосуйте руками, а тоді торкніться миски.',
      run: 'Тісто відпочиває в теплі… Стежимо!',
    }[st];
    const btn = { setup: '<button class="ans yes" id="labGo">Далі: прогноз →</button>', predict: `<button class="ans yes" id="labRun"${this.vote == null ? ' disabled' : ''}>▶ Запустити дослід</button>`, run: '<div class="ltime">⏱ <b id="labT">0</b> хв з 60</div>' }[st];
    const body = st === 'end' ? this.endView(best) : `<div class="lrow">${this.bowls.map(bowl).join('')}</div>
      <div class="lact"><p>${tip}</p>${btn}</div>`;
    Panel.open(`<div class="sen lab2">
      <div class="lhead"><div><div class="kick">Лабораторія тіста</div><h2>Що змушує тісто підніматися?</h2></div>
        <ol class="lsteps">${steps.map((s, k) => `<li class="${k === si ? 'on' : k < si ? 'ok' : ''}">${k < si ? '✓' : k + 1}<span>${s}</span></li>`).join('')}</ol></div>
      ${body}
    </div>`, 'wide');
    if (st === 'end') this.chart();
  },
  endView(best) {
    const g = State.grade;
    const qs = g === 1 ? ['Де тісто виросло найбільше? Чому?', 'Що сталося в мисці без дріжджів?']
      : g === 2 ? ['Чому в мисці без дріжджів тісто не росте?', 'Що «їдять» дріжджі?', 'Спробуйте гарячу воду 60°. Що сталося і чому?']
        : ['Чому тісто не підійметься, якщо налити окріп? Поясніть з точки зору біології.', 'Чому закваска працює повільніше за дріжджі?', 'Що в нашій моделі спрощено порівняно зі справжнім тістом?'];
    const ok = this.vote === best;
    return `<div class="lend">
      <div class="lchart"><canvas id="labChart" width="760" height="420"></canvas>
        <div class="llegend">${this.bowls.map((b, i) => `<span style="--c:${this.COLS[i]}"><i></i>Миска ${i + 1}: <b>${Math.round(b.v)}%</b></span>`).join('')}</div>
        <button class="ans" id="labAgain">↺ Новий дослід з іншими умовами</button></div>
      <div class="lconc">
        <div class="lwin" style="--c:${this.COLS[best]}">🏆 Найвище піднялося тісто в мисці ${best + 1}<small>${ok ? 'Прогноз класу справдився!' : `Клас ставив на миску ${this.vote + 1}. Чому вийшло інакше?`}</small></div>
        <ul class="sen-q">${qs.map(q => `<li>${esc(q)}</li>`).join('')}</ul>
        <div class="sen-fact">Дріжджі й закваска «їдять» цукри з борошна й виділяють вуглекислий газ — його бульбашки піднімають тісто. У теплі вони працюють швидше, у холоді — повільно, а гаряча вода (понад 55–60 °C) їх убиває. ${src('температура й тісто', 'https://www.bib.irb.hr/384685')} ${src('Bakerpedia', 'https://bakerpedia.com/processes/yeast-kill/')}</div>
      </div></div>`;
  },
  run() {
    this.step = 'run'; this.t = 0; this.bowls.forEach(b => { b.v = 100; b.hist = [100]; }); this.render();
    const tick = () => {
      if (Scene.cur.id !== 'lab' || this.step !== 'run') return;
      this.t += 1;
      for (const b of this.bowls) { const r = this.rate(b) * 0.045; b.v += r * b.v * (1 - b.v / 260); b.hist.push(b.v); }
      this.bowls.forEach((b, i) => { const el = document.getElementById('lv' + i); if (el) el.textContent = Math.round(b.v) + '%'; const d = document.getElementById('ld' + i); if (d) d.style.height = this.h(b.v) + '%'; });
      const tt = document.getElementById('labT'); if (tt) tt.textContent = this.t;
      if (this.t % 6 === 0) Sfx.pop();
      if (this.t < 60) Timers.later(tick, 160); else { this.step = 'end'; Sfx.ding(); this.render(); }
    };
    tick();
  },
  chart() {
    const c = document.getElementById('labChart'); if (!c) return; const x = c.getContext('2d'), W = 760, H = 420, L = 70, B = 370, T = 20, R = W - 44;
    const Y = v => B - (v - 100) / 160 * (B - T), X = m => L + m / 60 * (R - L);
    x.clearRect(0, 0, W, H); x.font = '800 22px Nunito, sans-serif'; x.textBaseline = 'middle';
    for (let v = 100; v <= 260; v += 40) { x.strokeStyle = v === 100 ? '#B9A58A' : '#EDE3D2'; x.lineWidth = v === 100 ? 2 : 1; x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(R, Y(v)); x.stroke(); x.fillStyle = '#8A7560'; x.textAlign = 'right'; x.fillText(v + '%', L - 10, Y(v)); }
    x.textAlign = 'center'; for (let m = 0; m <= 60; m += 15) x.fillText(m + ' хв', X(m), B + 28);
    this.bowls.forEach((b, i) => {
      x.strokeStyle = this.COLS[i]; x.lineWidth = 7; x.lineJoin = x.lineCap = 'round'; x.beginPath();
      b.hist.forEach((v, m) => m ? x.lineTo(X(m), Y(v)) : x.moveTo(X(m), Y(v))); x.stroke();
      const v = b.hist[b.hist.length - 1]; x.fillStyle = this.COLS[i]; x.beginPath(); x.arc(X(60), Y(v), 13, 0, TAU); x.fill();
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(i + 1, X(60), Y(v) + 1);
    });
  },
};
$('#panel').addEventListener('click', e => {
  if (!Lab.bowls || !e.target.closest('.lab2')) return;
  const ch = e.target.closest('[data-chip]');
  if (ch && Lab.step === 'setup') { const k = ch.dataset.chip, b = Lab.bowls[+ch.dataset.i], l = Lab.OPT[k].list; b[k] = l[(l.indexOf(b[k]) + 1) % l.length]; Sfx.pop(); Lab.render(); return; }
  if (e.target.closest('#labGo')) { Lab.step = 'predict'; Sfx.pop(); Lab.render(); return; }
  const bw = e.target.closest('.lbowl'); if (bw && Lab.step === 'predict') { Lab.vote = +bw.dataset.i; Sfx.pop(); Lab.render(); return; }
  if (e.target.closest('#labRun') && Lab.vote != null) { Lab.run(); return; }
  if (e.target.closest('#labAgain')) { Lab.step = 'setup'; Lab.vote = null; Lab.bowls.forEach(b => { b.v = 100; b.hist = [100]; }); Sfx.pop(); Lab.render(); }
});

// ================================================================ Голоси з минулого (першоджерело)
// Записи спогадів переселенців із Київського Полісся (С. Ципишев, «Народознавчі зошити», 2016, № 4). F36.
const VOICES = [
  { q: '«Діжка, дежа називалася. Всєгда тісто остається трошкі і тоді знов, на том кислом тєстє, розчинялі».', page: 818,
    ask: 'Звідки бралася закваска для нового хліба?', opts: ['Купували на базарі', 'Лишали трохи тіста з минулого разу', 'Брали хміль у лісі'], a: 1,
    why: 'Шматочок кислого тіста лишали в діжі — з нього починали наступний хліб. Етнограф згадує, що квасили й на хмелю.' },
  { q: '«Бо як великі є сем\'ї, то разов два на тиждень пече, печется той хліб».', page: 818,
    ask: 'Як часто пекли хліб у великій родині?', opts: ['Щодня', 'Раз-двічі на тиждень', 'Раз на місяць'], a: 1,
    why: 'Пекли раз-двічі на тиждень, одразу кілька хлібин: «і чотирі, і трі, і є такє, шо й п\'ять».' },
  { q: '«Дрова треба дубовиє, березовиє. Дак печ натопіш добре, а смоловиє — нє, нє».', page: 818,
    ask: 'Чому не брали «смолові» (соснові) дрова?', opts: ['Їх було шкода', 'Вони дають багато диму й мало жару', 'Сосна росла далеко'], a: 1,
    why: 'Тверді породи (дуб, береза) дають добрий жар і мало диму. Етнограф пояснює вибір дров саме так.' },
  { q: '«Отака лопата, лопата така кругла і це вікачаєштей хліб, на лопату, в піч посадіш і спьокся».', page: 819,
    ask: 'Що означає «в піч посадиш»?', opts: ['Поставиш хліб у піч на лопаті', 'Сядеш біля печі', 'Посадиш квіти біля хати'], a: 0,
    why: 'Хлібину клали на дерев\'яну хлібну лопату й «садили» в піч — так кажуть і досі.' },
  { q: '«На черінь і капустяне лістячко… така дерев\'яна лопата, на лопаточку ложили і туда, в п\'єчку, ложили».', page: 819,
    ask: 'Навіщо під хлібину клали капустяний листок?', opts: ['Для смаку', 'Щоб хліб не прилип і не забруднився попелом', 'Щоб хліб був зеленим'], a: 1,
    why: 'Листок (капусти, дуба, клена, гарбуза) не давав хлібу прилипнути до черені й набрати попелу. Так робили по всій Україні.' },
  { q: '«Ну вже, як вітягнем, побухаєм — як уже бубоніть, то вже готовий. А як не, то глевкій ще».', page: 819,
    ask: 'Що означає слово «глевкий»?', opts: ['Недопечений, липкий усередині', 'Пересолений', 'Дуже черствий'], a: 0,
    why: 'Постукували по скоринці: дзвінкий звук («бубонить») — хліб готовий, глухий — ще глевкий, недопечений.' },
  { q: '«Хліб треба, як впав кусочок хліба — підняв, поцілував. Хоть яка кришечка впала — підняв, поцілував».', page: 820,
    ask: 'Про що цей спогад?', opts: ['Про пошану до хліба', 'Про гру з дітьми', 'Про прибирання в хаті'], a: 0,
    why: 'Хліб дуже шанували: навіть крихту піднімали й цілували.' },
];
const Voices = {
  i: 0, shown: false,
  start() { this.i = -1; Scene.go(SceneBackdrop('voices', 'bg_hata', 'k10')); this.intro(); },
  intro() {
    Panel.open(`<div class="sen voices">
      <div class="sen-head"><div><div class="kick">Голоси з минулого · робота з першоджерелом</div><h2>Як пекли хліб — розповідають самі поліщуки</h2></div></div>
      <div class="sen-fact big">Етнограф Сергій Ципишев записав спогади людей, яких переселили з сіл Київського Полісся після аварії на ЧАЕС. Він зберіг їхню мову точно, з діалектними словами. Ми прочитаємо сім уривків і розгадаємо, про що вони.
      ${src('С. Ципишев. Хліб у традиційній культурі переселенців із зони відчуження ЧАЕС // Народознавчі зошити. 2016. № 4', 'https://nz.lviv.ua/archiv/2016-4/9.pdf')}</div>
      <p class="sen-tip">Як працюємо: хтось читає уривок уголос, клас пояснює діалектні слова, а потім обирає відповідь.</p>
      <button class="ans yes" id="vNext">Перший уривок →</button></div>`, 'wide');
  },
  show() {
    const v = VOICES[this.i]; if (!v) return this.end(); this.shown = false;
    Panel.open(`<div class="sen voices">
      <div class="sen-head"><div><div class="kick">Уривок ${this.i + 1} з ${VOICES.length} · с. ${v.page}</div><h2>${esc(v.ask)}</h2></div></div>
      <blockquote class="v-quote">${esc(v.q)}</blockquote>
      <div class="v-opts">${v.opts.map((o, k) => `<button class="ans" data-vo="${k}">${esc(o)}</button>`).join('')}</div>
      <div class="sen-fact" id="vWhy" hidden></div>
      <button class="ans yes" id="vNext" hidden>${this.i + 1 < VOICES.length ? 'Наступний уривок →' : 'Підсумок →'}</button></div>`, 'wide');
  },
  answer(k) {
    const v = VOICES[this.i]; if (this.shown) return; this.shown = true;
    document.querySelectorAll('[data-vo]').forEach(b => { const n = +b.dataset.vo; b.classList.add(n === v.a ? 'yes' : n === k ? 'no' : 'dim'); b.disabled = true; });
    k === v.a ? Sfx.ok() : Sfx.no();
    const w = $('#vWhy'); w.hidden = false; w.textContent = v.why; $('#vNext').hidden = false;
  },
  end() {
    Panel.open(`<div class="sen voices">
      <div class="sen-head"><div><div class="kick">Голоси з минулого · підсумок</div><h2>Що ми дізналися з першоджерела?</h2></div></div>
      <ul class="sen-q"><li>Які три кроки випікання з уривків ви бачили в нашій «Пекарні»?</li><li>Які діалектні слова вам сподобалися? Як сказали б сьогодні?</li><li>Чому етнографи записують спогади дослівно, з усіма особливостями мови?</li><li>Домашнє дослідження: розпитайте старших рідних (аркуш «Інтерв'ю з рідними»).</li></ul>
      <button class="ans yes" data-go="menu">До меню</button></div>`, 'wide');
  },
};
$('#panel').addEventListener('click', e => {
  if (e.target.closest('#vNext')) { Voices.i++; Voices.show(); }
  const o = e.target.closest('[data-vo]'); if (o) Voices.answer(+o.dataset.vo);
});

// ================================================================ Зерно і світ (кейс, 8–11)
const CASE_EVENTS = [
  ['1945', '16 жовтня засновано Продовольчу і сільськогосподарську організацію ООН (ФАО). Девіз — «Fiat panis», «Хай буде хліб»'],
  ['2022, липень', 'У Стамбулі підписано Чорноморську зернову ініціативу: судна з зерном виходять з Одеси, Чорноморська й Південного'],
  ['2022, листопад', 'Україна запускає гуманітарну ініціативу «Зерно з України» разом зі Світовою продовольчою програмою ООН'],
  ['2023, липень', 'Чорноморську ініціативу не продовжено після 17 липня: Росія вийшла з угоди'],
  ['2023, серпень', 'Україна відкриває власний морський коридор для суден із зерном'],
];
const CASE_Q = [
  { q: 'Скільки продовольства вивезли з України за Чорноморською зерновою ініціативою (серпень 2022 — липень 2023)?', opts: ['3,3 млн тонн', '32,9 млн тонн', '329 млн тонн'], a: 1,
    fact: '730 суден здійснили 1004 рейси й вивезли 32,9 млн тонн продовольства. Найбільше відправлень — з Чорноморська.', s: ['ООН: Black Sea Grain Initiative', 'https://www.un.org/nl/node/211659'] },
  { q: 'Що робили з експортом після того, як у липні 2023 року ініціатива припинилася?', opts: ['Експорт зупинився назавжди', 'Україна відкрила власний морський коридор', 'Зерно почали возити лише літаками'], a: 1,
    fact: 'З серпня 2023 року діє український морський коридор. За даними Адміністрації морських портів України, приблизно за 11 місяців ним пройшло близько 60 млн тонн вантажів, з них 40,6 млн тонн — зерно. Порти й судна при цьому зазнавали обстрілів.', s: ['Укрінформ (за даними АМПУ)', 'https://www.ukrinform.net/rubric-economy/3889370-60-million-tonnes-of-cargo-have-already-been-exported-via-ukrainian-sea-corridor.html'] },
  { q: 'Куди Світова продовольча програма ООН доставляла українське зерно за ініціативою «Зерно з України»?', opts: ['До країн Європейського Союзу', 'До Ефіопії, Сомалі, Кенії, Ємену та інших країн, де бракує їжі', 'Лише до сусідніх країн'], a: 1,
    fact: 'За даними ВПП (листопад 2024), з 2022 року за ініціативою вивезено 1,11 млн тонн продовольства; судна ВПП доставляли зерно до Ефіопії, Сомалі, Кенії, Ємену, Нігерії, Судану та інших країн — це допомогло нагодувати понад 8 млн людей.', s: ['ВПП ООН: Grain from Ukraine', 'https://docs.wfp.org/api/documents/WFP-0000166350/download'] },
  { q: 'Яку частку всіх калорій, які споживає людство, дає пшениця?', opts: ['Близько двадцятої частини', 'Близько п\'ятої частини', 'Близько половини'], a: 1,
    fact: 'Пшениця дає приблизно п\'яту частину калорій людства — більше, ніж будь-яке інше зерно, крім рису. Тому перебої з постачанням пшениці відчуває весь світ.', s: ['BioNumbers (за даними ФАО)', 'https://bionumbers.hms.harvard.edu/bionumber.aspx?id=110562'] },
];
const Case = {
  stage: 'intro', order: [], qi: 0, shown: false, score: [0, 0],
  start() { this.stage = 'intro'; this.order = []; this.qi = 0; Scene.go(SceneBackdrop('case', 'bg_combine', 'k10')); this.render(); },
  render() {
    let body = '';
    if (this.stage === 'intro') body = `<div class="sen-fact big">16 жовтня — день, коли 1945 року заснували ФАО. Сьогодні розслідуємо, як українське зерно потрапляє на столи в різних країнах і чому хліб — це питання безпеки.</div>
      <p class="sen-tip">Поділіться на дві команди. Кожна відповідь — після обговорення в команді (30 секунд).</p><div class="v-opts">${Lesson.active ? '' : '<button class="ans" id="cCart">▶ Мультик-вступ «Хай буде хліб» (1 хв)</button>'}<button class="ans yes" id="cNext">Почати: хронологія →</button></div>`;
    else if (this.stage === 'timeline') {
      const shuffled = this._sh || (this._sh = CASE_EVENTS.map((e, i) => i).sort(() => Math.random() - 0.5));
      body = `<p class="sen-tip">Розставте події від найдавнішої до найновішої: торкайтеся по черзі.</p>
        <div class="c-cards">${shuffled.map(i => { const k = this.order.indexOf(i); return `<button class="c-card${k >= 0 ? ' on' : ''}" data-ev="${i}">${k >= 0 ? `<b>${k + 1}</b>` : ''}<span>${esc(CASE_EVENTS[i][1])}</span>${this.order.length === CASE_EVENTS.length ? `<i>${CASE_EVENTS[i][0]}</i>` : ''}</button>`; }).join('')}</div>
        ${this.order.length === CASE_EVENTS.length ? `<div class="sen-fact">${this.order.every((v, k) => v === k) ? 'Усе правильно!' : 'Порівняйте свій порядок із датами на картках.'}</div><button class="ans yes" id="cNext">Далі: факти →</button>` : `<button class="ans" id="cReset">Почати спочатку</button>`}`;
    } else if (this.stage === 'q') {
      const q = CASE_Q[this.qi];
      body = `<div class="c-route">${['Поле', 'Порт', 'Море', 'Країна', 'Стіл'].map((s, k) => `<span class="${k <= this.qi + 1 ? 'on' : ''}">${s}</span>`).join('<i>→</i>')}</div>
        <h3 class="c-q">${esc(q.q)}</h3><div class="v-opts">${q.opts.map((o, k) => `<button class="ans" data-co="${k}">${esc(o)}</button>`).join('')}</div>
        <div id="cFact" class="sen-fact" hidden></div>
        <div class="q-pts" id="cPts" hidden><span>Хто відповів правильно?</span><button data-cp="0">+1 команда А</button><button data-cp="1">+1 команда Б</button><button data-cp="2">+1 обом</button></div>
        <button class="ans yes" id="cNext" hidden>${this.qi + 1 < CASE_Q.length ? 'Наступне питання →' : 'Висновки →'}</button>`;
    } else body = `<div class="c-score">Команда А: <b>${this.score[0]}</b> · Команда Б: <b>${this.score[1]}</b></div>
      <h3 class="c-q">Обговорення</h3><ul class="sen-q"><li>Чому продовольство називають питанням безпеки — для країни і для світу?</li><li>Як війна вплинула на шлях зерна від поля до столу? Назвіть щонайменше два чинники.</li><li>Чому, на вашу думку, ФАО обрала девіз «Хай буде хліб»?</li><li>Мініпроєкт: знайдіть в офіційному джерелі свіжий факт про продовольчу безпеку (аркуш «Хай буде хліб»).</li></ul>
      <button class="ans yes" data-go="menu">До меню</button>`;
    Panel.open(`<div class="sen case"><div class="sen-head"><div><div class="kick">Справа № 16/10 · Зерно і світ</div><h2>Шлях українського зерна</h2></div>
      <div class="c-score small">А: <b>${this.score[0]}</b> · Б: <b>${this.score[1]}</b></div></div>${body}</div>`, 'wide');
  },
};
$('#panel').addEventListener('click', e => {
  if (!Scene.cur || Scene.cur.id !== 'case') return;
  const ev = e.target.closest('[data-ev]');
  if (ev && Case.stage === 'timeline') { const i = +ev.dataset.ev; if (!Case.order.includes(i)) { Case.order.push(i); Sfx.pop(); if (Case.order.length === CASE_EVENTS.length) (Case.order.every((v, k) => v === k) ? Sfx.ok() : Sfx.no()); Case.render(); } return; }
  if (e.target.closest('#cReset')) { Case.order = []; Case.render(); return; }
  if (e.target.closest('#cCart')) { Flow.start('case', [() => SceneCartoon('m3')]); Scene.onNext = () => Case.start(); return; }
  const co = e.target.closest('[data-co]');
  if (co && !Case.shown) {
    Case.shown = true; const q = CASE_Q[Case.qi], k = +co.dataset.co;
    document.querySelectorAll('[data-co]').forEach(b => { const n = +b.dataset.co; b.classList.add(n === q.a ? 'yes' : n === k ? 'no' : 'dim'); b.disabled = true; });
    k === q.a ? Sfx.ok() : Sfx.no();
    const f = $('#cFact'); f.hidden = false; f.innerHTML = esc(q.fact) + ' ' + src(q.s[0], q.s[1]); $('#cPts').hidden = false; $('#cNext').hidden = false; return;
  }
  const cp = e.target.closest('[data-cp]'); if (cp) { const k = +cp.dataset.cp; if (k === 2) { Case.score[0]++; Case.score[1]++; } else Case.score[k]++; Sfx.pop(); document.querySelectorAll('[data-cp]').forEach(b => b.disabled = true); document.querySelector('.c-score.small').innerHTML = `А: <b>${Case.score[0]}</b> · Б: <b>${Case.score[1]}</b>`; return; }
  if (e.target.closest('#cNext')) {
    if (Case.stage === 'intro') { Case.stage = 'timeline'; Case._sh = null; }
    else if (Case.stage === 'timeline') { Case.stage = 'q'; Case.qi = 0; Case.shown = false; }
    else if (Case.stage === 'q') { Case.qi++; Case.shown = false; if (Case.qi >= CASE_Q.length) Case.stage = 'end'; }
    Case.render();
  }
});

// ================================================================ Фактчек-студія (8–11, 5–7)
const POSTS = [
  { who: '@kulinarni_laifkhaky', likes: '12,4 тис.', text: 'Побачили цвіль на хлібі? Не викидайте! Просто зріжте зелену плямку — решта цілком безпечна 👌', t: false, flags: ['«цілком безпечна» — абсолютна обіцянка', 'жодного джерела'],
    fact: 'Хліб м\'який, тож «коріння» цвілі проростає глибоко, а частина цвілі виробляє токсини. Пліснявий хліб радять викидати.', s: ['USDA FSIS: Molds on Food', 'https://www.fsis.usda.gov/sites/default/files/media_file/2021-02/Molds_on_Food.pdf'], g: 2 },
  { who: '@zdorovyi_vybir', likes: '48 тис.', text: 'ГЛЮТЕН — ОТРУТА для всіх!!! Перейдіть на безглютенове — і хвороби підуть 🙏', t: false, flags: ['ВЕЛИКІ ЛІТЕРИ й знаки оклику', '«для всіх»', 'обіцянка вилікувати'],
    fact: 'Без глютену мусять харчуватися люди з целіакією (за діагнозом лікаря). Для решти людей користі безглютенової дієти не доведено.', s: ['NIDDK (Національні інститути здоров\'я США): целіакія', 'https://niddk.nih.gov/health-information/digestive-diseases/celiac-disease'], g: 3 },
  { who: '@nauka_prosto', likes: '3,1 тис.', text: 'Пшениця дає людству приблизно п\'яту частину всіх калорій. Тому неврожай чи блокада портів б\'ють по всьому світу.', t: true, flags: [],
    fact: 'Так: пшениця дає близько 20 % калорій, які споживає людство.', s: ['BioNumbers (за даними ФАО)', 'https://bionumbers.hms.harvard.edu/bionumber.aspx?id=110562'], g: 3 },
  { who: '@pekar_vasyl', likes: '890', text: 'Дріжджі в хлібі живі навіть після печі й далі бродять у шлунку. Тому від хліба здуття!', t: false, flags: ['видає власну здогадку за факт'],
    fact: 'Під час випікання дріжджі гинуть: їх убиває температура близько 55–60 °C, а всередині хлібини під час випікання значно гарячіше.', s: ['Bakerpedia: yeast kill', 'https://bakerpedia.com/processes/yeast-kill/'], g: 2 },
  { who: '@istoriia_ua', likes: '7,7 тис.', text: 'Хліб на заквасці пекли ще в часи Київської держави — згадку про квашене тісто знаходять у Києво-Печерському патерику XIII століття.', t: true, flags: [],
    fact: 'Правда: етнограф С. Ципишев посилається на запис у Києво-Печерському патерику.', s: ['Народознавчі зошити, 2016, № 4, с. 818', 'https://nz.lviv.ua/archiv/2016-4/9.pdf'], g: 2 },
  { who: '@novyny_24_7', likes: '21 тис.', text: 'Всесвітній день хліба придумали в Україні, і святкують його тільки в нас!', t: false, flags: ['«тільки в нас» — легко перевірити'],
    fact: 'Дата 16 жовтня пов\'язана із заснуванням ФАО (1945) — це міжнародне свято. Того ж дня — Всесвітній день продовольства.', s: ['ФАО', 'https://www.fao.org/4/p4228e/P4228E16.htm'], g: 2 },
  { who: '@ukr_more', likes: '15 тис.', text: 'За рік Чорноморської зернової ініціативи з українських портів вивезли майже 33 млн тонн продовольства.', t: true, flags: [],
    fact: 'Правда: 32,9 млн тонн, 730 суден, 1004 рейси (серпень 2022 — липень 2023).', s: ['ООН', 'https://www.un.org/nl/node/211659'], g: 3 },
  { who: '@kukhnia_babusi', likes: '2,2 тис.', text: 'Тісто піднімається, бо в борошні багато повітря. Просійте двічі — і хліб буде пишніший без дріжджів!', t: false, flags: ['звучить логічно, але без доказів'],
    fact: 'Тісто піднімає вуглекислий газ, який виділяють дріжджі чи закваска. Без них тісто не підійде, хоч скільки просіюй.', s: ['НУХТ: закваски в хлібопеченні', 'https://dspace.nuft.edu.ua/bitstreams/ced7b792-ce94-4a43-b961-9c8a2db691a1/download'], g: 2 },
];
const HOW = [['💬', 'Почитати коментарі під дописом', 'Коментарі — теж чужі думки, а не докази.'], ['🏛️', 'Знайти офіційне чи наукове джерело', 'Так! ООН, університет, державна служба — там перевіряють факти.'], ['❤️', 'Подивитися, скільки лайків', 'Лайки показують популярність, а не правду.']];
const Fact = {
  list: [], i: 0, step: 0, score: 0, ans: null, how: null,
  start() { const g = State.grade; this.list = POSTS.filter(p => p.g <= Math.max(2, g)); this.i = 0; this.step = 0; this.score = 0; this.ans = this.how = null; Scene.go(SceneBackdrop('fact', 'bg_map', 'k10')); this.render(); },
  render() {
    const p = this.list[this.i];
    const dots = this.list.map((_, k) => `<i class="${k < this.i ? 'ok' : k === this.i ? 'now' : ''}"></i>`).join('');
    const head = (title, kick) => `<div class="fx-head"><div><div class="kick">${kick}</div><h2>${title}</h2></div><div class="fx-meta"><div class="fx-dots">${dots}</div><div class="c-score small">Влучно: <b>${this.score}</b></div></div></div>`;
    if (!p) {
      Panel.open(`<div class="sen fx">${head(`Розпізнано правильно: ${this.score} з ${this.list.length}`, 'Фактчек-студія · підсумок')}
        <div class="fx-end"><div class="fx-flags"><h3>🚩 Червоні прапорці фейку</h3><ul><li>Емоції, ВЕЛИКІ ЛІТЕРИ, багато знаків оклику</li><li>Абсолютні слова: «усім», «завжди», «тільки», «цілком безпечно»</li><li>Немає джерела, або «джерело» — коментарі й лайки</li><li>Просте рішення складної проблеми</li></ul></div>
        <div class="fx-rule">🏛️ <b>Правило:</b> перевір у першоджерелі — офіційний документ, наукова установа, державна служба.</div></div>
        ${Lesson.active ? '' : '<button class="ans yes" data-go="menu">До меню</button>'}</div>`, 'wide'); Sfx.ding(); return;
    }
    const post = `<div class="post"><div class="post-h"><span class="ava">${p.who[1].toUpperCase()}</span><b>${esc(p.who)}</b><span class="muted">♥ ${p.likes}</span></div><p>${esc(p.text)}</p></div>`;
    let body = '';
    if (this.step === 0) body = `<p class="fx-ask">Як думаєте: це правда чи фейк? Голосуйте руками, а тоді торкніться відповіді класу.</p>
      <div class="fx-tf"><button class="fx-big yes" data-fv="1">✔ Правда</button><button class="fx-big no" data-fv="0">✘ Фейк</button></div>`;
    else {
      const right = this.ans === p.t;
      const verdict = `<div class="fx-verdict ${p.t ? 'yes' : 'no'}"><b>${p.t ? '✔ Правда' : '✘ Фейк'}</b><span>${right ? 'Клас відповів правильно! 🎉' : `Клас думав «${this.ans ? 'правда' : 'фейк'}», але це не так.`}</span></div>`;
      if (this.step === 1) body = verdict + `<p class="fx-ask">А як найкраще перевірити такий допис?</p>
        <div class="fx-how">${HOW.map((h, k) => `<button class="fx-opt" data-fh="${k}"><i>${h[0]}</i><span>${esc(h[1])}</span></button>`).join('')}</div>`;
      else body = verdict + `<div class="fx-howres ${this.how === 1 ? 'good' : 'bad'}"><i>${this.how === 1 ? '✔' : '✘'}</i><span>${this.how === 1 ? '<b>Так!</b> Перевіряємо в офіційному чи науковому джерелі.' : `<b>${esc(HOW[this.how][2])}</b> Перевіряти треба в офіційному чи науковому джерелі.`}</span></div>
        <div class="sen-fact">${esc(p.fact)} ${src(p.s[0], p.s[1])}</div>
        <div class="fx-foot">${p.flags.length ? `<div class="flags">${p.flags.map(f => `<span>🚩 ${esc(f)}</span>`).join('')}</div>` : '<div></div>'}<button class="ans yes" id="fNext">${this.i + 1 < this.list.length ? 'Наступний допис →' : 'Підсумок →'}</button></div>`;
    }
    Panel.open(`<div class="sen fx${this.step ? ' after' : ''}">${head('Правда чи фейк?', `Фактчек-студія · допис ${this.i + 1} з ${this.list.length}`)}${post}${body}</div>`, 'wide');
  },
};
$('#panel').addEventListener('click', e => {
  if (!e.target.closest('.fx')) return;
  const fv = e.target.closest('[data-fv]'); if (fv && Fact.step === 0) { const p = Fact.list[Fact.i]; Fact.ans = +fv.dataset.fv === 1; const ok = Fact.ans === p.t; if (ok) Fact.score++; ok ? Sfx.ok() : Sfx.no(); Fact.step = 1; Fact.render(); return; }
  const fh = e.target.closest('[data-fh]'); if (fh && Fact.step === 1) { Fact.how = +fh.dataset.fh; Fact.how === 1 ? Sfx.ok() : Sfx.no(); Fact.step = 2; Fact.render(); return; }
  if (e.target.closest('#fNext')) { Fact.i++; Fact.step = 0; Fact.ans = Fact.how = null; Sfx.pop(); Fact.render(); }
});
