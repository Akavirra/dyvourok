'use strict';
// Меню, «Правда чи вигадка», прислів'я, мультики. Усе — великі HTML-картки поверх сцени.

const Panel = {
  open(html, cls = '') { const el = $('#panel'); el.className = 'panel ' + cls; el.innerHTML = html; el.hidden = false; },
  close() { $('#panel').hidden = true; $('#panel').innerHTML = ''; },
};

// Тло для меню й ігор: карта шляху з колосками.
function SceneBackdrop(id, key = 'bg_map', k = 'k01') {
  return { id, noProg: true, noMascot: true, enter() { Mascot.set(k); }, draw(t) { bg(key); ctx.fillStyle = 'rgba(251,246,236,.35)'; const v = View.vis(); ctx.fillRect(v.x, v.y, v.w, v.h); } };
}

// Урок — одна послідовність кроків для кожного класу. Учитель тисне «Почати урок» і далі лише «Далі».
// Кожен крок можна почати й окремо (урок продовжиться з нього).
const STEPS = {
  path:   { ic: 'g01', t: 'Шлях зернини', s: 'сіємо, жнемо, молотимо, мелемо — усім класом', min: 12, run: () => Flow.start('path', PATH_SCENES) },
  bakery: { ic: 'g06', t: 'Пекарня', s: 'місимо тісто й печемо хліб у печі', min: 12, run: () => Flow.start('bakery', BAKERY_SCENES) },
  c1:     { ic: 'g07', t: 'Мультик', s: '«Нива діда Остапа»', min: 2, run: () => Flow.start('c1', [() => SceneCartoon('c1')]) },
  c2:     { ic: 'g07', t: 'Мультик', s: '«У вітряку мельника Гната»', min: 2, run: () => Flow.start('c2', [() => SceneCartoon('c2')]) },
  c3:     { ic: 'g07', t: 'Мультик', s: '«Хлібний день бабусі Ганни»', min: 2, run: () => Flow.start('c3', [() => SceneCartoon('c3')]) },
  m3:     { ic: 'g07', t: 'Мультик-вступ', s: '«Хай буде хліб»', min: 2, run: () => Flow.start('m3', [() => SceneCartoon('m3')]) },
  quiz:   { ic: 'g08', t: 'Правда чи вигадка?', s: 'командами', min: 6, panel: true, run: () => Quiz.start() },
  prov:   { ic: 'g09', t: 'Прислів\'я хором', s: '', min: 4, panel: true, run: () => Prov.start() },
  lab:    { ic: 'g05', t: 'Лабораторія тіста', s: 'дослід із графіком', min: 10, panel: true, run: () => Lab.start() },
  voices: { ic: 'g09', t: 'Голоси з минулого', s: 'першоджерело', min: 8, panel: true, run: () => Voices.start() },
  case:   { ic: 'g04', t: 'Зерно і світ', s: 'кейс командами', min: 15, panel: true, run: () => Case.start() },
  fact:   { ic: 'g08', t: 'Фактчек-студія', s: 'правда чи фейк', min: 10, panel: true, run: () => Fact.start() },
};
const PLAN = {
  1: ['path', 'c1', 'bakery', 'c3', 'quiz', 'prov'],
  2: ['path', 'c2', 'bakery', 'lab', 'voices'],
  3: ['m3', 'case', 'lab', 'fact'],
};
const EXTRA = { 1: ['c2'], 2: ['c1', 'c3', 'quiz', 'prov'], 3: ['voices', 'c2', 'path', 'bakery'] };   // «ще можна» — поза основним уроком

