'use strict';
// «Шлях зернини»: вступ → сівба → жнива → обмолот → млин.
// На кожному етапі є дія для всього класу (банер угорі + кнопка 👏/пробіл, мікрофон — за бажанням)
// і, де доречно, дія для однієї-двох дітей біля дошки.

// ---------- вступ ----------
function SceneIntro() {
  return {
    id: 'intro', noProg: true,
    enter() {
      Mascot.sStay = true;
      Lines.play(['intro_1', 'intro_2', 'intro_3']).then(() => { Mascot.sStay = false; Scene.done({ delay: 0, label: 'Вирушаймо!' }); });
    },
    draw(t) {
      bg('bg_map');
      for (let i = 0; i < 26; i++) img('kolos_gold', 380 + i * 48, 940, 0, 230 + (i % 3) * 30, { rot: Math.sin(t * 1.4 + i * 0.6) * 0.06, ar: 0.6 });
    },
  };
}

// ---------- 1. сівба: сівач біля дошки, клас кличе сонце й робить дощ ----------
function SceneSivba() {
  const FIELD = { x0: 330, x1: 1500, y0: 560, y1: 860 };
  const BINS = 14;
  let bins = new Array(BINS).fill(0), seeds = [], step = 'sow', sun = 0, rain = 0, grow = 0, autoX = null;
  const seedAt = p => {
    const b = clamp(Math.floor((p.x - FIELD.x0) / (FIELD.x1 - FIELD.x0) * BINS), 0, BINS - 1); bins[b] = 1;
    for (let i = 0; i < 2; i++) {
      const tx = p.x + rnd(-60, 60), ty = clamp(p.y + rnd(30, 160), FIELD.y0 + 20, FIELD.y1 - 10);
      FX.add({ kind: 'grain', x: p.x + 30, y: p.y - 40, vx: (tx - p.x) * 1.4, vy: -120, g: 900, floor: ty, life: 1.4, r: 4, col: '#E3B04B' });
      if (seeds.length < 140) seeds.push({ x: tx, y: ty, s: rnd(0.85, 1.15), ph: rnd(0, TAU) });
    }
  };
  const sown = () => bins.filter(Boolean).length >= BINS - 2;
  async function sky() {
    step = 'sky'; Pointer.cursor = null; Hint.clear(); Klas.hide();
    await Voice.say('sivba_2');
    await Klas.count('Сонечко, світи!');
    sun = 0.01; Sfx.play('sfx_sun', () => Sfx.ding());
    await new Promise(r => Timers.later(r, 900));
    step = 'rain'; Voice.say('sivba_rain');
    Klas.show('🌧️', 'Дощ пальчиками по партах: тихо… сильніше… ще сильніше!', 'hold');
  }
  return {
    id: 'sivba', fact: 'sivba',
    enter() {
      Voice.say('sivba_1');
      Hint.set(HintPaths.swipe(420, 700, 1420, 720));
      Pointer.cursor = () => { if (step === 'sow') img('hand_sow', Pointer.x + 40, Pointer.y + 60, 190, 0, { anchor: 'center', label: 'рука' }); };
      Klas.show('🙋', 'Хтось до дошки: проведіть пальцем по ріллі!', 'do', '✋<small>посіяти</small>');
      Klas.on(() => { if (step === 'sow' && autoX == null) autoX = FIELD.x0; });
    },
    pointer(type, p) {
      if (step === 'sow' && Pointer.down && p.y > FIELD.y0 - 80 && p.x > FIELD.x0 - 40) {
        if (Math.random() < 0.25) Sfx.play('sfx_seed', () => Sfx.noise(0.06, 3500, 2500, 0.06), 0.5);
        seedAt(p); if (sown()) sky();
      }
    },
    update(dt) {
      if (step === 'sow' && autoX != null) { autoX += dt * 900; seedAt({ x: autoX, y: 650 + Math.sin(autoX / 90) * 60 }); if (autoX > FIELD.x1 || sown()) { autoX = null; for (let i = 0; i < BINS; i++) bins[i] = 1; sky(); } }
      if (sun > 0) sun = Math.min(1, sun + dt);
      if (step === 'rain') {
        // без мікрофона дощ іде сам і посилюється; гучний клас або кнопка — швидше
        const boost = Klas.loud() ? 1 : 0;
        rain = Math.min(1, rain + dt * (0.08 + boost * 0.12));
        grow = rain; Klas.progress(rain);
        const n = 0.3 + rain * 1.4 + boost; for (let i = 0; i < n; i++) if (Math.random() < 0.7) FX.add({ kind: 'drop', x: rnd(200, 1500), y: rnd(150, 300), vy: 800, g: 0, life: 0.7, col: 'rgba(90,140,200,.8)' });
        Sfx.rainLoop(0.12 + rain * 0.1 + boost * 0.08);
        if (rain > 0.45 && !this.s3) { this.s3 = 1; Sfx.play('sfx_grow'); Voice.say('sivba_3'); }
        if (rain >= 1) {
          step = 'grown'; Klas.hide(); Sfx.rainStop();
          Voice.say('sivba_4').then(() => Move('move_sivba', 'k04', 15)).then(() => Scene.done());
        }
      }
    },
    draw(t) {
      bg('bg_rillia', 1);
      if (grow > 0.45) bg('bg_nyva', clamp((grow - 0.45) / 0.3, 0, 1));
      if (sun > 0) { ctx.save(); ctx.globalAlpha = 0.25 * sun; ctx.fillStyle = '#FFE9A6'; ctx.beginPath(); ctx.arc(1370, 220, 260 + Math.sin(t * 3) * 20, 0, TAU); ctx.fill(); ctx.restore(); }
      img('sun', 1370, 220 + (1 - ease(sun)) * 220, 250, 0, { anchor: 'center', rot: t * 0.1, alpha: sun > 0 ? 1 : 0.15, label: 'сонце' });
      img('cloud', 560, 160, 340, 0, { anchor: 'center', alpha: step === 'rain' ? 1 : 0.55, label: 'хмара', ar: 1.5 });
      for (const s of [...seeds].sort((a, b) => a.y - b.y)) {
        const k = (s.y - FIELD.y0) / (FIELD.y1 - FIELD.y0), sc = lerp(0.6, 1.1, k) * s.s;
        const sway = Math.sin(t * 1.6 + s.ph) * 0.05;
        if (grow <= 0) { ctx.fillStyle = '#E3B04B'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 5 * sc, 3 * sc, 0, 0, TAU); ctx.fill(); }
        else if (grow < 0.3) img('parostok', s.x, s.y, 0, 70 * sc * (grow / 0.3), { rot: sway });
        else if (grow < 0.65) img('kolos_green', s.x, s.y, 0, 230 * sc * lerp(0.4, 1, (grow - 0.3) / 0.35), { rot: sway, ar: 0.6 });
        else { const a = (grow - 0.65) / 0.35; img('kolos_green', s.x, s.y, 0, 230 * sc, { rot: sway, alpha: 1 - a, ar: 0.6 }); img('kolos_gold', s.x, s.y, 0, 240 * sc, { rot: sway, alpha: a, ar: 0.6 }); }
      }
      if (step === 'sow') Klas.progress(bins.filter(Boolean).length / (BINS - 2));   // смужка «засіяно» — у банері класу
    },
  };
}

