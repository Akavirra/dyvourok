'use strict';
// «Пекарня»: діжа (клас голосує) → місимо (хор «мі-си-мо») → підходить (гра в тишу) → форма (руки) →
// піч (дрова біля дошки, клас дмухає) → стукаємо по партах → рушник → «Хліб — усьому голова!» хором.

// Діжа: малюємо діжу, а потім тісто лише над переднім краєм отвору — тісто «всередині».
// x,y — центр низу діжі, w — ширина. Отвір у картинці: центр (500,150), півосі 470×140 із 1000×928.
function inDizha(x, y, w, drawDough) {
  img('dizha', x, y, w, 0, { label: 'діжа' });
  const s = w / 1000, top = y - 928 * s, cx = x, cy = top + 150 * s, rx = 470 * s, ry = 140 * s;
  ctx.save(); ctx.beginPath(); ctx.moveTo(cx - rx - 400, cy); ctx.lineTo(cx - rx - 400, -2000); ctx.lineTo(cx + rx + 400, -2000); ctx.lineTo(cx + rx + 400, cy);
  ctx.lineTo(cx + rx, cy); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI); ctx.closePath(); ctx.clip();
  drawDough(cx, cy + ry * 0.55, s); ctx.restore();
}

// Перетягування предметів дитиною біля дошки.
function Dragger(items, onDrop) {
  let held = null, off = { x: 0, y: 0 };
  return {
    items,
    pointer(type, p) {
      if (type === 'down') {
        held = [...items].reverse().find(it => !it.gone && Math.abs(p.x - it.x) < it.w / 2 + 20 && p.y > it.y - it.h - 20 && p.y < it.y + 20) || null;
        if (held) { off = { x: p.x - held.x, y: p.y - held.y }; held.lift = 1; Sfx.pop(); Hint.idle = 0; }
      } else if (type === 'move' && held) { held.x = p.x - off.x; held.y = p.y - off.y; }
      else if (type === 'up' && held) { const h = held; held = null; h.lift = 0; onDrop(h, p); }
    },
    back(it) { it.ret = 1; },
    update(dt) { for (const it of items) if (it.ret) { it.x = lerp(it.x, it.x0, Math.min(1, dt * 10)); it.y = lerp(it.y, it.y0, Math.min(1, dt * 10)); if (Math.abs(it.x - it.x0) < 2 && Math.abs(it.y - it.y0) < 2) it.ret = 0; } },
    draw() { for (const it of items) if (!it.gone) img(it.key, it.x, it.y, it.w, 0, { sx: it.lift ? 1.08 : 1, sy: it.lift ? 1.08 : 1, label: it.label }); },
  };
}
// Переміщення предмета «самим» (кнопка ✋ замість дитини біля дошки).
function flyTo(it, x, y, ms = 700) { return new Promise(r => { const x0 = it.x, y0 = it.y; let k0 = 0; const step = () => { k0 = Math.min(1, k0 + 16 / ms); const k = ease(k0); it.x = lerp(x0, x, k); it.y = lerp(y0, y, k) - Math.sin(k * Math.PI) * 120; if (k0 < 1) setTimeout(step, 16); else r(); }; step(); }); }

