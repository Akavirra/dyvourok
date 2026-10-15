'use strict';
// Ядро «Шляху зернини»: світ 1600×900 вписаний у вікно, фони домальовуються до країв.
// Одна дія на екран: підказка-рука, субтитр маскота, велика кнопка «Далі».

const W = 1600, H = 900, TAU = Math.PI * 2;
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = p => p * p * (3 - 2 * p);
const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- стан ----------
const Store = {
  get(k, d) { try { const v = localStorage.getItem('khlib_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('khlib_' + k, JSON.stringify(v)); } catch (e) {} },
};
const State = { grade: Store.get('grade', 1), sound: Store.get('sound', true), loaf: 'pal' };

// ---------- полотно ----------
const cv = $('#scene'), ctx = cv.getContext('2d');
const View = {
  scale: 1, dpr: 1, ox: 0, oy: 0, aw: W, ah: H,
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const aw = innerWidth, ah = innerHeight;
    this.aw = aw; this.ah = ah; this.scale = Math.min(aw / W, ah / H);
    this.ox = (aw - W * this.scale) / 2; this.oy = (ah - H * this.scale) / 2;
    cv.width = Math.round(aw * this.dpr); cv.height = Math.round(ah * this.dpr);
    cv.style.width = aw + 'px'; cv.style.height = ah + 'px';
    const st = $('#stage').style;
    st.left = this.ox + 'px'; st.top = this.oy + 'px'; st.width = W * this.scale + 'px'; st.height = H * this.scale + 'px';
    document.documentElement.style.setProperty('--u', this.scale + 'px');
  },
  vis() { return { x: -this.ox / this.scale, y: -this.oy / this.scale, w: this.aw / this.scale, h: this.ah / this.scale }; },
  begin() { const d = this.dpr, s = this.scale; ctx.setTransform(d * s, 0, 0, d * s, d * this.ox, d * this.oy); ctx.globalAlpha = 1; ctx.filter = 'none'; },
};
addEventListener('resize', () => View.resize());

// ---------- картинки ----------
// Ключ → файл img/<ключ>.webp. Поки файлу нема, малюємо паперову заглушку.
// IV — версія картинок (окремо від коду: оновлення коду не змушує качати всі картинки наново).
const IV = '42';
const IMG = {};
let IMG_REC = null;   // сюди Scene записує, які картинки потрібні сцені
function loadImg(key) {
  if (IMG_REC) IMG_REC.add(key);
  if (IMG[key]) return IMG[key];
  const im = new Image(); im.ok = false; im.src = 'img/' + key + '.webp?v=' + IV;
  im.onload = () => { im.ok = true; }; im.onerror = () => { im.failed = true; }; IMG[key] = im; return im;
}
// Усі картинки — фоном, по 4 одночасно (тла й маскоти першими), щоб на дошці не блимали заглушки.
const IMG_ALL = ['bg_bakery', 'bg_combine', 'bg_final', 'bg_hata', 'bg_hill', 'bg_map', 'bg_mill', 'bg_nyva', 'bg_rillia', 'bg_tik', 'k01', 'k02', 'k03', 'k04', 'k05', 'k06', 'k07', 'k08', 'k09', 'k10', 'k11', 'k12', 'k13', 'k14', 'k15', 'k16', 'k17', 'k18', 'k19', 'k20', 'k21', 'k22', 'k23', 'k24', 's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20', 's21', 's22', 'cloud', 'combine', 'dizha', 'drova', 'embers', 'fire', 'g01', 'g02', 'g03', 'g04', 'g05', 'g06', 'g07', 'g08', 'g09', 'g10', 'gudzyk', 'hand_knock', 'hand_sow', 'hands_knead', 'hands_peel', 'hands_serp', 'hero', 'i_boroshno', 'i_sil', 'i_voda', 'i_zakvaska', 'k01_m0', 'k01_m1', 'k01_m2', 'k01_m3', 'k01_m4', 'k01_m5', 'kalach', 'kliuch', 'kolos_gold', 'kolos_green', 'kopa', 'korovai', 'korovai_d0', 'korovai_d1', 'korovai_d2', 'korovai_d3', 'korovai_d4', 'korovai_d5', 'korovai_plain', 'kotsiuba', 'kryla', 'lopata', 'lystok', 'mishok0', 'mishok1', 'pal', 'pal_raw', 'parostok', 'pich', 'pich_close', 'polova', 'resheto', 'rushnyk', 's06_b1', 's06_b2', 'serp', 'slice', 'snip', 'steam', 'sun', 'testo1', 'testo2', 'testo3', 'tsip', 'tsukerka', 'vitriak', 'zerno', 'zhorna'];
const Preload = {
  queue: [], busy: 0,
  all(keys) { for (const k of keys) if (!IMG[k]) this.queue.push(k); this.pump(); },
  pump() {
    while (this.busy < 4 && this.queue.length) {
      const k = this.queue.shift(); if (IMG[k]) continue;
      this.busy++; const im = loadImg(k), done = () => { this.busy--; this.pump(); };
      im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true });
    }
  },
  ready(keys) { return [...keys].every(k => { const im = IMG[k] || loadImg(k); return im.ok || im.failed; }); },
};
addEventListener('load', () => setTimeout(() => Preload.all(IMG_ALL), 300));
const PH_COL = { bg: '#E9DCC0', kolos: '#E3B04B', green: '#6E9E46', dough: '#F1DDB4', bread: '#C98632', wood: '#8A5A33', cloth: '#F7F1E6', k: '#E39A3B', s: '#22303A' };
function phColor(key) {
  if (key.startsWith('bg_')) return PH_COL.bg;
  if (/kolos_gold|snip|kopa|zerno|polova/.test(key)) return PH_COL.kolos;
  if (/green|parostok/.test(key)) return PH_COL.green;
  if (/testo|pal_raw/.test(key)) return PH_COL.dough;
  if (/^pal$|kalach|korovai|hero/.test(key)) return PH_COL.bread;
  if (/rushnyk/.test(key)) return PH_COL.cloth;
  if (/^k\d/.test(key)) return PH_COL.k;
  if (/^s\d/.test(key)) return PH_COL.s;
  return PH_COL.wood;
}
// Малює картинку в прямокутник (x,y — центр низу, якщо anchor='bottom'; центр — якщо 'center'). h=0 → за шириною.
function img(key, x, y, w, h = 0, o = {}) {
  const im = loadImg(key);
  const ar = im.ok ? im.naturalWidth / im.naturalHeight : (o.ar || 1);
  if (!h) h = w / ar; if (!w) w = h * ar;
  const ax = o.anchor === 'center' ? 0.5 : 0.5, ay = o.anchor === 'center' ? 0.5 : 1;
  ctx.save(); ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.sx || o.sy) ctx.scale(o.sx || 1, o.sy || 1);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.filter) ctx.filter = o.filter;
  if (im.ok) ctx.drawImage(im, -w * ax, -h * ay, w, h);
  else {
    ctx.fillStyle = phColor(key); ctx.strokeStyle = 'rgba(80,50,20,.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-w * ax, -h * ay, w, h, Math.min(w, h) * 0.18); ctx.fill(); ctx.stroke();
    if (w > 70) { ctx.fillStyle = 'rgba(60,35,15,.55)'; ctx.font = `800 ${Math.max(12, Math.min(26, w / 8))}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(o.label || key, -w * ax + w / 2, -h * ay + h / 2 + 8); }
  }
  ctx.restore();
}
// Фон на весь видимий простір (cover), без чорних смуг.
function bg(key, alpha = 1) {
  const v = View.vis(), im = loadImg(key);
  if (!isFinite(v.w) || !isFinite(v.h) || v.h <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  if (im.ok) {
    const s = Math.max(v.w / im.naturalWidth, v.h / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, v.x + (v.w - w) / 2, v.y + (v.h - h) / 2, w, h);
    if (alpha === 1) Ambient.draw(key, v, s, v.x + (v.w - w) / 2, v.y + (v.h - h) / 2);
  } else {
    const g = ctx.createLinearGradient(0, v.y, 0, v.y + v.h);
    g.addColorStop(0, '#CFE3EC'); g.addColorStop(0.55, '#EEF2EA'); g.addColorStop(0.56, '#C8A46A'); g.addColorStop(1, '#8F6A3E');
    ctx.fillStyle = g; ctx.fillRect(v.x, v.y, v.w, v.h);
  }
  ctx.restore();
}

// ---------- живе тло: повільні хмари й птахи надворі, порошинки в променях і жар печі в хаті ----------
// Усе ледь помітне — щоб сцена дихала, але не відволікала.
const Ambient = {
  OUT: /^bg_(nyva|rillia|hill|combine|tik)$/, IN: /^bg_(mill|hata|bakery|final)$/,
  clouds: [[0.05, 70, 190, 7], [0.42, 120, 150, 5], [0.78, 55, 230, 9]],
  motes: Array.from({ length: 34 }, (_, i) => [((i * 7919) % 1000) / 1000, ((i * 104729) % 1000) / 1000, 6 + (i % 5) * 3, 1.4 + (i % 3) * 0.8, i]),
  birds: null, nextBird: 6,
  draw(key, v, s, ix, iy) {
    const t = performance.now() / 1000;
    if (this.OUT.test(key)) {
      // хмарки пливуть праворуч і повертаються з лівого краю
      for (const [x0, y, w, sp] of this.clouds) {
        const span = v.w + w * 2, x = v.x - w + ((x0 * span + t * sp) % span);
        img('cloud', x, y, w, 0, { anchor: 'center', alpha: 0.85, ar: 1.5 });
      }
      // зграйка птахів зрідка перелітає небо
      if (!this.birds && t > this.nextBird) this.birds = { t0: t, y: 70 + Math.random() * 70, dir: Math.random() < 0.5 ? 1 : -1, n: 2 + Math.floor(Math.random() * 2) };
      const b = this.birds;
      if (b) {
        const p = (t - b.t0) * 85, x0 = b.dir > 0 ? v.x - 60 + p : v.x + v.w + 60 - p;
        if (p > v.w + 160) { this.birds = null; this.nextBird = t + 14 + Math.random() * 14; }
        else {
          ctx.save(); ctx.strokeStyle = 'rgba(60,45,35,.6)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
          for (let i = 0; i < b.n; i++) {
            const bx = x0 - b.dir * i * 34, by = b.y + i * 14 + Math.sin(t * 2 + i) * 4, f = Math.sin(t * 9 + i * 1.7) * 6;
            ctx.beginPath(); ctx.moveTo(bx - 11, by - 3 - f); ctx.quadraticCurveTo(bx - 5, by - 6 - f * 0.5, bx, by); ctx.quadraticCurveTo(bx + 5, by - 6 - f * 0.5, bx + 11, by - 3 - f); ctx.stroke();
          }
          ctx.restore();
        }
      }
    } else if (this.IN.test(key)) {
      // порошинки — повільно здіймаються й мерехтять
      ctx.save(); ctx.fillStyle = '#FFF4D6';
      for (const [fx, fy, sp, r, i] of this.motes) {
        const y = v.y + v.h - ((fy * v.h + t * sp) % v.h), x = v.x + fx * v.w + Math.sin(t * 0.5 + i) * 18;
        ctx.globalAlpha = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1));
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
      ctx.restore();
      // жар у печі (фінальна хата) — тепле мерехтіння
      if (key === 'bg_final') {
        const fx = ix + 1464 * s, fy = iy + 730 * s, fl = 0.5 + 0.25 * Math.sin(t * 7.3) + 0.25 * Math.sin(t * 12.7 + 1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(fx, fy, 10, fx, fy, 190); g.addColorStop(0, `rgba(255,150,50,${0.16 + fl * 0.1})`); g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g; ctx.fillRect(fx - 200, fy - 200, 400, 400); ctx.restore();
      }
    }
  },
};

// ---------- перехід між сценами: старий кадр «відгортається» паперовим аркушем ----------
const Wipe = {
  el: null,
  init() {
    this.el = $('#wipe'); const c = this.el.querySelector('canvas');
    // рваний край праворуч
    const pts = ['0% 0%']; for (let i = 0; i <= 24; i++) pts.push(`calc(100% - ${(i % 2 ? 10 : 2) + (i * 37 % 7)}px) ${(i / 24 * 100).toFixed(2)}%`); pts.push('0% 100%');
    c.style.clipPath = `polygon(${pts.join(',')})`;
    this.el.addEventListener('animationend', () => { this.el.classList.remove('go'); });
  },
  snap() {
    if (!this.el) this.init();
    if (!$('#veil').hidden) return;
    const c = this.el.querySelector('canvas'); c.width = cv.width; c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    this.el.classList.remove('go'); void this.el.offsetWidth; this.el.classList.add('go');
    clearTimeout(this.tm); this.tm = setTimeout(() => this.el.classList.remove('go'), 1300);   // запасний вихід, якщо анімація не завершилась
    Sfx.play('sfx_cloth', null, 0.25);
  },
};

// ---------- введення ----------
const Pointer = { x: W / 2, y: H / 2, down: false, cursor: null };
function evPos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - View.ox) / View.scale, y: (e.clientY - r.top - View.oy) / View.scale }; }
cv.addEventListener('pointermove', e => { const p = evPos(e); Pointer.x = p.x; Pointer.y = p.y; Scene.cur && Scene.cur.pointer && Scene.cur.pointer('move', p); });
addEventListener('pointerdown', () => { Sfx.ctx(); Music.resume(); }, true);
cv.addEventListener('pointerdown', e => { Sfx.ctx(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} const p = evPos(e); Object.assign(Pointer, p, { down: true }); Hint.idle = 0; Scene.cur && Scene.cur.pointer && Scene.cur.pointer('down', p); });
cv.addEventListener('pointerup', e => { const p = evPos(e); Object.assign(Pointer, p, { down: false }); Scene.cur && Scene.cur.pointer && Scene.cur.pointer('up', p); });
cv.addEventListener('pointercancel', () => { Pointer.down = false; Scene.cur && Scene.cur.pointer && Scene.cur.pointer('up', { x: Pointer.x, y: Pointer.y }); });
addEventListener('keydown', e => { if ((e.key === 'ArrowRight' || e.key === 'Enter') && !$('#next').hidden) $('#next').click(); });
// пробіл не прокручує сторінку

// ---------- таймери сцени ----------
const Timers = {
  ids: [],
  later(fn, ms) { const id = setTimeout(() => { this.ids = this.ids.filter(x => x !== id); fn(); }, ms); this.ids.push(id); return id; },
  clear() { this.ids.forEach(clearTimeout); this.ids = []; },
};

// ---------- звуки (синтез) ----------
const Sfx = {
  _c: null,
  ctx() { if (!this._c) { try { this._c = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (this._c.state === 'suspended') this._c.resume(); return this._c; },
  noise(dur, f0, f1, vol = 0.3, type = 'bandpass') {
    if (!State.sound) return; const c = this.ctx(); if (!c) return;
    const n = c.sampleRate * dur, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, c.currentTime); f.frequency.exponentialRampToValueAtTime(f1, c.currentTime + dur);
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start();
  },
  tone(freq, dur, vol = 0.2, type = 'sine', f1) {
    if (!State.sound) return; const c = this.ctx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime); if (f1) o.frequency.exponentialRampToValueAtTime(f1, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  },
  // Файли audio/sfx/<name>.mp3 (ElevenLabs); якщо файлу нема — синтез fb().
  files: {}, missing: {},
  play(name, fb, vol = 0.8) {
    if (!State.sound) return;
    if (this.missing[name]) { fb && fb(); return; }
    let a = this.files[name];
    if (!a) {
      a = this.files[name] = new Audio('audio/sfx/' + name + '.mp3' + (window.KV ? '?v=' + KV : ''));
      a.preload = 'auto'; a.onerror = () => { this.missing[name] = true; };
    }
    if (a.error) { this.missing[name] = true; fb && fb(); return; }
    try { const c = a.cloneNode(); c.volume = vol; c.play().catch(() => { fb && fb(); }); } catch (e) { fb && fb(); }
  },
  swish() { this.play('sfx_sickle', () => this.noise(0.25, 3000, 800, 0.25)); },
  thud() { this.play('sfx_drop', () => { this.tone(120, 0.18, 0.5, 'sine', 50); this.noise(0.12, 800, 200, 0.3, 'lowpass'); }); },
  knockDull() { this.play('sfx_knock_dull', () => this.tone(160, 0.12, 0.45, 'sine', 90)); },
  knockRing() { this.play('sfx_knock_ring', () => { this.tone(520, 0.25, 0.3, 'triangle', 380); this.tone(780, 0.18, 0.12, 'sine'); }); },
  pop() { this.play('sfx_pop', () => this.tone(600, 0.08, 0.2, 'sine', 1200), 0.6); },
  ok() { if (typeof Mascot !== 'undefined') Mascot.cheer(); this.play('sfx_right', () => { this.tone(660, 0.12, 0.18, 'triangle'); setTimeout(() => this.tone(990, 0.2, 0.18, 'triangle'), 110); }); },
  no() { this.play('sfx_wrong', () => this.tone(240, 0.2, 0.2, 'square', 180)); },
  crackle() { for (let i = 0; i < 4; i++) setTimeout(() => this.noise(0.04, 2500, 1500, 0.15), i * 70 + Math.random() * 40); },
  wind() { this.play('sfx_wind', () => this.noise(0.6, 600, 1500, 0.18), 0.6); },
  rain() { this.play('sfx_rain', () => this.noise(1.2, 4000, 3000, 0.08, 'highpass'), 0.25); },
  // один тихий дощ петлею (а не купа накладених копій); гучність плавно за v
  rainLoop(v) {
    if (!State.sound || this.missing.sfx_rain) return;
    let a = this.rainEl;
    if (!a) { a = this.rainEl = new Audio('audio/sfx/sfx_rain.mp3' + (window.KV ? '?v=' + KV : '')); a.loop = true; a.volume = 0; a.play().catch(() => {}); }
    a.volume = Math.max(0, Math.min(0.35, a.volume + (v - a.volume) * 0.05));
  },
  rainStop() { if (this.rainEl) { this.rainEl.pause(); this.rainEl = null; } },
  ding() { this.play('sfx_tada', () => { this.tone(880, 0.6, 0.15, 'sine'); this.tone(1320, 0.6, 0.08, 'sine'); }); },
};

// ---------- музика (audio/music/<name>.mp3, петлею; під репліки приглушуємо) ----------
const Music = {
  el: null, name: '', vol: 0.11, cur: 0,
  play(name, loop = true) {
    if (this.name === name && this.el) return; this.stop();
    this.name = name; const a = new Audio('audio/music/' + name + '.mp3' + (window.KV ? '?v=' + KV : ''));
    a.loop = loop; a.volume = 0; this.el = a; this.cur = 0;
    if (State.sound) a.play().catch(() => {});
  },
  stop() { if (this.el) { this.el.pause(); this.el = null; } this.name = ''; },
  resume() { if (this.el && State.sound && this.el.paused) this.el.play().catch(() => {}); },
  update(dt) {
    if (!this.el) return;
    if (!State.sound) { if (!this.el.paused) this.el.pause(); return; }
    // під час мультика музика мовчить; під репліки — тихіше
    const vid = document.querySelector('#stage video'), film = vid && !vid.paused;
    const want = film ? 0 : Voice.speaking ? this.vol * 0.4 : this.vol;
    this.cur += (want - this.cur) * Math.min(1, dt * 4); this.el.volume = clamp(this.cur, 0, 1);
  },
};

// ---------- голос і субтитр ----------
const Voice = {
  audio: null, speaking: null, t0: 0,
  an: null, buf: null,
  // рівень голосу 0..1 (для рота й дзьоба); без аналізатора — 0
  meter(a) {
    try {
      const c = Sfx.ctx(); if (!c || c.state !== 'running') return;   // інакше голос пішов би в «сплячий» звук
      if (!this.an) { this.an = c.createAnalyser(); this.an.fftSize = 512; this.buf = new Float32Array(512); this.an.connect(c.destination); }
      c.createMediaElementSource(a).connect(this.an);
    } catch (e) {}
  },
  level() {
    if (!this.an || !this.audio) return this.speaking ? 0.08 + 0.08 * Math.sin(performance.now() / 70) : 0;
    this.an.getFloatTimeDomainData(this.buf); let s = 0; for (const v of this.buf) s += v * v;
    return Math.sqrt(s / this.buf.length);
  },
  stop() { this.pending = null; if (this.audio) { this.audio.pause(); this.audio = null; } try { speechSynthesis.cancel(); } catch (e) {} this.speaking = null; },
  // Повертає Promise, що завершується, коли репліка договорена (або пропущена).
  // Нова репліка не перебиває поточну, а чекає її кінця (у черзі лише одна — найновіша).
  // now=true — перебити одразу (кнопка «повторити»).
  say(id, now) {
    const line = LINES[id]; if (!line) return Promise.resolve();
    if (!now && this.speaking) {
      if (this.pending) this.pending.res();
      return new Promise(res => { this.pending = { id, res, alive: Scene.alive }; });
    }
    this.stop(); const [who, text] = line;
    Sub.show(who, text, id); this.speaking = who; this.t0 = performance.now();
    const alive = Scene.alive;   // якщо сцену вже змінили, ланцюжок попередньої сцени не продовжується
    return new Promise(res => {
      let over = false;
      const end = () => {
        if (over) return; over = true;
        if (this.speaking === who) this.speaking = null;
        const q = this.pending; this.pending = null;
        if (q && q.alive === Scene.alive && !this.speaking) { this.say(q.id).then(q.res); if (alive === Scene.alive) res(); return; }
        const me = Sub.last; setTimeout(() => { if (Sub.last === me && !this.speaking) Sub.hide(); }, 2500); if (alive === Scene.alive) res(); };
      if (!State.sound) { setTimeout(end, 900 + text.length * 45); return; }
      const a = new Audio('audio/' + id + '.mp3' + (window.KV ? '?v=' + KV : '')); this.audio = a;
      this.meter(a);
      a.onended = end;
      a.onerror = () => { if (this.audio !== a) return; this.audio = null; this.tts(text, who, end); };
      a.play().catch(() => { if (this.audio === a) { this.audio = null; this.tts(text, who, end); } });
    });
  },
  tts(text, who, end) {
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/[«»]/g, '')); u.lang = 'uk-UA';
      const v = speechSynthesis.getVoices().find(v => /^uk/i.test(v.lang)); if (v) u.voice = v;
      u.rate = who === 'v' ? 1.12 : 0.92; u.pitch = who === 'v' ? 1.5 : 0.8;
      u.onend = end; u.onerror = end; speechSynthesis.speak(u);
      setTimeout(end, 1500 + text.length * 90);
    } catch (e) { setTimeout(end, 900 + text.length * 45); }
  },
};
const Sub = {
  last: null,
  show(who, text, id) {
    const el = $('#sub'); el.hidden = false; el.dataset.who = who; this.last = id;
    $('#subWho').textContent = who === 'k' ? 'Воркіт' : 'Вістка';
    $('#subText').textContent = text;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  },
  hide() { $('#sub').hidden = true; },
};
$('#subAgain').addEventListener('click', () => { if (Sub.last) Voice.say(Sub.last, true); });

// Черга реплік: Lines.play(['a','b']) → Promise.
const Lines = { async play(ids) { for (const id of ids) { if (!Scene.alive) return; await Voice.say(id); await new Promise(r => setTimeout(r, 250)); } } };

// ---------- маскоти на сцені ----------
// Воркіт сидить у куті, Вістка прилітає, коли говорить. Пози — img k01…/s01….
const Mascot = {
  kPose: 'k01', sPose: 's01', sIn: 0, sWant: 0, hideK: false, sx: 1490, sy: 600,
  set(k, s) { if (k) this.kPose = k; if (s) this.sPose = s; },
  update(dt) {
    this.sWant = Voice.speaking === 'v' || this.sStay ? 1 : 0;
    this.sIn += (this.sWant - this.sIn) * Math.min(1, dt * 4);
    // «життя»: час від часу маленький рух — нахил, підскок; Вістка ще й перестрибує трохи вбік
    for (const who of ['k', 's']) {
      const L = this.life[who];
      if (L.act) { L.act.t += dt; if (L.act.t >= L.act.dur) { if (L.act.to != null) L.off = L.act.to; L.act = null; } continue; }
      L.next -= dt;
      if (L.next <= 0 && Voice.speaking !== who && (who === 'k' || this.sIn > 0.95)) {
        const r = Math.random();
        if (who === 'k') L.act = r < 0.6 ? { kind: 'tilt', t: 0, dur: 1.6, dir: Math.random() < 0.5 ? -1 : 1 } : { kind: 'hop', t: 0, dur: 0.55, h: 16 };
        else L.act = r < 0.45 ? { kind: 'hop', t: 0, dur: 0.6, h: 34, from: L.off, to: clamp(L.off + (Math.random() < 0.5 ? -1 : 1) * rnd(40, 80), -110, 30) } : { kind: 'tilt', t: 0, dur: 1.1, dir: Math.random() < 0.5 ? -1 : 1 };
        L.next = rnd(5, 10);
      }
    }
    // Воркіт трохи «стежить» за тим, що роблять на дошці
    const lean = Pointer.down ? clamp((Pointer.x - 300) / 1300, -0.2, 1) * 0.06 : 0;
    this.lean += (lean - this.lean) * Math.min(1, dt * 3);
  },
  life: { k: { act: null, next: 4, off: 0 }, s: { act: null, next: 3, off: 0 } }, lean: 0,
  resetLife() { this.life.k = { act: null, next: rnd(3, 6), off: 0 }; this.life.s = { act: null, next: rnd(2, 5), off: 0 }; this.lean = 0; },
  // радіємо разом із класом (правильна відповідь, виконана дія)
  cheer() {
    if (this.dance) return;
    this.life.k.act = { kind: 'hop', t: 0, dur: 0.5, h: 26 };
    if (this.sIn > 0.9) this.life.s.act = { kind: 'hop', t: 0, dur: 0.5, h: 40, from: this.life.s.off, to: this.life.s.off };
  },
  // зсув від поточного руху: dy (угору), rot, sq (сплющення: <1 — присів, >1 — витягнувся), dx
  pose(who) {
    const L = this.life[who], a = L.act, o = { dy: 0, rot: 0, sq: 1, dx: L.off };
    if (!a) return o;
    const p = clamp(a.t / a.dur, 0, 1);
    if (a.kind === 'tilt') o.rot = a.dir * (who === 'k' ? 0.05 : 0.09) * Math.sin(p * Math.PI);
    else {
      if (p < 0.18) o.sq = 1 - 0.07 * (p / 0.18);
      else if (p < 0.82) { const q = (p - 0.18) / 0.64; o.dy = Math.sin(q * Math.PI) * a.h; o.sq = 1.04; if (a.to != null) o.dx = lerp(a.from, a.to, ease(q)); }
      else o.sq = 0.94 + 0.06 * ((p - 0.82) / 0.18);
      if (p >= 0.82 && a.to != null) o.dx = a.to;
    }
    return o;
  },
  // фізхвилинка: обидва маскоти по центру великі й міняють пози в такт
  dance: null,
  startDance(kp, sp, bpm = 84, at = {}) { [...kp, ...sp].forEach(k => loadImg(k)); this.dance = Object.assign({ kp, sp, beat: 60 / bpm, t0: null, kx: 540, sx: 1060, y: 750, sc: 1 }, at); },
  stopDance() { this.dance = null; },
  drawDance(t) {
    const d = this.dance; if (d.t0 == null) d.t0 = t;
    const u = (t - d.t0) / d.beat, i = Math.floor(u), f = u - i;
    const hop = Math.sin(f * Math.PI), sq = 1 - Math.max(0, 1 - f * 5) * 0.12;   // приземлення — сплющились
    const kKey = d.kp[i % d.kp.length], sKey = d.sp[(i + 1) % d.sp.length];
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#3a2412';
    for (const [x, w] of [[d.kx, 300], [d.sx, 220]]) { ctx.beginPath(); ctx.ellipse(x, d.y + 2, w * d.sc * (0.9 - hop * 0.2), 22 * d.sc, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    img(kKey, d.kx, d.y - hop * 60, 0, 400 * d.sc, { label: 'Воркіт', ar: 1, sx: 2 - sq, sy: sq, rot: (i % 2 ? 1 : -1) * 0.06 * hop });
    img(sKey, d.sx, d.y - hop * 90, 0, 430 * d.sc, { label: 'Вістка', ar: 0.7, sx: 2 - sq, sy: sq, rot: (i % 2 ? -1 : 1) * 0.08 * hop });
  },
  draw(t) {
    if (this.dance) return this.drawDance(t);
    const talkK = Voice.speaking === 'k', talkS = Voice.speaking === 'v';
    const lv = talkK || talkS ? Voice.level() : 0;
    // крок рота змінюється не частіше ніж раз на 90 мс — без мерехтіння
    if (t - (this.mt || 0) > 0.09) { this.mt = t; this.mi = lv < 0.012 ? 0 : lv < 0.04 ? (this.mi === 1 ? 3 : 1) : lv < 0.09 ? (this.mi === 2 ? 4 : 2) : 2; }
    if (!this.hideK) {
      const b = talkK ? Math.min(6, lv * 60) : 0;
      const key = talkK ? 'k01_m' + [0, 1, 2, 3, 4][this.mi || 0] : this.kPose;
      const P = this.pose('k'), br = 1 + Math.sin(t * 2.1) * 0.012;   // дихання
      const rot = P.rot + this.lean + (talkK ? Math.sin(t * 4.3) * 0.015 : Math.sin(t * 0.7) * 0.01);
      img(key, 150, 900 - 6 - P.dy, 0, 250 + b, { label: 'Воркіт', ar: 1, rot, sx: 1 / Math.sqrt(P.sq * br), sy: P.sq * br });
    }
    if (this.sIn > 0.02) {
      // прилітає дугою, а не виїжджає; на місці — легке погойдування й свої дрібні рухи
      const P = this.pose('s'), e = ease(this.sIn);
      const x = lerp(1800, this.sx + P.dx, e), y = this.sy - (1 - e) * 160 - P.dy + (talkS ? Math.sin(t * 14) * 4 : Math.sin(t * 3) * 3);
      const sk = this.sIn < 0.95 ? 's19' : talkS && !this.sKeep ? ['s06', 's06_b1', 's06_b2', 's06_b1', 's06_b2'][this.mi || 0] : this.sPose;
      img(sk, x, y, 0, talkS ? 250 : 230, { label: 'Вістка', ar: 0.7, rot: P.rot + Math.sin(t * 1.3) * 0.025, sx: 1 / Math.sqrt(P.sq), sy: P.sq });
    }
  },
};

// ---------- підказка-рука ----------
// path: функція t∈[0,1] → {x,y,down}. Показується, якщо дитина 4 с нічого не робить.
const Hint = {
  path: null, idle: 0, t: 0,
  set(path) { this.path = path; this.idle = 2.5; this.t = 0; },
  clear() { this.path = null; },
  update(dt) { if (!this.path) return; if (!Pointer.down) this.idle += dt; this.t += dt; },
  draw() {
    if (!this.path || this.idle < 3.5 || Pointer.down) return;
    const p = this.path((this.t % 2.2) / 2.2); if (!p) return;
    ctx.save(); ctx.globalAlpha = 0.85;
    if (p.down) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, TAU); ctx.fill(); }
    ctx.translate(p.x, p.y); ctx.rotate(-0.35);
    ctx.font = '84px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 10;
    ctx.fillText('👆', 0, -8); ctx.restore();
  },
};
const HintPaths = {
  swipe: (x0, y0, x1, y1) => t => ({ x: lerp(x0, x1, ease(clamp(t * 1.25, 0, 1))), y: lerp(y0, y1, ease(clamp(t * 1.25, 0, 1))), down: t < 0.8 }),
  tap: (x, y) => t => ({ x, y: y + (t < 0.4 ? 0 : 0), down: t > 0.2 && t < 0.45 }),
  circle: (cx, cy, r) => t => ({ x: cx + Math.cos(t * TAU - 1.5) * r, y: cy + Math.sin(t * TAU - 1.5) * r, down: true }),
  rub: (x, y, r) => t => ({ x: x + Math.sin(t * TAU * 2) * r, y: y + Math.sin(t * TAU * 4) * 10, down: true }),
  drag: (x0, y0, x1, y1) => t => t > 0.85 ? null : ({ x: lerp(x0, x1, ease(clamp((t - 0.15) / 0.6, 0, 1))), y: lerp(y0, y1, ease(clamp((t - 0.15) / 0.6, 0, 1))), down: t > 0.1 }),
};

// ---------- частинки ----------
const FX = {
  list: [],
  add(p) { this.list.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 1, age: 0, r: 4, col: '#E3B04B', rot: 0, vr: 0, kind: 'dot' }, p)); },
  burst(x, y, n, o = {}) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(o.smin || 80, o.smax || 260); this.add(Object.assign({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 120), g: o.g ?? 600, life: rnd(0.5, 1.1), r: rnd(3, 6), rot: rnd(0, TAU), vr: rnd(-8, 8) }, o)); } },
  update(dt) {
    for (const p of this.list) { p.age += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.floor && p.y > p.floor) { p.y = p.floor; p.vy *= -0.25; p.vx *= 0.6; } }
    this.list = this.list.filter(p => p.age < p.life);
  },
  draw() {
    for (const p of this.list) {
      const a = 1 - p.age / p.life; ctx.save(); ctx.globalAlpha = clamp(a * 1.5, 0, 1); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.kind === 'grain') { ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.6, p.r, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(120,70,20,.5)'; ctx.lineWidth = 1; ctx.stroke(); }
      else if (p.kind === 'puff') { ctx.fillStyle = p.col; ctx.globalAlpha *= 0.5 * (1 - p.age / p.life); ctx.beginPath(); ctx.arc(0, 0, p.r * (1 + p.age * 2), 0, TAU); ctx.fill(); }
      else if (p.kind === 'drop') { ctx.strokeStyle = p.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, 16); ctx.stroke(); }
      else if (p.kind === 'chaff') { ctx.fillStyle = p.col; ctx.fillRect(-p.r * 2, -p.r / 3, p.r * 4, p.r / 1.5); }
      else if (p.kind === 'word') { ctx.fillStyle = p.col; ctx.font = `900 ${p.r}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.strokeText(p.text, 0, 0); ctx.fillText(p.text, 0, 0); }
      else { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  },
  word(x, y, text, col = '#B32E1A') { this.add({ x, y, vy: -120, g: 0, life: 0.9, kind: 'word', text, r: 54, col }); },
};