// ---------- 2. жнива: дві команди біля дошки, потім клас в'яже снопи оплесками ----------
function SceneZhnyva() {
  const stalks = [];
  for (let row = 0; row < 4; row++) for (let i = 0; i < 30; i++) {
    const y = 600 + row * 80, x = 360 + i * 38 + (row % 2) * 19 + rnd(-8, 8);
    stalks.push({ x, y, h: 230 + row * 28 + rnd(-15, 15), cut: 0, fall: 0, dir: rnd(-1, 1) > 0 ? 1 : -1, ph: rnd(0, TAU), boroda: (x > 1390 || x < 400) && row < 1, side: x < 930 ? 0 : 1 });
  }
  const piles = [{ x: 470, y: 820 }, { x: 700, y: 840 }, { x: 930, y: 820 }, { x: 1160, y: 840 }, { x: 1340, y: 815 }];
  let step = 'reap', tied = 0, kopa = 0, winner = -1, autoT = 0;
  const side = s => stalks.filter(x => x.side === s && !x.boroda);
  const pct = s => { const a = side(s); return a.filter(x => x.cut).length / a.length; };
  const cutNear = (p, r = 46) => { let n = 0; for (const s of stalks) if (!s.cut && !s.boroda && Math.abs(p.x - s.x) < r && p.y > s.y - s.h && p.y < s.y + 20) { s.cut = 1; n++; FX.burst(s.x, s.y - s.h * 0.7, 2, { kind: 'chaff', col: '#E3B04B', g: 400, smax: 120 }); } if (n) Sfx.swish(); };
  function tie() {
    const pl = piles.find(q => !q.done); if (!pl) return;
    pl.done = 1; pl.t = 0; tied++; Sfx.play('sfx_sheaf', () => Sfx.thud()); FX.burst(pl.x, pl.y - 80, 10, { kind: 'chaff', col: '#D8B25A', g: 500 }); FX.word(pl.x, pl.y - 230, String(tied));
    Klas.progress(tied / piles.length);
    if (tied === piles.length) {
      step = 'kopa'; Klas.hide(); Timers.later(() => Sfx.swish(), 600);
      Timers.later(() => Lines.play(['zhnyva_3', 'zhnyva_4']).then(() => Scene.done()), 1600);
    }
  }
  function finishReap() {
    if (step !== 'reap') return;
    for (const s of stalks) if (!s.boroda) s.cut = 1;
    step = 'tie'; Pointer.cursor = null; Hint.clear(); Klas.hide();
    Timers.later(() => {
      Voice.say('zhnyva_2');
      Klas.show('👏', 'Кожен дружній оплеск — один сніп!', 'tap'); Klas.progress(0);
      Klas.on(() => { if (step === 'tie') tie(); });
    }, winner >= 0 ? 2200 : 700);
  }
  return {
    id: 'zhnyva', fact: 'zhnyva',
    enter() {
      Voice.say('zhnyva_1');
      Hint.set(HintPaths.swipe(420, 650, 860, 700));
      Pointer.cursor = () => { if (step === 'reap') img('serp', Pointer.x, Pointer.y, 170, 0, { anchor: 'center', rot: Pointer.down ? -0.5 : 0, label: 'серп' }); };
      Klas.show('💪', 'Двоє біля дошки: ліва команда проти правої! Клас — уболіває', 'do', '✋<small>дожати</small>');
      Klas.on(() => { if (step === 'reap' && !autoT) autoT = 1; });
    },
    pointer(type, p) { if (step === 'reap' && Pointer.down) cutNear(p); },
    update(dt) {
      if (step === 'reap') {
        if (autoT) { autoT += dt; const x = 360 + ((autoT * 700) % 1150); cutNear({ x, y: 600 }, 60); cutNear({ x, y: 760 }, 60); if (autoT > 3) finishReap(); }
        if (winner < 0) for (const s of [0, 1]) if (pct(s) >= 0.9) { winner = s; Voice.say(s ? 'zhnyva_win_r' : 'zhnyva_win_l'); FX.word(s ? 1150 : 650, 420, 'Перемога!', '#2E7D4F'); Sfx.ding(); }
        if (pct(0) >= 0.9 && pct(1) >= 0.9) finishReap();
      }
      for (const s of stalks) if (s.cut && s.fall < 1) s.fall = Math.min(1, s.fall + dt * 3);
      for (const q of piles) if (q.done) q.t += dt;
      if (step === 'kopa') kopa = Math.min(1, kopa + dt * 0.8);
    },
    draw(t) {
      bg('bg_nyva');
      for (const s of stalks) {
        if (step !== 'reap' && s.cut) continue;
        const sway = Math.sin(t * 1.5 + s.ph) * 0.05;
        if (s.cut) img('kolos_gold', s.x, s.y, 0, s.h, { rot: s.dir * ease(s.fall) * 1.45, alpha: 1 - s.fall * 0.2, ar: 0.6 });
        else img('kolos_gold', s.x, s.y, 0, s.h, { rot: sway, ar: 0.6 });
      }
      if (step === 'reap') {
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.setLineDash([16, 14]); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(930, 340); ctx.lineTo(930, 900); ctx.stroke(); ctx.restore();
        meter(250, 330, pct(0) / 0.9, 'Ліва команда'); meter(1350, 330, pct(1) / 0.9, 'Права команда');
      } else {
        for (const q of piles) {
          const k = ease(kopa), x = lerp(q.x, 900, k), y = lerp(q.y, 860, k);
          if (!q.done) { img('kolos_gold', q.x, q.y, 0, 150, { rot: Math.PI / 2, alpha: 0.95, ar: 0.6 }); img('kolos_gold', q.x + 20, q.y - 10, 0, 150, { rot: Math.PI / 2 - 0.15, ar: 0.6 }); }
          else if (k < 1) img('snip', x, y, 0, 210 * Math.min(1, q.t * 4), { alpha: 1 - k });
        }
        if (kopa > 0) img('kopa', 900, 870, 0, 330 * ease(kopa), { label: 'копа' });
      }
    },
  };
}