const Lesson = {
  active: false, list: [], i: 0,
  start(i = 0, list = PLAN[State.grade]) { this.active = true; this.list = list; this.i = i; this.run(); },
  run() {
    const k = this.list[this.i]; if (!k) return this.finish();
    document.body.classList.toggle('lesson-panel', !!STEPS[k].panel);
    STEPS[k].run();
    if (STEPS[k].panel) this.showNext();
    this.bar();
  },
  next() { this.i++; this.run(); },
  showNext() { Scene.onNext = () => this.next(); $('#next').hidden = false; $('#nextLabel').textContent = this.i + 1 < this.list.length ? 'Наступний крок' : 'Завершити урок'; },
  finish() { this.stop(); Flow.list = []; Scene.onNext = null; Scene.go(SceneLessonEnd()); },
  stop() { this.active = false; document.body.classList.remove('lesson-panel'); $('#lsn').hidden = true; },
  bar() {
    const el = $('#lsn'); el.hidden = false;
    // компактно: поточний крок з назвою, решта — кружечки з номером (назва в підказці)
    el.innerHTML = this.list.map((k, i) => i === this.i
      ? `<span class="now">${i + 1}. ${esc(STEPS[k].t)}</span>`
      : `<span class="dot ${i < this.i ? 'ok' : ''}" title="${esc(STEPS[k].t)}">${i < this.i ? '✓' : i + 1}</span>`).join('');
  },
};

const Menu = {
  open() {
    Lesson.stop();
    Flow.list = []; Scene.onNext = null; Scene.go(SceneBackdrop('menu'));
    const plan = PLAN[State.grade], extra = EXTRA[State.grade];
    const total = plan.reduce((s, k) => s + STEPS[k].min, 0);
    const sub = { 1: 'Від зернини до паляниці разом із Воркотом і Вісткою', 2: 'Гра всім класом, лабораторія й першоджерело', 3: 'Хліб і світ: кейс, наука, фактчек' }[State.grade];
    const step = (k, i) => `<button class="step" data-step="${i}"><b>${i + 1}</b><img src="img/${STEPS[k].ic}.webp" alt=""><span><em>${esc(STEPS[k].t)}</em>${STEPS[k].s ? `<small>${esc(STEPS[k].s)}</small>` : ''}</span><i>≈${STEPS[k].min} хв</i></button>`;
    Panel.open(`
      <div class="menu lesson">
        <div class="menu-head"><img src="img/k20.webp" alt=""><div><h1>Урок на дошці</h1><p>${sub} · ${GRADES[State.grade]} клас</p></div></div>
        <div class="start-row">
          <button class="startbtn" data-start="1">▶ Почати урок<small>${plan.length} кроків · ≈${total} хв · далі тільки «Далі»</small></button>
        </div>
        <div class="steps-row">${plan.map(step).join('<span class="arrow">›</span>')}</div>
        <p class="steps-hint">Можна почати з будь-якого кроку — урок продовжиться далі.${extra.length ? ' Ще можна окремо: ' + extra.map(k => `<button class="mini" data-extra="${k}">${esc(STEPS[k].t)}</button>`).join(' ') : ''}</p>
      </div>`, 'wide');
  },
};
$('#panel').addEventListener('click', e => {
  if (e.target.closest('[data-start]')) { Sfx.pop(); Panel.close(); Lesson.start(0); return; }
  const s = e.target.closest('[data-step]'); if (s) { Sfx.pop(); Panel.close(); Lesson.start(+s.dataset.step); return; }
  const x = e.target.closest('[data-extra]'); if (x) { Sfx.pop(); Panel.close(); Lesson.start(0, [x.dataset.extra]); return; }
});
$('#panel').addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (!b) return; Sfx.pop();
  const go = b.dataset.go; Panel.close();
  if (go === 'path') Flow.start('path', PATH_SCENES);
  else if (go === 'bakery') Flow.start('bakery', BAKERY_SCENES);
  else if (go === 'quiz') Quiz.start();
  else if (go === 'lab') Lab.start();
  else if (go === 'voices') Voices.start();
  else if (go === 'case') Case.start();
  else if (go === 'fact') Fact.start();
  else if (go === 'prov') Prov.start();
  else if (go === 'video') Video.open();
  else if (go === 'teacher') Teacher.open();
  else if (go === 'menu') { if (Lesson.active) Lesson.next(); else Menu.open(); }
});