// ---------- прогрес-бар дії (кругле кільце біля пальця або смужка) ----------
function meter(x, y, p, label) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,250,240,.9)'; ctx.beginPath(); ctx.roundRect(-160, -22, 320, 44, 22); ctx.fill();
  ctx.fillStyle = '#E3B04B'; ctx.beginPath(); ctx.roundRect(-154, -16, 308 * clamp(p, 0, 1), 32, 16); ctx.fill();
  if (label) { ctx.fillStyle = '#2A1A10'; ctx.font = '900 22px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 1); }
  ctx.restore();
}

// ---------- сцени ----------
// Сцена: { id, bgKey, enter(), update(dt,t), draw(t), pointer(type,p), fact } ; Scene.done() показує «Далі».
const Scene = {
  cur: null, alive: 0, list: [], idx: 0, onNext: null, t: 0,
  go(scene) {
    if (this.cur) Wipe.snap();
    if (this.cur && this.cur.leave) this.cur.leave();
    Timers.clear(); Voice.stop(); Sfx.rainStop(); Hint.clear(); FX.list = []; Sub.hide(); if (typeof Klas !== 'undefined') Klas.hide(); $('#big').hidden = true; $('#beat').hidden = true; $('#votes').hidden = true; $('#next').hidden = true; $('#factBtn').hidden = true;
    Mascot.set(scene.kPose || 'k01', 's01'); Mascot.sx = 1490; Mascot.sy = 600; Mascot.sStay = false; Mascot.sKeep = false; Mascot.dance = null; Mascot.resetLife(); Mascot.hideK = false; Pointer.cursor = null;
    this.alive++; this.cur = scene; this.t = 0; scene.t = 0;
    document.body.dataset.scene = scene.id || '';
    if (typeof renderTop === 'function') renderTop();
    Progress.render();
    const M = scene.music || (/^(intro|sivba|zhnyva|mlot|mlyn)$/.test(scene.id) ? 'mus_field' : /^(dizha|misyty|pidhid|forma|pich|stuk)$/.test(scene.id) ? 'mus_bakery' : scene.id === 'final' ? 'mus_final' : /^(lab|voices|case|fact)$/.test(scene.id) ? 'mus_lab' : 'mus_menu');
    if (M === 'none') Music.stop(); else Music.play(M, M !== 'mus_final');
    this.enterWhenReady(scene);
  },
  // які картинки малює сцена (пробний кадр) — чекаємо їх під «завісою», а не показуємо заглушки
  need(scene) {
    IMG_REC = new Set();
    try { ctx.save(); scene.draw && scene.draw(0); ctx.restore(); } catch (e) { try { ctx.restore(); } catch (e2) {} }
    if (!scene.noMascot) { IMG_REC.add(scene.kPose || 'k01'); IMG_REC.add('s01'); }
    const r = IMG_REC; IMG_REC = null; return r;
  },
  enterWhenReady(scene) {
    const a = this.alive, need = this.need(scene), veil = $('#veil'), t0 = performance.now();
    const start = () => {
      if (a !== this.alive) return; veil.hidden = true; scene._wait = false;
      scene.enter && scene.enter();
      if (typeof Lesson !== 'undefined' && Lesson.active && document.body.classList.contains('lesson-panel') && scene.noProg) Lesson.showNext();
    };
    if (Preload.ready(need)) return start();
    veil.hidden = false; scene._wait = true;
    const bar = $('#veilBar'), total = need.size;
    const wait = () => {
      if (a !== this.alive) return;
      const done = [...need].filter(k => IMG[k] && (IMG[k].ok || IMG[k].failed)).length;
      bar.style.width = Math.round(15 + 85 * done / Math.max(1, total)) + '%';
      if (Preload.ready(need) || performance.now() - t0 > 10000) { bar.style.width = '100%'; setTimeout(start, 150); } else setTimeout(wait, 120);
    };
    setTimeout(wait, 120);
  },
  done(opts = {}) {
    Hint.clear(); Sfx.ok();
    const s = this.cur;
    if (s.fact && FACTS[s.fact]) $('#factBtn').hidden = false;
    Timers.later(() => { $('#next').hidden = false; $('#nextLabel').textContent = opts.label || 'Далі'; }, opts.delay ?? 600);
  },
};
$('#next').addEventListener('click', () => { $('#next').hidden = true; Sfx.pop(); Scene.onNext && Scene.onNext(); });