// ---------- 3. обмолот: ціп б'є в такт, клас плескає разом; потім клас дмухає ----------
function SceneMlot() {
  let step = 'intro', hits = 0, swing = 0, chaff = 1, claps = 0;
  const NEED = 12;
  const hit = () => { swing = 1; hits++; Sfx.play('sfx_flail', () => Sfx.thud()); FX.burst(900 + rnd(-120, 120), 760, 8, { kind: 'grain', col: '#E3B04B', floor: 820 + rnd(0, 40), g: 900 }); };
  return {
    id: 'mlot', fact: 'mlot',
    async enter() {
      await Voice.say('mlot_1');
      step = 'beat';
      Klas.show('👏', 'Плескайте разом із ціпом!', 'tap');
      Klas.on(() => { claps++; FX.word(rnd(500, 1300), rnd(380, 520), '👏', '#C8341F'); });
      await Beat(100, NEED, i => { hit(); Klas.progress((i + 1) / NEED); }, ['РАЗ', 'ДВА']);
      step = 'wait'; Klas.hide();
      await Voice.say('mlot_2');
      step = 'blow';
      Klas.show('🌬️', 'Усі дмухаємо: ф-ф-ф!', 'hold'); Klas.progress(0);
      Hint.set(HintPaths.swipe(500, 760, 1300, 700));
    },
    pointer(type, p) { if (step === 'blow' && Pointer.down && type === 'move') this.blow(0.012); },
    blow(k) {
      chaff = Math.max(0, chaff - k); if (Math.random() < 0.15) Sfx.wind();
      FX.add({ kind: 'chaff', x: 900 + rnd(-140, 140), y: 760 + rnd(-30, 20), vx: rnd(300, 700), vy: rnd(-160, -40), g: 60, life: 1.3, r: rnd(4, 8), col: '#EAD9A6', vr: rnd(-6, 6) });
      Klas.progress(1 - chaff);
      if (chaff <= 0 && step === 'blow') { step = 'done'; Hint.clear(); Klas.hide(); Mascot.sx = 1180; Mascot.sy = 600; Lines.play(['mlot_3']).then(() => Scene.done()); }
    },
    update(dt) {
      swing = Math.max(0, swing - dt * 3.5);
      // віємо: без мікрофона вітер дме сам (5–6 с), гучне «ф-ф-ф» чи кнопка — утричі швидше
      if (step === 'blow') this.blow(dt * (0.17 + (Klas.loud() ? 0.4 : 0)));
    },
    draw(t) {
      bg('bg_tik');
      const left = 1 - hits / NEED;
      if (step === 'intro' || step === 'beat') for (let i = 0; i < 3; i++) img('snip', 720 + i * 170, 800, 0, 330 * (0.55 + left * 0.45), { rot: Math.PI / 2 - 0.1 + i * 0.05 });
      const heap = clamp(hits / NEED, 0, 1);
      img('zerno', 900, 870, 260 * (0.3 + heap * 0.7), 0, { label: 'зерно' });
      if (hits > 0) img('polova', 900, 860, 380 * (0.35 + heap * 0.65), 0, { alpha: chaff, label: 'полова', ar: 1.5 });
      if (step === 'intro' || step === 'beat') {
        const a = lerp(-1.1, 0.25, ease(swing > 0.5 ? (1 - swing) * 2 : swing * 2));
        img('tsip', 900, 560, 640, 0, { anchor: 'center', rot: a, label: 'ціп', ar: 1.5 });
      }
    },
  };
}

