/* Жива сцена вертепу на першому екрані: паперові ляльки героїв (атласи з den-movy/anim/tools/web_stage.py).
   Натискання на героя — він вітається голосом з мультфільму, рот рухається за озвучкою; ще раз — наступна репліка. */
(function () {
  const root = document.getElementById('stage');
  if (!root || !root.getContext) return;
  const BASE = 'img/stage/';
  const W = 1672, H = 941;                    // світ = розмір рамки вертепу
  const OPEN = { x0: 391, y0: 298, x1: 1285, y1: 725 };   // прозорий отвір сцени
  const FLOOR = 762;                          // лінія, на якій стоять ноги
  const PH = 400;                             // висота ляльки у світі
  const BG = { x: OPEN.x0 - 70, y: OPEN.y0 - 84, w: OPEN.x1 - OPEN.x0 + 140, h: OPEN.y1 - OPEN.y0 + 168 };   // bg.webp — лише шматок тла довкола отвору
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = root.getContext('2d');
  const wrap = root.parentNode;
  const bubble = document.getElementById('stage-bubble');
  const hint = document.getElementById('stage-hint');

  const img = src => new Promise((ok, fail) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = fail; i.src = BASE + src; });
  // псевдовипадкове «кипіння» паперу: крок раз на 2 кадри (12.5 fps), як у мультфільмах
  const rnd = (a, b) => { let x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const boil = (t, key, amp = 0.9, rot = 0.35) => {
    if (reduce) return [0, 0, 0];
    const s = Math.floor(t * 12.5);
    return [(rnd(s, key) * 2 - 1) * amp, (rnd(s, key + 7) * 2 - 1) * amp, (rnd(s, key + 13) * 2 - 1) * rot];
  };
  const outBack = x => { const k = 2.2; x -= 1; return 1 + (k + 1) * x * x * x + k * x * x; };
  const clamp = x => Math.max(0, Math.min(1, x));
  const RAD = Math.PI / 180;

  let data, scene, bg, heroes = [], stars = [];
  let t0 = performance.now(), mouse = null, speaking = null, running = false, visible = true, dpr = 1;

  async function load() {
    data = await (await fetch(BASE + 'stage.json')).json();
    [scene, bg] = await Promise.all([img('scene.webp'), img('bg.webp')]);
    const atlases = await Promise.all(data.heroes.map(h => img(h.atlas)));
    const n = data.heroes.length;
    const span = OPEN.x1 - OPEN.x0 - 150;
    heroes = data.heroes.map((h, i) => ({
      ...h, atlas: atlases[i], key: i * 17 + 3,
      x: OPEN.x0 + 75 + span * (i / (n - 1)),          // де стоїть (центр ніг)
      s: PH / h.size[1],
      enter: 0.35 + i * 0.22,                          // коли виринає з-під сцени
      line: 0, hover: 0, hoverTo: 0, smileUntil: 0, lastEnd: -9
    }));
    // мерехтливі зірки в небі над селом
    for (let i = 0; i < 16; i++) stars.push({ x: OPEN.x0 + 20 + rnd(i, 1) * (OPEN.x1 - OPEN.x0 - 40), y: OPEN.y0 + 14 + rnd(i, 2) * 130, r: 2.5 + rnd(i, 3) * 3.5, ph: rnd(i, 4) * 6.3, sp: 0.8 + rnd(i, 5) * 1.6 });
    buildButtons();
    resize();
    wrap.classList.add('live');
    t0 = performance.now();
    start();
  }

  // --------------------------------------------------------------- малювання
  function part(h, name, m) {
    const f = h.frames[name];
    if (!f) return;
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    ctx.drawImage(h.atlas, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
  }

  // speech — {line, t} поточної репліки цього героя
  function drawHero(h, t, base) {
    const sp = speaking && speaking.hero === h ? speaking : null;
    const li = sp ? Math.floor(sp.time() * data.lipFps) : -1;
    const line = sp ? h.lines[sp.line] : null;
    const env = line && li >= 0 && li < line.env.length ? line.env[li] : 0;
    // виринання з-під сцени
    const p = reduce ? 1 : clamp((t - h.enter) / 0.7);
    if (p <= 0) return;
    const rise = (1 - outBack(p)) * PH * 1.05;
    h.hover += (h.hoverTo - h.hover) * 0.18;
    const lift = -h.hover * 12 - (sp ? 6 : 0);
    const [bx, by, br] = boil(t, h.key);
    const sway = reduce ? 0 : 0.7 * Math.sin(t * 0.9 + h.phase);
    const breathe = reduce ? 1 : 1 + 0.006 * Math.sin(t * 2.3 + h.phase);
    const [nx, ny] = h.neck;
    const legsH = h.frames.legs[3];
    const neckY = FLOOR - (h.legsAt[1] + legsH - ny) * h.s * (1 + h.hover * 0.03);
    const sc = h.s * (1 + h.hover * 0.03);
    const rootM = base.translate(h.x, neckY + rise + lift).translate(bx * h.s, by * h.s)
      .rotate(br + sway).scale(sc, sc * breathe).translate(-nx, -ny);
    part(h, 'legs', rootM.translate(h.legsAt[0], h.legsAt[1]).translate(-h.frames.legs[2] / 2, 0));

    const arms = () => {
      let [ox, oy, orr] = boil(t, h.key + 1);
      part(h, 'arm_l', rootM.translate(h.armL.at[0] + ox, h.armL.at[1] + oy).rotate(h.armL.rot + (reduce ? 0 : 2.5 * Math.sin(t * 1.3)) + orr).translate(-h.armL.pivot[0], -h.armL.pivot[1]));
      [ox, oy, orr] = boil(t, h.key + 2);
      const wave = sp ? -14 - 8 * env + 6 * env * Math.sin(t * 5) : 0;
      part(h, 'arm_r', rootM.translate(h.armR.at[0] + ox, h.armR.at[1] + oy).rotate(wave + orr).translate(-h.armR.pivot[0], -h.armR.pivot[1]));
    };
    if (!h.armsFront) arms();
    const [hx0, hy0, hr0] = boil(t, h.key + 3, 0.6, 0.5);
    const tilt = reduce ? 0 : 2 * Math.sin(t * 0.8 + h.phase);
    const headM = rootM.translate(nx + hx0, ny + hy0).rotate(tilt + 2.2 * env * Math.sin(t * 9) + hr0 + h.hover * -3).translate(-h.headPivot[0], -h.headPivot[1]);
    if (h.frames.neck) part(h, 'neck', headM);
    if (h.headBehind) { part(h, 'head', headM); part(h, 'torso', rootM); }
    else { part(h, 'torso', rootM); part(h, 'head', headM); }
    if (h.armsFront) arms();

    // очі: кліпання, погляд на того, хто говорить, або на курсор
    const ph = (t + h.phase) % 3.4;
    let eyes = ph < 0.08 || (ph >= 0.16 && ph < 0.24) ? 1 : ph < 0.16 ? 2 : 0;
    if (!eyes) {
      const target = speaking && speaking.hero !== h ? speaking.hero.x : mouse ? mouse.x : null;
      if (target != null && Math.abs(target - h.x) > 70) eyes = target < h.x ? 3 : 4;
    }
    const e = h.eyes;
    part(h, 'eyes' + eyes, headM.translate(e.at[0], e.at[1]).scale(e.s, e.s).translate(-e.anchor[0], -e.anchor[1]));
    let mouth = 0;
    if (line && li >= 0 && li < line.mouth.length) mouth = line.mouth[li];
    else if (t < h.smileUntil || h.hover > 0.5) mouth = 5;
    const m = h.mouth;
    part(h, 'mouth' + mouth, headM.translate(m.at[0], m.at[1]).scale(m.s, m.s).translate(-m.anchor[0], -m.anchor[1]));
    if (h.frames.over) part(h, 'over', headM);
  }

  function frame(now) {
    if (!running) return;
    const t = (now - t0) / 1000;
    const cw = root.width, ch = root.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const k = cw / W;
    const base = new DOMMatrix([k, 0, 0, k, 0, 0]);
    // тло з легким паралаксом за курсором
    const px = mouse && !reduce ? (mouse.x / W - 0.5) * -14 : 0, py = mouse && !reduce ? (mouse.y / H - 0.5) * -8 : 0;
    ctx.save();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.beginPath(); ctx.rect(OPEN.x0 - 30, OPEN.y0 - 60, OPEN.x1 - OPEN.x0 + 60, OPEN.y1 - OPEN.y0 + 120); ctx.clip();
    ctx.drawImage(bg, BG.x + px, BG.y + py, BG.w, BG.h);
    // зірки
    ctx.globalCompositeOperation = 'lighter';
    for (const s of stars) {
      const a = reduce ? 0.5 : 0.35 + 0.65 * Math.max(0, Math.sin(t * s.sp + s.ph)) ** 3;
      const g = ctx.createRadialGradient(s.x + px, s.y + py, 0, s.x + px, s.y + py, s.r * 2.2);
      g.addColorStop(0, `rgba(255,246,210,${a})`); g.addColorStop(0.3, `rgba(255,226,140,${a * 0.55})`); g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g; ctx.fillRect(s.x + px - s.r * 2.2, s.y + py - s.r * 2.2, s.r * 4.4, s.r * 4.4);
    }
    ctx.restore();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.drawImage(scene, 0, 0, W, H);
    // ляльки виринають крізь щілину в підлозі: усе нижче лінії ніг обрізаємо
    ctx.save();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.beginPath(); ctx.rect(0, 0, W, FLOOR + 4); ctx.clip();
    for (const h of heroes) drawHero(h, t, base);
    ctx.restore();
    placeBubble();
    if (visible) requestAnimationFrame(frame); else running = false;
  }

  function start() { if (!running && visible) { running = true; requestAnimationFrame(frame); } }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = root.clientWidth;
    root.width = Math.round(w * dpr);
    root.height = Math.round(w * dpr * H / W);
    placeButtons();
  }

  // --------------------------------------------------------------- взаємодія
  let buttons = [];
  function buildButtons() {
    buttons = heroes.map(h => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stage-hit';
      b.setAttribute('aria-label', `${h.name}: послухати`);
      b.innerHTML = `<span class="stage-name">${h.name}</span>`;
      b.addEventListener('pointerenter', () => { h.hoverTo = 1; });
      b.addEventListener('pointerleave', () => { h.hoverTo = 0; });
      b.addEventListener('focus', () => { h.hoverTo = 1; });
      b.addEventListener('blur', () => { h.hoverTo = 0; });
      b.addEventListener('click', () => say(h));
      wrap.append(b);
      return b;
    });
  }
  function placeButtons() {
    heroes.forEach((h, i) => {
      const w = h.size[0] * h.s * 0.9;
      const b = buttons[i];
      if (!b) return;
      b.style.left = ((h.x - w / 2) / W * 100) + '%';
      b.style.width = (w / W * 100) + '%';
      b.style.top = ((FLOOR - PH) / H * 100) + '%';
      b.style.height = (PH / H * 100) + '%';
    });
  }

  function say(h) {
    if (speaking) speaking.stop();
    if (hint) hint.classList.add('done');
    const n = h.line % h.lines.length;
    h.line++;
    const line = h.lines[n];
    const audio = new Audio(BASE + line.audio);
    const started = performance.now();
    let useClock = false;
    const dur = line.mouth.length / data.lipFps;
    const sp = {
      hero: h, line: n,
      time: () => useClock || !audio.currentTime ? (performance.now() - started) / 1000 : audio.currentTime,
      stop: () => { audio.pause(); clearTimeout(sp.timer); end(); }
    };
    const end = () => {
      if (speaking !== sp) return;
      speaking = null;
      h.smileUntil = (performance.now() - t0) / 1000 + 1.4;
      bubble.classList.remove('show');
    };
    audio.addEventListener('ended', end);
    audio.play().catch(() => { useClock = true; });
    sp.timer = setTimeout(end, dur * 1000 + 600);   // запасний вихід, якщо звук не відтворився
    speaking = sp;
    bubble.querySelector('b').textContent = h.name;
    bubble.querySelector('span').textContent = line.text;
    bubble.classList.add('show');
    placeBubble();
    start();
  }

  function placeBubble() {
    if (!speaking) return;
    const h = speaking.hero;
    const x = Math.max(OPEN.x0 + 150, Math.min(OPEN.x1 - 150, h.x));
    bubble.style.left = (x / W * 100) + '%';
    bubble.style.bottom = ((H - (FLOOR - PH * 0.98)) / H * 100) + '%';
    bubble.style.setProperty('--tail', ((h.x - x) / W * 100 * 6) + 'px');
  }

  wrap.addEventListener('pointermove', e => {
    const r = root.getBoundingClientRect();
    mouse = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  });
  wrap.addEventListener('pointerleave', () => { mouse = null; });
  addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting && !document.hidden; start(); }).observe(root);
  }
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; start(); });

  load().catch(() => {});      // без сцени лишається статична картинка-заставка
})();
