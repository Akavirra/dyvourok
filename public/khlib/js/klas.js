'use strict';
// Дії всього класу. Працює БЕЗ мікрофона: екран веде відлік / метроном, учитель тисне 👏 або пробіл.
// З мікрофоном (🎤 угорі) застосунок сам чує оплески, хоровий крик, дмухання й тишу.

const Mic = {
  on: false, stream: null, an: null, buf: null, baseline: -55, level: -100, raw: -100, peak: -100,
  armed: true, lastOn: 0, calib: null,
  quietThr() { return this.baseline + 9; }, voiceThr() { return this.baseline + 14; }, clapThr() { return this.baseline + 26; },
  isQuiet() { return this.level < this.quietThr(); }, isLoud() { return this.level > this.voiceThr(); },
  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return 'Браузер не дає доступу до мікрофона. Урок іде кнопками 👏.';
    try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
    catch (e) { return e.name === 'NotAllowedError' ? 'Мікрофон не дозволено. Урок іде кнопками 👏.' : e.name === 'NotFoundError' ? 'Мікрофон не знайдено. Урок іде кнопками 👏.' : 'Мікрофон зайнятий іншою програмою. Урок іде кнопками 👏.'; }
    const c = Sfx.ctx(); if (c.state !== 'running') await c.resume();
    const src = c.createMediaStreamSource(this.stream); this.an = c.createAnalyser(); this.an.fftSize = 1024; this.buf = new Float32Array(1024);
    const mute = c.createGain(); mute.gain.value = 0; src.connect(this.an); this.an.connect(mute); mute.connect(c.destination);
    this.on = true; this.level = -100; this.calib = { until: performance.now() / 1000 + 1.5, vals: [] };
    return '';
  },
  stop() { if (this.stream) this.stream.getTracks().forEach(t => t.stop()); this.on = false; this.level = -100; },
  update(t) {
    if (!this.on) return;
    this.an.getFloatTimeDomainData(this.buf); let s = 0, p = 0;
    for (let i = 0; i < this.buf.length; i++) { const v = this.buf[i]; s += v * v; const a = Math.abs(v); if (a > p) p = a; }
    this.raw = 20 * Math.log10(Math.sqrt(s / this.buf.length) + 1e-9); this.peak = 20 * Math.log10(p + 1e-9);
    this.level = this.level < -99 ? this.raw : this.level * 0.8 + this.raw * 0.2;
    if (this.calib) { this.calib.vals.push(this.raw); if (t > this.calib.until) { const v = this.calib.vals.sort((a, b) => a - b); this.baseline = clamp(v[Math.floor(v.length * 0.6)], -85, -25); this.calib = null; } return; }
    const thr = this.clapThr();
    if (this.armed && this.peak > thr && t - this.lastOn > 0.12) { this.lastOn = t; this.armed = false; Klas.onClap('mic'); }
    if (this.peak < thr - 6) this.armed = true;
    // рівень на кнопці мікрофона
    const lv = clamp((this.level - this.baseline) / 30, 0, 1); $('#micBtn').style.setProperty('--lv', lv);
  },
};

const Klas = {
  mode: null, taps: 0, holding: false, listeners: [],
  // Режими кнопки: 'tap' (оплески, стук), 'hold' (шум, вітер, дмухання — тримати), 'noise' (гра в тишу: «Шумно!»), 'do' (зробити замість волонтера)
  show(icon, text, mode = 'tap', btnLabel) {
    this.mode = mode; this.listeners = []; const el = $('#cls'); el.hidden = false;
    $('#clsIcon').textContent = icon; $('#clsText').textContent = text; this.progress(null);
    const b = $('#clsBtn'); b.hidden = false; b.dataset.mode = mode;
    b.innerHTML = btnLabel || ({ tap: '👏<small>оплеск</small>', hold: '🌬️<small>тримайте</small>', noise: '🔊<small>шумно!</small>', do: '✋<small>зробити</small>' }[mode]);
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  },
  hide() { $('#cls').hidden = true; $('#clsBtn').hidden = true; this.mode = null; this.holding = false; this.listeners = []; },
  progress(p) { const m = $('#clsMeter'); if (p == null) { m.hidden = true; return; } m.hidden = false; $('#clsFill').style.width = clamp(p, 0, 1) * 100 + '%'; },
  on(fn) { this.listeners.push(fn); },
  onClap(src) { if (!this.mode) return; this.taps++; this.listeners.slice().forEach(f => f(src)); },
  // «гучно зараз»: мікрофон чує голос чи шум, або вчитель тримає кнопку
  loud() { return this.holding || (Mic.on && !Mic.calib && Mic.isLoud()); },
  // гра в тишу: шумно, якщо мікрофон чує шум або вчитель тримає «шумно!»
  noisy() { return this.holding || (Mic.on && !Mic.calib && !Mic.isQuiet()); },
  // великий відлік 3-2-1 і гасло. Повертає Promise після гасла.
  count(text, n = 3) {
    return new Promise(res => {
      const big = $('#big'); let k = n; const alive = Scene.alive;
      const tick = () => {
        if (alive !== Scene.alive) return;
        big.hidden = false;
        if (k > 0) { big.textContent = k; big.className = 'bigtxt num'; Sfx.play('sfx_count', () => Sfx.tone(520 + (n - k) * 90, 0.15, 0.2, 'triangle')); k--; Timers.later(tick, 850); return; }
        big.textContent = text; big.className = 'bigtxt say'; Sfx.ding();
        Timers.later(() => { big.hidden = true; res(); }, 2200);
      };
      tick();
    });
  },
};