// ---------- Правда чи вигадка: «правда» — встали, «вигадка» — сидимо; дві команди з рахунком ----------
const Quiz = {
  list: [], i: 0, score: [0, 0],
  pick() {
    const g = State.grade, by = n => QUIZ.filter(q => q.g === n);
    if (g === 1) return by(1);
    if (g === 2) return [...by(1).slice(0, 3), ...by(2)];
    return [...by(1).slice(3, 5), ...by(2).slice(0, 3), ...by(3)];
  },
  start() {
    this.list = this.pick(); this.i = 0; this.score = [0, 0];
    Scene.go(SceneBackdrop('quiz', 'bg_nyva')); this.shell();
    Voice.say('q_start').then(() => this.show());
  },
  shell() {
    Panel.open(`<div class="quiz">
      <div class="q-teams"><div class="team">Колосок <b id="t0">0</b></div><div class="team">Паляниця <b id="t1">0</b></div></div>
      <div class="q-count" id="qc"></div>
      <div class="q-card"><img class="q-mag" src="img/s17.webp" alt=""><p id="qClaim">Чули-чули?!</p></div>
      <div class="q-rule">🧍 Правда — встаньте! &nbsp; 🪑 Вигадка — сидіть!</div>
      <div class="q-btns" id="qb"></div><div class="q-why" id="qw" hidden></div></div>`);
  },
  show() {
    const q = this.list[this.i]; if (!q) return this.end();
    $('#qc').textContent = `Новина ${this.i + 1} з ${this.list.length}`;
    $('#qClaim').textContent = q.claim; $('#qw').hidden = true;
    $('#qb').innerHTML = `<button class="ans yes" data-a="1">Більшість: правда</button><button class="ans no" data-a="0">Більшість: вигадка</button>`;
    Voice.say(q.id);
  },
  answer(a) {
    const q = this.list[this.i], right = (a === 1) === q.t;
    right ? Sfx.ok() : Sfx.no();
    $('#qb').innerHTML = `<div class="verdict ${q.t ? 'yes' : 'no'}">${q.t ? 'Правда' : 'Вигадка'}${right ? ' — клас правий!' : ''}</div>`;
    $('#qw').hidden = false;
    $('#qw').innerHTML = `<img src="img/k10.webp" alt=""><p>${esc(q.why)}</p>
      <div class="q-pts"><span>Хто відповів правильно?</span><button data-pt="0">+1 Колосок</button><button data-pt="1">+1 Паляниця</button><button data-pt="2">+1 обом</button><button class="nextq" id="qn">Далі →</button></div>`;
    Voice.say(q.id + '_why');
  },
  point(k) { if (k === 2) { this.score[0]++; this.score[1]++; } else this.score[k]++; $('#t0').textContent = this.score[0]; $('#t1').textContent = this.score[1]; Sfx.pop(); document.querySelectorAll('[data-pt]').forEach(b => b.disabled = true); },
  end() {
    Voice.say('q_end'); Sfx.ding();
    const [a, b] = this.score, w = a === b ? 'Нічия — обидві команди молодці!' : `Перемогла команда «${a > b ? 'Колосок' : 'Паляниця'}»!`;
    $('#qc').textContent = ''; $('#qClaim').textContent = w; $('#qw').hidden = true; document.querySelector('.q-rule').hidden = true;
    $('#qb').innerHTML = Lesson.active ? '' : `<button class="ans yes" data-go="menu">До меню</button>`;
  },
};
$('#panel').addEventListener('click', e => {
  const a = e.target.closest('[data-a]'); if (a) return Quiz.answer(+a.dataset.a);
  const pt = e.target.closest('[data-pt]'); if (pt) return Quiz.point(+pt.dataset.pt);
  if (e.target.closest('#qn')) { Quiz.i++; Quiz.show(); }
  if (e.target.closest('#qAgain')) Quiz.start();
});

