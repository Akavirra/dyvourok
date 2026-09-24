/* Знак «Дивоурок» на canvas: розквітання стібками (як у короткій анімації логотипа) + святкові іскри. */
(function () {
  const RED = '#C8341F', YELLOW = '#F2B530';
  const N = 15, C = 7;
  const PETAL = [[7, 1], [6, 2], [7, 2], [8, 2], [6, 3], [7, 3], [8, 3], [6, 4], [7, 4], [8, 4]];
  const DIAG = [[5, 5], [4, 4], [3, 3]];

  const cells = [];
  for (let r = 0; r < 4; r++) {
    const rot = ([x, y]) => { let dx = x - C, dy = y - C; for (let i = 0; i < r; i++) [dx, dy] = [-dy, dx]; return [C + dx, C + dy]; };
    PETAL.concat(DIAG).forEach(p => {
      const [x, y] = rot(p);
      const d = Math.max(Math.abs(x - C), Math.abs(y - C));
      const diag = Math.abs(x - C) === Math.abs(y - C);
      cells.push({ x, y, delay: 0.30 + (d - 2) * 0.075 + (diag ? 0.05 : 0) });
    });
  }

  const clamp = v => Math.max(0, Math.min(1, v));
  const outCubic = v => 1 - Math.pow(1 - clamp(v), 3);
  const outBack = (v, k = 2.2) => { v = clamp(v); return 1 + (k + 1) * Math.pow(v - 1, 3) + k * Math.pow(v - 1, 2); };

  function square(ctx, x, y, half, deg, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(deg * Math.PI / 180);
    ctx.fillStyle = color;
    ctx.fillRect(-half, -half, half * 2, half * 2);
    ctx.restore();
  }

  /** Малює кадр розквітання в момент t (секунди). */
  function drawBloom(ctx, size, t) {
    ctx.clearRect(0, 0, size, size);
    const u = size / (N + 1);
    const cx = size / 2, cy = size / 2;
    const spin = -90 * (1 - outCubic(t / 1.35));
    const cs = Math.cos(spin * Math.PI / 180), sn = Math.sin(spin * Math.PI / 180);
    let p = (t - 0.05) / 0.45;
    if (p > 0) square(ctx, cx, cy, 1.5 * u * outBack(p, 2.6), spin + 45 * (1 - outCubic(p)), YELLOW);
    for (const c of cells) {
      p = (t - c.delay) / 0.42;
      if (p <= 0) continue;
      const dx = (c.x - C) * u, dy = (c.y - C) * u;
      const fx = cx + dx * cs - dy * sn, fy = cy + dx * sn + dy * cs;
      const tr = outCubic(p), st = 0.55 + 0.45 * tr;
      square(ctx, cx + (fx - cx) * st, cy + (fy - cy) * st, 0.5 * u * outBack(p, 2.4) + 0.4, spin + 45 * (1 - tr), RED);
    }
  }

  function playBloom(canvas, done) {
    const dpr = window.devicePixelRatio || 1;
    const css = canvas.getBoundingClientRect().width || 300;
    canvas.width = canvas.height = Math.round(css * dpr);
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { drawBloom(ctx, size, 5); done && done(); return; }
    const t0 = performance.now();
    (function frame(now) {
      const t = (now - t0) / 1000;
      drawBloom(ctx, size, t);
      if (t < 1.45) requestAnimationFrame(frame); else done && done();
    })(t0);
  }

  /** Святковий вибух квадратиків-іскор з точки (x, y) на весь екран. */
  function burst(x, y, count = 60) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.createElement('canvas');
    cv.className = 'fx-canvas';
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const parts = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2, v = 280 + Math.random() * 520;
      return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, s: 6 + Math.random() * 12, r: Math.random() * 360, vr: (Math.random() - .5) * 720,
        c: Math.random() < 0.35 ? YELLOW : RED, life: 1.1 + Math.random() * 0.7 };
    });
    const t0 = performance.now();
    let last = t0;
    (function frame(now) {
      const t = (now - t0) / 1000, dt = (now - last) / 1000;
      last = now;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let alive = false;
      for (const p of parts) {
        const q = t / p.life;
        if (q >= 1) continue;
        alive = true;
        p.vy += 900 * dt; p.vx *= 0.99;
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        ctx.globalAlpha = 1 - q * q;
        square(ctx, p.x, p.y, p.s / 2, p.r, p.c);
      }
      ctx.globalAlpha = 1;
      if (alive) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  window.DyvoStar = { playBloom, drawBloom, burst };
})();