// Ланцюжок сцен (Шлях зернини / Пекарня).
const Flow = {
  list: [], i: 0, name: '',
  start(name, list, i = 0) { this.name = name; this.list = list; this.i = i; Scene.onNext = () => this.next(); Scene.go(list[i]()); },
  next() { this.i++; if (this.i < this.list.length) Scene.go(this.list[this.i]()); else if (typeof Lesson !== 'undefined' && Lesson.active) Lesson.next(); else Menu.open(); },
};
const Progress = {
  render() {
    const el = $('#prog');
    if (!Flow.list.length || !Scene.cur || Scene.cur.id === 'menu' || Scene.cur.noProg) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = Flow.list.map((_, i) => `<i class="${i < Flow.i ? 'ok' : i === Flow.i ? 'now' : ''}"></i>`).join('');
  },
};

// ---------- цікавинка ----------
$('#factBtn').addEventListener('click', () => {
  const f = FACTS[Scene.cur.fact]; if (!f) return;
  const g = 'g' + State.grade;
  $('#factText').textContent = f[g].replace(/\s*\(F[\d, F]+\)\s*$/, '');
  $('#fact').hidden = false; Sfx.ding();
});
$('#factClose').addEventListener('click', () => { $('#fact').hidden = true; });

// ---------- клас і звук ----------
const GRADES = { 1: '1–4', 2: '5–7', 3: '8–11' };
function renderTop() {
  $('#gradeBtn').textContent = GRADES[State.grade] + ' клас';
  $('#homeLabel').textContent = Scene.cur && Scene.cur.id === 'menu' ? 'До набору' : 'До меню уроку';
  $('#soundBtn').textContent = State.sound ? '🔊' : '🔇';
  $('#soundBtn').setAttribute('aria-label', State.sound ? 'Вимкнути звук' : 'Увімкнути звук');
}
// Клас обирають у наборі (застосунок передає ?g=1|2|3), тут лише показуємо.
$('#soundBtn').addEventListener('click', () => { State.sound = !State.sound; Store.set('sound', State.sound); if (!State.sound) Voice.stop(); else Music.resume(); renderTop(); });
// Ієрархія: Набір (застосунок) → Урок на дошці (меню) → активність. «Назад» завжди на рівень вище.
$('#homeBtn').addEventListener('click', () => { Sfx.pop(); if (Scene.cur && Scene.cur.id === 'menu') location.href = '../app/#/pack/khlib'; else Menu.open(); });

// ---------- головний цикл ----------
let last = performance.now();
function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs; const t = nowMs / 1000;
  const s = Scene.cur;
  View.begin(); ctx.clearRect(-W, -H, W * 3, H * 3);
  if (s) {
    s.t += dt; if (typeof Mic !== 'undefined') Mic.update(t); Music.update(dt);
    if (!s._wait) s.update && s.update(dt, t);
    Mascot.update(dt); Hint.update(dt); FX.update(dt);
    s.draw && s.draw(t);
    FX.draw();
    if (!s.noMascot) Mascot.draw(t);
    s.drawTop && s.drawTop(t);
    if (Pointer.cursor && Pointer.inside !== false) Pointer.cursor(t);
    Hint.draw();
  }
  requestAnimationFrame(frame);
}