// ---------- Прислів'я хором: показуємо початок, клас вигукує кінець, учитель відкриває ----------
const Prov = {
  set: [], i: 0,
  start() {
    const n = State.grade === 1 ? 5 : 8;
    this.set = PROVERBS.slice(0, n); this.i = 0;
    Scene.go(SceneBackdrop('prov', 'bg_final', 'k10'));
    Panel.open(`<div class="prov"><h2>Прислів'я хором</h2><p class="hint">Воркіт починає, а клас голосно закінчує!</p>
      <div class="pv-card"><b id="pvA"></b><span id="pvB" class="pv-b">… ?</span></div>
      <div class="q-btns"><button class="ans yes" id="pvShow">Відкрити кінець</button></div><p class="hint" id="pvN"></p></div>`);
    Voice.say('pr_class').then(() => this.show());
  },
  show() {
    const p = this.set[this.i];
    if (!p) { Panel.open(`<div class="prov"><h2>Усі прислів'я сказали!</h2><div class="list">${this.set.map(p => `<p>${esc(p[0])} ${esc(p[1])}</p>`).join('')}</div>${Lesson.active ? '' : '<button class="ans yes" data-go="menu">До меню</button>'}</div>`); Sfx.ding(); return; }
    $('#pvA').textContent = p[0]; $('#pvB').textContent = '… ?'; $('#pvB').classList.remove('open');
    $('#pvShow').textContent = 'Відкрити кінець'; $('#pvN').textContent = `${this.i + 1} з ${this.set.length}`; this.open = false;
  },
  reveal() {
    const p = this.set[this.i];
    if (!this.open) { this.open = true; $('#pvB').textContent = p[1]; $('#pvB').classList.add('open'); Sfx.ok(); Voice.say(p[2]); $('#pvShow').textContent = 'Наступне →'; }
    else { this.i++; this.show(); }
  },
};
$('#panel').addEventListener('click', e => { if (e.target.closest('#pvShow')) Prov.reveal(); });