function toast(text) { const t = $('#toast'); t.textContent = text; t.hidden = false; clearTimeout(toast.id); toast.id = setTimeout(() => { t.hidden = true; }, 4000); }

// кнопка вчителя, пробіл, мікрофон
(() => {
  const b = $('#clsBtn');
  const down = e => {
    e.preventDefault(); Sfx.ctx(); b.classList.add('hit');
    if (Klas.mode === 'tap' || Klas.mode === 'do') { Klas.onClap('btn'); setTimeout(() => b.classList.remove('hit'), 140); }
    else { Klas.holding = true; if (Klas.mode === 'noise') Klas.onClap('btn'); }
  };
  const up = () => { Klas.holding = false; b.classList.remove('hit'); };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up);
  addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat && Klas.mode) down(e); });
  addEventListener('keyup', e => { if (e.code === 'Space') up(); });
  $('#micBtn').addEventListener('click', async () => {
    const mb = $('#micBtn');
    if (Mic.on) { Mic.stop(); mb.classList.remove('on'); toast('Мікрофон вимкнено. Урок іде кнопкою 👏 і пробілом.'); return; }
    const err = await Mic.start();
    if (err) toast(err); else { mb.classList.add('on'); toast('Мікрофон увімкнено. Секунду тиші: заміряю клас…'); }
  });
})();

// Метроном: n ударів у темпі bpm, onBeat(i) на кожен. labels — склади над полем («МІ», «СИ», «МО»).
function Beat(bpm, n, onBeat, labels) {
  let i = 0; const ms = 60000 / bpm; const alive = Scene.alive;
  return new Promise(res => {
    const step = () => {
      if (alive !== Scene.alive) return;
      const el = $('#beat');
      if (i >= n) { el.hidden = true; res(); return; }
      el.hidden = false; el.textContent = labels ? labels[i % labels.length] : (i % 2 ? 'два' : 'раз');
      el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
      Sfx.tone(i % 2 ? 660 : 880, 0.07, 0.12, 'square'); onBeat(i); i++; Timers.later(step, ms);
    };
    step();
  });
}

// Фізхвилинка: поза маскота, репліка й відлік. Кнопка «далі» — пропустити.
// Пози для кожної вправи: [кіт…], [сорока…]
const MOVES = {
  move_sivba: [['k05', 'k15', 'k04', 'k15'], ['s05', 's04', 's10', 's04']],      // рука в торбину — і широко сіємо
  move_zhnyva: [['k08', 'k04', 'k08', 'k06'], ['s07', 's04', 's08', 's03']],     // нахил — випрямились
  move_mis: [['k21', 'k04', 'k21', 'k06'], ['s14', 's04', 's14', 's11']],        // місимо — руки вгору
};
function Move(lineId, pose, secs = 15) {
  return new Promise(res => {
    const mv = MOVES[lineId] || [['k04', 'k03', 'k06', 'k03'], ['s04', 's03', 's11', 's03']];
    Mascot.set(pose); Mascot.startDance(mv[0], mv[1]); Voice.say(lineId); const big = $('#big'); let k = secs; let done = false; const alive = Scene.alive;
    Klas.show('🤸', 'Фізхвилинка! Усі встали й повторюють', 'do', '⏭<small>далі</small>');
    const fin = () => { if (done) return; done = true; big.hidden = true; Klas.hide(); Mascot.stopDance(); Voice.say('move_end'); res(); };
    Klas.on(fin);
    const tick = () => { if (done || alive !== Scene.alive) return; big.hidden = false; big.className = 'bigtxt num small'; big.textContent = k; Klas.progress(1 - k / secs); if (k <= 0) return fin(); k--; Timers.later(tick, 1000); };
    Timers.later(tick, 1500);
  });
}
