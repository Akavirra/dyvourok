/* Звуки інтерфейсу — синтез у WebAudio, та сама пентатоніка ре-мажору, що й у звуковому логотипі. */
(function () {
  const NOTE = { D4: 293.66, A4: 440, D5: 587.33, E5: 659.26, 'F#5': 739.99, A5: 880, B5: 987.77, D6: 1174.66, E6: 1318.51, 'F#6': 1479.98 };
  let ctx = null, master = null;
  let on = true;
  try { on = localStorage.getItem('dyvo_sound') !== 'off'; } catch (e) {}

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return true;
  }

  function kalimba(f, when = 0, vol = 0.35, dur = 1.0) {
    if (!on || !init()) return;
    const t = ctx.currentTime + when;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(master);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(vol * 0.2, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    g2.connect(master);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 5.43; o2.connect(g2);
    o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + 0.2);
  }

  function bell(f, when = 0, vol = 0.25, dur = 2.2) {
    if (!on || !init()) return;
    [[1, 1], [2.76, 0.4], [5.4, 0.12]].forEach(([p, a]) => kalimba(f * p, when, vol * a, dur / p + 0.3));
  }

  function thud(when = 0, vol = 0.5) {
    if (!on || !init()) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.18);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.32);
  }

  const S = {
    unlock() { if (init() && ctx.state === 'suspended') ctx.resume(); },
    tap() { kalimba(NOTE.A5, 0, 0.12, 0.35); },
    pick(i = 0) { const n = [NOTE.D5, NOTE.E5, NOTE['F#5'], NOTE.A5, NOTE.B5, NOTE.D6]; kalimba(n[i % n.length], 0, 0.3, 0.8); },
    wrong() { thud(0, 0.35); },
    right() { [NOTE.D5, NOTE['F#5'], NOTE.A5].forEach((f, i) => kalimba(f, i * 0.07, 0.3, 0.9)); },
    letter() { [NOTE.A5, NOTE.B5, NOTE.D6, NOTE.E6, NOTE['F#6']].forEach((f, i) => bell(f, i * 0.08, 0.12, 1.4)); bell(NOTE.D5, 0.45, 0.3); kalimba(NOTE.D4, 0.45, 0.35, 1.4); },
    bloom() { [NOTE.D5, NOTE['F#5'], NOTE.A5, NOTE.D6, NOTE['F#6']].forEach((f, i) => kalimba(f, 0.36 + i * 0.075, 0.18, 0.8)); bell(NOTE.D5, 1.02, 0.3); bell(NOTE.A5, 1.02, 0.2); },
    win() { thud(0, 0.4); thud(0.32, 0.55); [NOTE.D5, NOTE['F#5'], NOTE.A5, NOTE.D6, NOTE['F#6'], NOTE.A5 * 2].forEach((f, i) => bell(f, 0.6 + i * 0.09, 0.14, 1.8)); bell(NOTE.D5, 1.2, 0.35, 2.8); },
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('dyvo_sound', on ? 'on' : 'off'); } catch (e) {} return on; }
  };
  window.Sfx = S;
})();