// ---------- Мультики ----------
const Video = {
  open() {
    Scene.go(SceneBackdrop('video', 'bg_map'));
    Panel.open(`<div class="videos"><h2>Мультики</h2><div class="vgrid">${CARTOONS.map(c => `
      <button class="vcard" data-v="${c.id}"><img src="../packs/khlib/media/${c.id}.jpg" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'vph',textContent:'🎬'}))"><b>${esc(c.title)}</b><span>${c.g === 3 ? '8–11 класи' : 'для всіх класів'}</span></button>`).join('')}</div>
      <div class="player" id="player" hidden><div class="vslot" id="vSlot"></div><button class="ans" id="vClose">Закрити</button></div></div>`, 'wide');
  },
};
$('#panel').addEventListener('click', e => {
  const v = e.target.closest('[data-v]');
  if (v) { Voice.stop(); $('#vSlot').replaceChildren(VPlayer(v.dataset.v, { autoplay: true })); $('#player').hidden = false; return; }
  if (e.target.closest('#vClose')) { const vid = $('#vSlot video'); if (vid) vid.pause(); $('#vSlot').replaceChildren(); $('#player').hidden = true; }
});

// ---------- Для вчителя ----------
const Teacher = {
  open() {
    Scene.go(SceneBackdrop('teacher', 'bg_map'));
    Panel.open(`<div class="teacher"><h2>Для вчителя</h2>
      <p>Клас перемикається вгорі праворуч. Від класу залежать «Цікавинки» (лампочка після кожного етапу), новини у вікторині й кількість прислів'їв.</p>
      <div class="links">
        <a href="../packs/khlib/docs/plan.pdf" target="_blank" rel="noopener">План заняття (PDF)</a>
        <a href="../packs/khlib/docs/rozdatka-${GRADES[State.grade].replace('–', '-')}.pdf" target="_blank" rel="noopener">Роздатка для ${GRADES[State.grade]} класів (PDF)</a>
        <a href="../packs/khlib/docs/nalipky-zakladky.pdf" target="_blank" rel="noopener">Наліпки, карта досягнень і закладки (PDF)</a>
        <a href="../packs/khlib/docs/banery.pdf" target="_blank" rel="noopener">Банери й фотозона для друку (PDF)</a>
        <a href="../packs/khlib/docs/hramota.pdf" target="_blank" rel="noopener">Грамота «Знавець хліба» (PDF)</a>
        <a href="dzherela.html" target="_blank" rel="noopener">Джерела: кожен факт перевірено</a>
      </div>
      <p class="muted">Керування: усе робиться пальцем на інтерактивній дошці або мишкою. Кнопка «Далі» з'являється, коли етап пройдено; на клавіатурі — стрілка вправо. Якщо звук не потрібен — 🔊 угорі.</p>
      <button class="ans yes" data-go="menu">До меню</button></div>`);
  },
};

// ---------- мультик як етап уроку ----------
// Висока якість із R2 (hq/), якщо недоступна — стиснена копія (media/). Можна пропустити.
const CART_INFO = {
  c1: ['Мультик-екскурсія', 'Нива діда Остапа', 'Порівняйте: що ми робили в грі так само, як дід Остап? А що виявилося інакше?', 101],
  c2: ['Мультик-екскурсія', 'У вітряку мельника Гната', 'Стежте за зерном: через які частини вітряка воно проходить, поки стане борошном?', 99],
  c3: ['Мультик-екскурсія', 'Хлібний день бабусі Ганни', 'Що бабуся Ганна робила так само, як ми в «Пекарні»? А що ми пропустили?', 102],
  m3: ['Мультик-вступ', '«Хай буде хліб»', 'Чому День хліба — 16 жовтня? Дивимося й записуємо дві дати.', 66],
};
function SceneCartoon(id) {
  return {
    id: 'cartoon', noMascot: true, music: 'none',
    enter() {
      const [kick, title, ask] = CART_INFO[id];
      Panel.open(`<div class="sen cart">
        <div class="sen-head"><div><div class="kick">${kick} · ≈${Math.round(CART_INFO[id][3] / 60 * 10) / 10} хв</div><h2>${title}</h2></div></div>
        <p class="sen-tip">${ask}</p>
        <div class="cart-v" id="cartSlot"></div>
      </div>`, 'wide');
      $('#cartSlot').append(VPlayer(id, { onEnd: () => { $('#nextLabel').textContent = 'Далі'; Sfx.ok(); } }));
      $('#next').hidden = false; $('#nextLabel').textContent = 'Пропустити';
    },
    leave() { const v = $('#cartSlot video'); if (v) v.pause(); Panel.close(); },
  };
}

// ---------- власний плеєр (як у наборі «День мови»): великі кнопки, наші субтитри, без «Завантажити» ----------
const VP_ICO = {
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  cc: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17 10.2a2.4 2.4 0 1 0 0 3.6"/>',
};
const vpIco = k => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${VP_ICO[k]}</svg>`;
const vpTime = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const VTT = {};
function vttLoad(id) {
  if (VTT[id]) return VTT[id];
  const t = s => { const m = s.trim().match(/(?:(\d+):)?(\d+):(\d+)[.,](\d+)/); return m ? (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000 : 0; };
  return VTT[id] = fetch('../packs/khlib/media/' + id + '.vtt').then(r => r.ok ? r.text() : '').then(txt => txt.replace(/\r/g, '').split(/\n\n+/).map(b => {
    const ls = b.split('\n'), i = ls.findIndex(l => l.includes('-->')); if (i < 0) return null;
    const [a, z] = ls[i].split('-->'); return [t(a), t(z), ls.slice(i + 1).join(' ').trim()];
  }).filter(Boolean)).catch(() => []);
}
function VPlayer(id, { autoplay = false, onEnd } = {}) {
  const box = document.createElement('div'); box.className = 'vp'; box.tabIndex = 0;
  box.innerHTML = `<video playsinline preload="metadata" poster="../packs/khlib/media/${id}.jpg" disablepictureinpicture></video>
    <div class="vp-sub"></div>
    <button class="vp-big" aria-label="Дивитися">${vpIco('play')}</button>
    <div class="vp-bar"><button class="vp-btn vp-play" aria-label="Відтворити або пауза">${vpIco('play')}</button>
      <input class="vp-seek" type="range" min="0" max="1000" value="0" aria-label="Перемотування"><span class="vp-time">0:00 / 0:00</span>
      <button class="vp-btn vp-cc on" aria-label="Субтитри">${vpIco('cc')}<span>Субтитри</span></button>
      <button class="vp-btn vp-fs" aria-label="На весь екран">${vpIco('full')}</button></div>`;
  const v = box.querySelector('video'), sub = box.querySelector('.vp-sub'), seek = box.querySelector('.vp-seek'), time = box.querySelector('.vp-time');
  const pb = box.querySelector('.vp-play'), cc = box.querySelector('.vp-cc');
  let cues = [], subsOn = Store.get('vpSubs', true), shown = -1, seeking = false, idle;
  vttLoad(id).then(c => { cues = c; shown = -2; showSub(); });
  v.src = '../packs/khlib/hq/' + id + '.mp4';
  v.addEventListener('error', () => { if (!v.dataset.fb) { v.dataset.fb = 1; v.src = '../packs/khlib/media/' + id + '.mp4'; if (autoplay) v.play().catch(() => {}); } });
  box.addEventListener('contextmenu', e => e.preventDefault());
  const showSub = () => {
    const tt = v.currentTime, i = subsOn ? cues.findIndex(c => tt >= c[0] && tt <= c[1]) : -1;
    if (i === shown) return; shown = i; sub.innerHTML = i >= 0 ? `<span>${esc(cues[i][2])}</span>` : '';
  };
  const syncCC = () => { cc.classList.toggle('on', subsOn); shown = -2; showSub(); };
  const syncTime = () => { const d = v.duration || 0; if (!seeking) seek.value = d ? Math.round(v.currentTime / d * 1000) : 0; time.textContent = vpTime(v.currentTime) + ' / ' + vpTime(d); };
  const syncBtn = () => { pb.innerHTML = vpIco(v.paused ? 'play' : 'pause'); box.classList.toggle('playing', !v.paused); };
  const toggle = () => { if (v.paused) v.play().catch(() => {}); else v.pause(); };
  const poke = () => { box.classList.remove('idle'); clearTimeout(idle); if (!v.paused) idle = setTimeout(() => box.classList.add('idle'), 2500); };
  const tick = () => { showSub(); syncTime(); if (!v.paused && box.isConnected) requestAnimationFrame(tick); };
  v.addEventListener('play', () => { Voice.stop(); syncBtn(); poke(); requestAnimationFrame(tick); });
  v.addEventListener('pause', () => { syncBtn(); poke(); });
  v.addEventListener('ended', () => { syncBtn(); if (onEnd) onEnd(); });
  ['loadedmetadata', 'seeked', 'timeupdate'].forEach(ev => v.addEventListener(ev, () => { syncTime(); showSub(); }));
  seek.addEventListener('input', () => { seeking = true; if (v.duration) v.currentTime = seek.value / 1000 * v.duration; });
  seek.addEventListener('change', () => { seeking = false; });
  v.onclick = toggle; box.querySelector('.vp-big').onclick = toggle; pb.onclick = toggle;
  cc.onclick = () => { subsOn = !subsOn; Store.set('vpSubs', subsOn); syncCC(); };
  box.querySelector('.vp-fs').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
  };
  box.addEventListener('pointermove', poke); box.addEventListener('pointerdown', poke);
  box.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') toggle();
    else if (k === 'arrowright') v.currentTime += 5;
    else if (k === 'arrowleft') v.currentTime -= 5;
    else if (k === 'f' || k === 'а') box.querySelector('.vp-fs').onclick();
    else return;
    e.preventDefault(); e.stopPropagation(); poke();
  });
  syncCC();
  if (autoplay) v.play().catch(() => {});
  return box;
}