// ---------- 5. діжа: по одній речі, клас каже «так» чи «ні», учитель тисне ----------
function SceneDizha() {
  const DZ = { x: 1130, y: 760 };
  const defs = [['i_boroshno', 'борошно', 1], ['gudzyk', 'ґудзик', 0, 'wrong_gudzyk'], ['i_voda', 'вода', 1], ['tsukerka', 'цукерка', 0, 'wrong_tsukerka'],
    ['i_sil', 'сіль', 1], ['kliuch', 'ключик', 0, 'wrong_kliuch'], ['i_zakvaska', 'закваска', 1]];
  const items = defs.map(([key, label, ok, line]) => ({ key, label, ok, line, x: 528, y: 360, w: 290, h: 290, gone: 0, state: 'wait' }));
  let i = -1, good = 0, fillA = 0, busy = false;
  const cur = () => items[i];
  function next() {
    i++; busy = false;
    if (i >= items.length) { $('#votes').hidden = true; Klas.hide(); Timers.later(() => Scene.done(), 800); return; }
    const it = cur(); it.state = 'show'; it.t = 0; Sfx.pop();
    $('#votes').hidden = false; $('#clsText').textContent = `Кладемо в діжу: ${it.label}?`;
  }
  async function vote(yes) {
    const it = cur(); if (!it || busy) return; busy = true; $('#votes').hidden = true;
    if (yes === !!it.ok) {
      Sfx.ok();
      if (it.ok) {
        good++; Klas.progress(good / 4);
        await flyTo(it, DZ.x, DZ.y - 140); it.gone = 1; it.key === 'i_voda' ? Sfx.play('sfx_water', () => Sfx.thud()) : Sfx.thud();
        FX.burst(DZ.x, DZ.y - 220, 14, { kind: it.key === 'i_voda' ? 'drop' : 'puff', col: it.key === 'i_voda' ? 'rgba(90,140,200,.8)' : '#FFFFFF', g: 300 });
        await Voice.say(it.key === 'i_zakvaska' ? 'pek_zakv' : ['pek_yes_1', 'pek_yes_2', 'pek_yes_3'][good % 3]);
      } else {
        Mascot.sx = 1300; Mascot.sy = 430; Mascot.set(null, 's20'); Mascot.sStay = true;
        await flyTo(it, 1500, 300); it.gone = 1;
        await Voice.say(it.line); Mascot.sStay = false;
      }
      next();
    } else {
      Sfx.no(); await Voice.say('pek_oops'); busy = false; $('#votes').hidden = false;
    }
  }
  return {
    id: 'dizha', fact: 'dizha',
    async enter() {
      $('#voteYes').onclick = () => vote(true); $('#voteNo').onclick = () => vote(false);
      await Voice.say('pek_1');
      Klas.show('🗳️', 'Кладемо в діжу?', 'do', '✋<small>далі</small>'); Klas.progress(0);
      $('#clsBtn').hidden = true;
      next();
    },
    update(dt) { fillA = lerp(fillA, good / 4, Math.min(1, dt * 3)); const it = cur(); if (it) it.t = (it.t || 0) + dt; },
    draw(t) {
      bg('bg_hata');
      inDizha(DZ.x, DZ.y + 140, 470, (x, y) => { if (fillA > 0.03) img('testo1', x, y + 160 + (1 - fillA) * 200, 430, 0); });
      const it = cur();
      if (it && !it.gone) { const s = it.state === 'show' ? 0.6 + 0.4 * ease(Math.min(1, it.t * 3)) : 1; img(it.key, it.x, it.y, it.w * s * (busy ? 0.6 : 1), 0, { anchor: 'center', rot: busy ? 0 : Math.sin(t * 2) * 0.04, label: it.label }); }
      // уже вирішені — маленькі на полиці
      items.slice(0, Math.max(0, i)).forEach((x, k) => { if (!x.ok) return; img(x.key, 300 + k * 30, 260, 80, 0, { anchor: 'center', alpha: 0.0 }); });
    },
  };
}

// ---------- 6. місимо: хор «МІ-СИ-МО» під метроном ----------
function SceneMisyty() {
  const C = { x: 800, y: 560 };
  let k = 0, sq = 0, said = false;
  return {
    id: 'misyty', fact: 'dizha',
    async enter() {
      await Voice.say('mis_1');
      Klas.show('🙌', 'Місимо руками в повітрі й кажемо хором!', 'tap'); Klas.progress(0);
      Klas.on(() => { sq = 1; });
      await Beat(110, 15, i => { sq = 1; k = (i + 1) / 15; Klas.progress(k); Sfx.play('sfx_knead', () => Sfx.noise(0.08, 600, 300, 0.12, 'lowpass'), 0.6); FX.add({ kind: 'puff', x: C.x + rnd(-160, 160), y: C.y + rnd(-60, 40), vx: rnd(-60, 60), vy: rnd(-80, -20), g: 0, life: 0.8, r: 10, col: '#FFFFFF' }); if (i === 8 && !said) { said = true; Mascot.set(null, 's21'); Mascot.sKeep = true; } }, ['МІ', 'СИ', 'МО']);
      Klas.hide(); Mascot.set('k21'); await Voice.say('mis_2'); Scene.done();
    },
    update(dt) { sq = Math.max(0, sq - dt * 3); },
    draw(t) {
      bg('bg_hata');
      const w = Math.sin(t * 16) * sq * 0.08;
      inDizha(C.x, 900, 640, (x, y) => {
        img('testo1', x, y + 230, 580, 0, { sx: 1 + w, sy: 1 - w });
        img('testo2', x, y + 230, 580, 0, { alpha: k, sx: 1 + w, sy: 1 - w });
      });
    },
  };
}