// ---------- 4. млин: клас — вітер (руки-крила + «ш-ш-ш»), дитина біля дошки може крутити ----------
function SceneMlyn() {
  const HUB = { x: 916, y: 329 };   // вісь на картинці вітряка C/01 (вітряк — низ у 1000,720, висота 560)
  let ang = 0, vel = 0, last = null, fill = 0, done = false, go = false;
  return {
    id: 'mlyn', fact: 'mlyn',
    async enter() {
      await Voice.say('mlyn_1'); go = true;
      Klas.show('🌀', 'Руки — крила! Крутимо руками й шумимо: ш-ш-ш!', 'hold'); Klas.progress(0);
      Hint.set(HintPaths.circle(HUB.x, HUB.y, 190));
    },
    pointer(type, p) {
      if (done) return;
      if (type === 'down') last = Math.atan2(p.y - HUB.y, p.x - HUB.x);
      else if (type === 'move' && Pointer.down && last != null) {
        const a = Math.atan2(p.y - HUB.y, p.x - HUB.x); let d = a - last; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
        last = a; vel += d * 6;
      } else if (type === 'up') last = null;
    },
    update(dt) {
      // вітер від класу: без мікрофона млин крутиться сам (~12 с), гучний клас / кнопка — швидше
      if (go && !done) vel += dt * (2.2 + (Klas.loud() ? 9 : 0)) * Math.sign(vel || 1);
      vel *= Math.pow(0.6, dt); ang += vel * dt;
      if (go && !done) {
        fill = Math.min(1, fill + Math.abs(vel) * dt * 0.025); Klas.progress(fill);
        if (Math.abs(vel) > 2 && Math.random() < 0.02) Sfx.play('sfx_mill', () => Sfx.wind(), 0.6);
        if (fill > 0.3 && !this.fl) { this.fl = 1; Sfx.play('sfx_flour', null, 0.6); }
        if (fill >= 1) { done = true; Hint.clear(); Klas.hide(); Voice.say('mlyn_2').then(() => Scene.done({ label: 'До хати!' })); }
      }
      if (Math.abs(vel) > 1.5 && Math.random() < 0.3) FX.add({ kind: 'puff', x: 1230 + rnd(-40, 40), y: 880 - (120 + fill * 110) + 15, vx: rnd(-25, 25), vy: rnd(-40, -15), g: 0, life: 0.9, r: 5, col: '#FFF8EC' });   // борошняний пил над горловиною мішка
    },
    draw(t) {
      bg('bg_hill');
      img('vitriak', 1000, 720, 0, 560, { label: 'вітряк', ar: 0.66 });
      img('kryla', HUB.x, HUB.y, 600, 0, { anchor: 'center', rot: ang, label: 'крила' });
      img(fill > 0.5 ? 'mishok1' : 'mishok0', 1230, 880, 0, 120 + fill * 110, { label: 'мішок' });
    },
  };
}

const PATH_SCENES = [SceneIntro, SceneSivba, SceneZhnyva, SceneMlot, SceneMlyn];
