// Стан вчителя, що синхронізується між пристроями: класи й прогрес квесту.
// {classes: {t, list: [{id, name, grade}]}, prog: {"<клас або ->|<набір>|<рівень>": {t, s: {<зупинка>: 1}}}}
// Злиття: для списку класів і для кожного ключа прогресу перемагає новіший запис (t, мс). Та сама логіка — у app.js (mergeState).
const newer = (a, b) => (!a ? b : !b ? a : (b.t || 0) > (a.t || 0) ? b : a);
const str = (v, max) => String(v ?? '').slice(0, max);

export function cleanState(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const out = { classes: null, prog: {} };
  if (s.classes && Array.isArray(s.classes.list)) {
    out.classes = {
      t: +s.classes.t || 0,
      list: s.classes.list.slice(0, 60).map(c => ({ id: str(c.id, 24), name: str(c.name, 40), grade: str(c.grade, 10) })).filter(c => c.id && c.name)
    };
  }
  const keys = Object.keys(s.prog || {}).slice(0, 600);
  for (const k of keys) {
    const e = s.prog[k];
    if (!e || typeof e !== 'object' || k.length > 100) continue;
    const stops = {};
    Object.keys(e.s || {}).slice(0, 40).forEach(id => { if (id.length <= 40) stops[id] = 1; });
    out.prog[k] = { t: +e.t || 0, s: stops };
  }
  return out;
}

export function mergeState(a, b) {
  const out = { classes: newer(a.classes, b.classes), prog: {} };
  for (const k of new Set([...Object.keys(a.prog || {}), ...Object.keys(b.prog || {})])) out.prog[k] = newer(a.prog[k], b.prog[k]);
  return out;
}