// ---------- 7. підходить: гра в тишу ----------
function ScenePidhid() {
  const C = { x: 800, y: 600 };
  let covered = 0, rise = 0, bubbles = [], playing = false, lastNoise = 0;
  return {
    id: 'pidhid', fact: 'dizha',
    async enter() {
      await Voice.say('pidh_1');
      covered = 0.01; Sfx.play('sfx_cloth', () => Sfx.swish());
      playing = true;
      Klas.show('🤫', 'Тихо-тихо! Поки тихо — тісто росте', 'noise'); Klas.progress(0);
      Klas.on(() => this.noise());
    },
    noise() {
      const now = performance.now(); if (now - lastNoise < 2500 || !playing) return; lastNoise = now;
      rise = Math.max(0, rise - 0.15); Sfx.no(); Voice.say('pidh_noise');
    },
    update(dt) {
      if (covered > 0) covered = Math.min(1, covered + dt * 2);
      if (!playing) return;
      if (Klas.noisy()) { if (Mic.on && !Klas.holding) this.noise(); }
      else rise = Math.min(1, rise + dt / 10);
      Klas.progress(rise);
      if (Math.random() < dt * 2.5 * (0.3 + rise)) bubbles.push({ x: C.x + rnd(-150, 150), y: 330 - rise * 120 + rnd(-30, 40), r: 6, a: 0 });
      for (const b of bubbles) { b.a += dt; b.r = Math.min(26, b.r + dt * 16); }
      bubbles = bubbles.filter(b => b.a < 3);
      if (rise >= 1) { playing = false; Klas.hide(); Voice.say('pidh_2').then(() => Scene.done()); }
    },
    draw(t) {
      bg('bg_hata');
      const s = 1 + ease(rise) * 0.22;
      let topY = 0;
      inDizha(C.x, 900, 640, (x, y) => {
        img('testo2', x, y + 220, 540 * s, 0); img('testo3', x, y + 220, 540 * s, 0, { alpha: clamp((rise - 0.5) / 0.3, 0, 1) });
        topY = y + 220 - 540 * s * 0.886;
        for (const b of bubbles) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); }
      });
      // рушник лягає на тісто згори й піднімається разом із ним
      if (covered > 0) img('rushnyk', C.x, topY + 110 - (1 - ease(covered)) * 300, 600, 0, { anchor: 'center', alpha: (0.85 - rise * 0.45) * ease(covered), rot: Math.sin(t) * 0.01 });
    },
  };
}