// ---------- кінець уроку: свято, підсумок, грамоти ----------
function SceneLessonEnd() {
  const conf = () => { for (let i = 0; i < 90; i++) FX.add({ kind: 'grain', x: rnd(80, 1520), y: rnd(-80, -10), vx: rnd(-50, 50), vy: rnd(60, 220), g: 240, life: 4.5, r: 7, col: ['#E3B04B', '#C8341F', '#2E7D4F', '#F6E3A8'][i % 4], vr: rnd(-6, 6) }); };
  const what = { 1: 'Ви пройшли весь шлях — від зернини до запашної паляниці!', 2: 'Ви пройшли шлях хліба й самі перевірили, як росте тісто!', 3: 'Ви дослідили, як хліб пов\'язаний зі світом, наукою й правдою!' }[State.grade];
  return {
    id: 'end', noProg: true, music: 'mus_final',
    enter() {
      Mascot.startDance(['k04', 'k03', 'k06', 'k03'], ['s04', 's03', 's11', 's03'], 96, { kx: 300, sx: 640, y: 840, sc: 1.1 });
      conf(); Sfx.ding(); Timers.later(conf, 2600);
      Panel.open(`<div class="endcard"><div class="end-kick">Урок завершено</div><h1>Молодці, хлібознавці!</h1><p>${esc(what)}</p>
        <p class="end-t">Учителю: час роздати грамоти «Знавець хліба»</p>
        <button class="ans yes" data-go="menu">До меню уроку</button></div>`, 'endp');
      Timers.later(() => Voice.say('final_1'), 900);
    },
    leave() { Panel.close(); },
    draw() { bg('bg_final'); },
  };
}