// ---------- 8. форма: голосуємо руками, учитель торкається переможця ----------
function SceneForma() {
  const opts = [{ key: 'pal_raw', fin: 'pal', label: 'Паляниця', x: 420 }, { key: 'kalach', fin: 'kalach', label: 'Калач', x: 800, raw: true }, { key: 'korovai', fin: 'korovai', label: 'Коровай', x: 1180, raw: true }];
  let pick = null, decor = [], step = 'pick', hl = -1;
  // коровай 460 завширшки з центром (800,600); прикраси вирізані з korovai.webp (1000×969): [ключ, x0, y0, x1, y1]
  const KS = 0.46, KX = 800 - 230, KY = 600 - 969 * KS / 2;
  const SPOTS = [['d5', 430, 335, 580, 510], ['d3', 125, 190, 285, 340], ['d4', 725, 195, 885, 350], ['d2', 300, 90, 725, 365], ['d0', 190, 0, 505, 190], ['d1', 500, 0, 805, 190]]
    .map(([k, x0, y0, x1, y1]) => ({ key: 'korovai_' + k, x: KX + (x0 + x1) / 2 * KS, y: KY + (y0 + y1) / 2 * KS, w: (x1 - x0) * KS, r: Math.min(x1 - x0, y1 - y0) * KS * 0.45 }));
  const born = [];
  const choose = o => {
    pick = o; State.loaf = o.fin; Sfx.ok(); Hint.clear(); Klas.hide();
    if (o.fin === 'korovai') {
      step = 'decor'; Voice.say('korovai_1');
      Klas.show('🕊️', 'Кожен оплеск — пташка чи шишечка на коровай!', 'tap'); Klas.progress(0);
      Klas.on(() => addDecor());
    } else { step = 'done'; Scene.done(); }
  };
  const addDecor = (j = SPOTS.findIndex((_, i) => !decor.includes(i))) => { if (j < 0 || step !== 'decor' || decor.includes(j)) return; decor.push(j); born[j] = (performance.now() / 1000); Sfx.pop(); FX.burst(SPOTS[j].x, SPOTS[j].y, 10, { kind: 'dot', col: '#FFE9A8', g: 200, up: 60 }); Klas.progress(decor.length / SPOTS.length); if (decor.length === SPOTS.length) { step = 'done'; doneT = (performance.now() / 1000); Klas.hide(); Scene.done(); } };
  let doneT = 0;
  return {
    id: 'forma', fact: 'dizha',
    async enter() {
      SPOTS.forEach(d => loadImg(d.key)); loadImg('korovai_plain');
      await Voice.say('forma_1');
      Klas.show('✋', 'Хто за паляницю? За калач? За коровай? Торкніться переможця', 'do', '✋<small>навмання</small>');
      Klas.on(() => { if (step === 'pick') choose(opts[Math.floor(Math.random() * 3)]); });
      // підсвічуємо варіанти по черзі, щоб клас голосував
      let k = 0; const cyc = () => { if (step !== 'pick') return; hl = k % 3; k++; Timers.later(cyc, 1400); }; cyc();
    },
    pointer(type, p) {
      if (type !== 'down') return;
      if (step === 'pick') { const o = opts.find(o => Math.abs(p.x - o.x) < 170 && p.y > 330 && p.y < 760); if (o) choose(o); }
      else if (step === 'decor') { const s = SPOTS.findIndex((d, i) => !decor.includes(i) && dist(p, d) < Math.max(60, d.r)); if (s >= 0) addDecor(s); }
    },
    draw(t) {
      bg('bg_hata');
      if (step === 'pick') {
        opts.forEach((o, i) => {
          ctx.fillStyle = 'rgba(255,250,240,.9)'; ctx.beginPath(); ctx.roundRect(o.x - 165, 330, 330, 420, 28); ctx.fill();
          if (i === hl) { ctx.strokeStyle = '#E3B04B'; ctx.lineWidth = 10; ctx.stroke(); }
          img(o.key, o.x, 580, 280 * (i === hl ? 1.06 : 1), 0, { anchor: 'center', filter: o.raw ? 'saturate(.35) brightness(1.35)' : 'none', label: o.label });
          ctx.fillStyle = '#2A1A10'; ctx.font = '900 40px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(o.label, o.x, 720);
        });
      } else {
        const RAW = pick.raw ? 'saturate(.35) brightness(1.35)' : 'none';
        if (pick.fin !== 'korovai') img(pick.key, 800, 600, 460, 0, { anchor: 'center', filter: RAW });
        else {
          // гладкий коровай → прикраси з'являються по одній → наприкінці повна картинка
          const full = step === 'done' ? clamp(((performance.now() / 1000) - doneT) / 0.8, 0, 1) : 0;
          if (full < 1) {
            img('korovai_plain', 800, 600, 460, 0, { anchor: 'center', filter: RAW });
            SPOTS.forEach((d, i) => {
              if (decor.includes(i)) { const k = clamp(((performance.now() / 1000) - born[i]) / 0.35, 0, 1), sc = 1.5 - 0.5 * ease(k); img(d.key, d.x, d.y, d.w * sc, 0, { anchor: 'center', alpha: k, filter: RAW }); }
              else if (step === 'decor') { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.setLineDash([10, 9]); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(d.x, d.y, Math.min(46, d.r) + Math.sin(t * 5) * 4, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
            });
          }
          if (full > 0) img('korovai', 800, 600, 460, 0, { anchor: 'center', alpha: full, filter: RAW });
        }
      }
    },
  };
}

// ---------- 9. піч: дрова (дошка або ✋), клас дмухає, жар, лопата ----------
function ScenePich() {
  const MOUTH = { x: 795, y: 595 };   // чело печі F/01 (піч висотою 780, низ 900)
  const POD = { x: 796, y: 728 };      // під (дно) печі під челом
  const logs = [0, 1, 2].map(i => ({ key: 'drova', label: 'дрова', x0: 250 + i * 40, y0: 820 - i * 30, x: 250 + i * 40, y: 820 - i * 30, w: 220, h: 140 }));
  let step = 'logs', fire = 0, fan = 0, embersX = 0, peelGo = 0, held = null;
  const peel = { x: 1150, y: 780 };
  const addLog = it => { it.gone = 1; fire++; Sfx.play('sfx_fire', () => Sfx.crackle(), 0.7); if (fire === 3) toFan(); };
  const D = Dragger(logs, (it, p) => { if (step === 'logs' && dist(p, MOUTH) < 240) addLog(it); else D.back(it); });
  async function toFan() {
    step = 'fan'; Hint.clear(); Klas.hide(); await Voice.say('pich_fan');
    Klas.show('🔥', 'Дмухаємо всі разом: ф-ф-ф!', 'hold'); Klas.progress(0);
  }
  async function toRake() {
    step = 'rake'; Klas.hide(); await Voice.say('pich_2');
    Klas.show('🙋', 'Хтось до дошки: вигорніть жар коцюбою вбік', 'do');
    Klas.on(() => { if (step === 'rake') { embersX = 1; toPeel(); } });
    Hint.set(HintPaths.swipe(MOUTH.x - 40, MOUTH.y + 60, MOUTH.x + 380, MOUTH.y + 60));
    Pointer.cursor = () => { if (step === 'rake') img('kotsiuba', Pointer.x, Pointer.y + 300, 0, 420, { rot: -0.5, ar: 0.3 }); };
  }
  async function toPeel() {
    step = 'peel0'; Pointer.cursor = null; Hint.clear(); Klas.hide(); Sfx.play('sfx_poker', () => Sfx.swish());
    await Voice.say('pich_3'); step = 'peel';
    Klas.show('🙋', 'Хтось до дошки: штовхніть лопату в піч', 'do'); Klas.on(() => { if (step === 'peel') bake(); });
    Hint.set(HintPaths.swipe(peel.x, peel.y - 30, MOUTH.x + 60, MOUTH.y + 60));
  }
  function bake() { if (step !== 'peel') return; peelGo = 1; step = 'bake'; Hint.clear(); Klas.hide(); Sfx.play('sfx_peel', () => Sfx.thud()); Lines.play(['pich_4', 'pich_5']).then(() => Scene.done({ label: 'Чекаємо…' })); }
  return {
    id: 'pich', fact: 'pich',
    async enter() {
      await Voice.say('pich_1');
      Klas.show('🙋', 'Хтось до дошки: покладіть дрова в піч', 'do'); Klas.on(() => { const it = logs.find(l => !l.gone); if (it && step === 'logs') flyTo(it, MOUTH.x, MOUTH.y + 60, 500).then(() => addLog(it)); });
      Hint.set(HintPaths.drag(250, 780, MOUTH.x, MOUTH.y));
    },
    pointer(type, p) {
      if (step === 'logs') return D.pointer(type, p);
      if (step === 'rake' && Pointer.down && type === 'move' && Math.abs(p.y - MOUTH.y - 60) < 160) {
        embersX = clamp(embersX + (p.x - (this._lx ?? p.x)) * 0.004, -1, 1); this._lx = p.x;
        if (Math.abs(embersX) >= 0.9) toPeel();
      }
      if (type === 'up') this._lx = null;
      if (step === 'peel') {
        if (type === 'down' && dist(p, peel) < 260) held = { dx: p.x - peel.x };
        else if (type === 'move' && held) peelGo = clamp(1 - (p.x - held.dx - MOUTH.x) / (1200 - MOUTH.x), 0, 1);
        else if (type === 'up') { held = null; if (peelGo > 0.8) bake(); }
      }
    },
    update(dt) {
      D.update(dt);
      if (step === 'fan') {
        fan = Math.min(1, fan + dt * (0.15 + (Klas.loud() ? 0.35 : 0))); Klas.progress(fan);
        if (Math.random() < dt * 0.5) Sfx.play('sfx_whoosh', () => Sfx.crackle(), 0.7);
        if (Klas.loud()) FX.add({ kind: 'dot', x: MOUTH.x + rnd(-80, 80), y: MOUTH.y + 120, vx: rnd(-40, 40), vy: rnd(-300, -150), g: 0, life: 0.8, r: 4, col: '#FFB040' });
        if (fan >= 1) { fan = 2; toRake(); }
      }
    },
    draw(t) {
      bg('bg_hata');
      img('pich_close', 800, 900, 0, 780, { label: 'піч' });
      const fScale = step === 'logs' ? fire / 3 * 0.5 : step === 'fan' ? 0.5 + Math.min(1, fan) * 0.6 : 0;
      if (fScale > 0) img('fire', MOUTH.x, MOUTH.y + 130, 240 * fScale, 0, { sy: 1 + Math.sin(t * 12) * 0.05 });
      if (['rake', 'peel0', 'peel', 'bake'].includes(step)) img('embers', MOUTH.x + embersX * 110, MOUTH.y + 135, 220, 0, { alpha: 0.95 });
      if (['peel0', 'peel', 'bake'].includes(step)) {
        // x,y — низ хлібини; кругла голова лопати (центр на 0.816 довжини від кінця держака) — під хлібом
        const k = ease(peelGo), x = lerp(peel.x, POD.x, k), y = lerp(peel.y, POD.y, k), s = lerp(1, 0.72, k);
        if (peelGo < 1) img('lopata', x + 490 * s, y - 25 * s, 0, 600 * s, { rot: -Math.PI / 2, ar: 0.385 });
        img('lystok', x, y - 12 * s, 270 * s, 0, { anchor: 'center', sy: 0.38, alpha: 0.95 });   // капустяний лист плазом під хлібом
        img(State.loaf === 'pal' ? 'pal_raw' : State.loaf, x, y, 240 * s, 0, { filter: State.loaf === 'pal' ? 'none' : 'saturate(.35) brightness(1.35)' });
      }
      D.draw();
    },
  };
}

// ---------- 10. стукаємо: клас стукає по партах (👏 / мікрофон) ----------
function SceneStuk() {
  const B = { x: 800, y: 560 };
  let bake = 0, knocks = 0, out = 0, step = 'wait', tries = 0;
  const knock = () => {
    if (step !== 'knock') return;
    knocks++; FX.word(B.x + rnd(-160, 160), B.y - 120 + rnd(-40, 40), 'тук', '#7A4E2D');
    if (knocks < 3) { Sfx.knockDull(); return; }
    knocks = 0; tries++;
    if (tries === 1) { Sfx.knockDull(); step = 'wait'; Klas.hide(); Voice.say('stuk_no'); Timers.later(() => { step = 'knock'; Klas.show('✊', 'Ще раз: стукаємо по партах — тук-тук-тук!', 'tap'); Klas.on(knock); }, 4000); }
    else { bake = 1; Sfx.knockRing(); step = 'out'; Klas.hide(); FX.word(B.x, B.y - 220, 'Дзвенить!', '#2E7D4F'); Voice.say('stuk_yes').then(() => Scene.done()); }
  };
  return {
    id: 'stuk', fact: 'pich',
    enter() {
      Mascot.set('k23');
      Timers.later(() => { Mascot.set('k22'); Voice.say('stuk_1'); step = 'knock'; Klas.show('✊', 'Стукаємо по партах: тук-тук-тук!', 'tap'); Klas.on(knock); }, 1200);
    },
    pointer(type, p) { if (type === 'down' && dist(p, { x: 800, y: 650 }) < 260) knock(); },
    update(dt) { bake = Math.min(tries ? 1 : 0.6, bake + dt / 9); if (step === 'out') out = Math.min(1, out + dt * 0.8); },
    draw(t) {
      bg('bg_hata');
      img('pich_close', 800, 900, 0, 780, { label: 'піч' });
      img('embers', 690, 730, 110, 0, { alpha: 0.85 });
      // у печі хліб стоїть на поду; коли готовий — «виїжджає» до нас і більшає
      const key = State.loaf, o = ease(out), w = lerp(175, 400, o), x = lerp(818, 800, o), y = lerp(728, 800, o);
      const ar = key === 'korovai' ? 0.969 : key === 'kalach' ? 0.853 : 0.868;
      img(key === 'pal' ? 'pal_raw' : key, x, y, w, 0, { filter: key === 'pal' ? 'none' : 'saturate(.35) brightness(1.35)' });
      img(key, x, y, w, 0, { alpha: ease(bake) });
      if (bake > 0.4) steamOver(x, y - w * ar, w, t, 0.6 * bake);
    },
  };
}

// ---------- 11. рушник і фінал: хор «Хліб — усьому голова!» ----------
function SceneFinal() {
  const C = { x: 900, y: 560 };
  let covered = 0;
  const celebrate = () => { for (let i = 0; i < 70; i++) FX.add({ kind: 'grain', x: rnd(200, 1400), y: -20, vx: rnd(-60, 60), vy: rnd(100, 300), g: 300, life: 3.5, r: 6, col: i % 3 ? '#E3B04B' : '#C8341F', vr: rnd(-6, 6) }); Sfx.ding(); };
  return {
    id: 'final', fact: 'final',
    async enter() {
      await Voice.say('rush_1');
      covered = 0.01; Sfx.play('sfx_cloth', () => Sfx.swish()); Mascot.set('k19'); Timers.later(() => Sfx.play('sfx_purr', null, 0.6), 900);
      Mascot.sStay = true; await Lines.play(['final_1', 'final_2', 'final_3']);
      await Klas.count('Хліб — усьому голова!');
      celebrate(); Mascot.set('k04'); await Voice.say('final_4'); Mascot.sStay = false;
      Scene.done({ label: 'Готово!' });
    },
    update(dt) { if (covered > 0) covered = Math.min(1, covered + dt * 1.5); },
    draw(t) {
      bg('bg_final');
      const key = State.loaf, ar = key === 'korovai' ? 0.969 : key === 'kalach' ? 0.853 : 0.868, w = 400, top = C.y + 120 - w * ar;
      img(key, C.x, C.y + 120, w, 0, { label: 'хліб' });
      if (covered > 0) img('rushnyk', C.x, C.y + 20 - (1 - ease(covered)) * 300, 480, 0, { anchor: 'center', alpha: 0.75 * ease(covered), rot: 0.04 });
      steamOver(C.x, top, w, t, 0.5);
    },
  };
}

// пара над верхівкою хліба: три легкі струмені, що піднімаються й тануть
function steamOver(x, top, w, t, a) {
  for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; img('steam', x + (i - 1) * w * 0.22, top + 10 - k * 120, 70, 0, { alpha: Math.sin(k * Math.PI) * a }); }
}

// у пекарні Воркіт — у ковпаку пекаря (поза 24)
const BAKERY_SCENES = [SceneDizha, SceneMisyty, ScenePidhid, SceneForma, ScenePich, SceneStuk, SceneFinal].map(f => () => Object.assign(f(), { kPose: 'k24' }));
