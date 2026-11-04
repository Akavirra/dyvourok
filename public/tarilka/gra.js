// Продукти — ті самі 40 карток набору (без борщу: це страва з різних груп). Групи й поради — за F01, F03, F07, F09, F12, F18 з DZHERELA.md.
const F = {
  veg: [['carrot','Морква'],['cucumber','Огірок'],['tomato','Помідор'],['pepper','Перець'],['cabbage','Капуста'],['beet','Буряк'],
        ['broccoli','Броколі'],['pumpkin','Гарбуз'],['apple','Яблуко'],['pear','Груша'],['banana','Банан'],['grapes','Виноград'],
        ['plum','Слива'],['blueberry','Чорниці'],['onion','Цибуля']],
  grain: [['oatmeal','Вівсянка'],['buckwheat','Гречана каша'],['bread','Цільнозерновий хліб'],['rice','Бурий рис']],
  prot: [['fish','Запечена риба'],['chicken','Курка'],['eggs','Яйця'],['beans','Квасоля'],['lentils','Сочевиця'],
         ['nuts','Волоські горіхи'],['kefir','Кефір'],['cottage','Кисломолочний сир']],
  water: [['water','Склянка води'],['bottle','Пляшка води']],
  sweetdrink: [['juice','Сік'],['soda','Солодка газована вода']],
  rare: [['sausage','Ковбаса'],['hotdog','Сосиски'],['bun','Булка з глазур\'ю'],['donut','Пончик'],['crisps','Чипси']],
  potato: [['potato','Картопля']], oil: [['oil','Олія']],
};
const GROUP = {}, NAME = {};
for (const g in F) for (const [s, n] of F[g]) { GROUP[s] = g; NAME[s] = n; }
const DRINK = new Set(['water', 'bottle', 'juice', 'soda']);
const CAP = {veg: 5, grain: 2, prot: 2, cup: 1};
const ZNAME = {veg: '«Овочі й фрукти»', grain: '«Каші, цільнозернове»', prot: '«Білок»'};
const $ = id => document.getElementById(id);
const shuffle = a => { for (let k = a.length - 1; k > 0; k--) { const j = Math.random() * (k + 1) | 0; [a[k], a[j]] = [a[j], a[k]]; } return a; };
const pick = (g, n) => shuffle(F[g].slice()).slice(0, n).map(x => x[0]);

let sel = null, toastT = 0;
function toast(t) { const e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => e.hidden = true, 2600); }

function deal() {
  const items = shuffle([...pick('veg', 5), ...pick('grain', 2), ...pick('prot', 3), pick('water', 1)[0], pick('sweetdrink', 1)[0],
                         ...pick('rare', 2), 'potato', 'oil']);
  document.querySelectorAll('.zone .item').forEach(e => e.remove());
  $('shelf').innerHTML = items.map(s => `<div class="item" data-s="${s}" role="button" tabindex="0" aria-label="${NAME[s]}"><img src="img/${s}.webp" alt=""><span>${NAME[s]}</span></div>`).join('');
  select(null);
}
function select(el) {
  document.querySelectorAll('.shelf .item.sel').forEach(e => e.classList.remove('sel'));
  sel = el; if (el) el.classList.add('sel');
  $('plate').classList.toggle('picking', !!el);
}
function place(s, z) {
  const zone = document.querySelector(`.zone[data-z="${z}"]`);
  if (zone.querySelectorAll('.item').length >= CAP[z]) { toast(z === 'cup' ? 'Склянка вже повна — спершу прибери напій' : 'Тут уже немає місця. Прибери щось, торкнувшись продукту'); return false; }
  if (z === 'cup' && !DRINK.has(s) && s !== 'kefir') { toast('У склянку — лише напій'); return false; }
  if (z !== 'cup' && DRINK.has(s)) { toast('Напій постав у склянку поруч з тарілкою'); return false; }
  const el = document.createElement('div');
  el.className = 'item'; el.dataset.s = s; el.title = NAME[s];
  el.innerHTML = `<img src="img/${s}.webp" alt="${NAME[s]}">`;
  zone.appendChild(el);
  document.querySelector(`.shelf .item[data-s="${s}"]`).classList.add('used');
  return true;
}
function unplace(el) {
  document.querySelector(`.shelf .item[data-s="${el.dataset.s}"]`).classList.remove('used');
  el.remove();
}

// перетягування + торкання
let drag = null;
document.addEventListener('pointerdown', e => {
  const it = e.target.closest('.item'); if (!it) return;
  drag = {it, x: e.clientX, y: e.clientY, moved: false, ghost: null, fromShelf: !!it.closest('.shelf')};
});
document.addEventListener('pointermove', e => {
  if (!drag || !drag.fromShelf || drag.it.classList.contains('used')) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
  if (!drag.moved) {
    drag.moved = true; select(null); $('plate').classList.add('picking');
    drag.ghost = document.createElement('div'); drag.ghost.className = 'ghost';
    drag.ghost.innerHTML = `<img src="img/${drag.it.dataset.s}.webp" alt="">`; document.body.appendChild(drag.ghost);
  }
  drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
  const z = zoneAt(e.clientX, e.clientY);
  document.querySelectorAll('.zone').forEach(q => q.classList.toggle('hot', q === z));
});
document.addEventListener('pointerup', e => {
  if (!drag) return;
  const d = drag; drag = null;
  document.querySelectorAll('.zone.hot').forEach(q => q.classList.remove('hot'));
  if (d.moved) {
    d.ghost.remove(); $('plate').classList.remove('picking');
    const z = zoneAt(e.clientX, e.clientY);
    if (z) place(d.it.dataset.s, z.dataset.z);
    return;
  }
  if (d.fromShelf) { if (!d.it.classList.contains('used')) select(sel === d.it ? null : d.it); }
  else unplace(d.it);
});
document.addEventListener('pointercancel', () => { if (drag && drag.ghost) drag.ghost.remove(); drag = null; $('plate').classList.remove('picking'); });
function zoneAt(x, y) { const el = document.elementFromPoint(x, y); return el && el.closest('.zone'); }
$('plate').addEventListener('click', e => {
  if (!sel || !e.target.isConnected || e.target.closest('.zone .item')) return;
  const z = e.target.closest('.zone');
  if (!z) { toast('Торкнися потрібної частини тарілки або склянки'); return; }
  if (place(sel.dataset.s, z.dataset.z)) select(null);
});
$('shelf').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('item')) { e.preventDefault(); select(e.target); } });

function inZone(z) { return [...document.querySelectorAll(`.zone[data-z="${z}"] .item`)].map(e => e.dataset.s); }
function check() {
  const out = [], bad = new Set();
  const add = (ok, t, s) => { out.push({ok, t}); if (!ok && s) bad.add(s); };
  const all = [...inZone('veg'), ...inZone('grain'), ...inZone('prot')];
  if (!all.length && !inZone('cup').length) { toast('Спершу поклади щось на тарілку'); return; }
  // продукти не на своєму місці
  for (const z of ['veg', 'grain', 'prot']) for (const s of inZone(z)) {
    const g = GROUP[s];
    if (g === 'potato') add(z !== 'veg', z === 'veg' ? 'Картопля смачна, але на тарілці вона не рахується як овоч. Переклади її, а в половину додай овочі.'
                                                       : 'Картопля смачна, але овочем на тарілці не рахується — тому овочі додаємо окремо.', z === 'veg' ? s : null);
    else if (g === 'rare') add(false, `${NAME[s]} — їжа «час від часу», а ми збираємо обід на щодень. Прибери її й обери щось інше.`, s);
    else if (g === 'oil') add(true, 'Трохи олії — можна. Головне — трохи.');
    else if (g !== z) add(false, `${NAME[s]}: це з групи ${ZNAME[g]}. Переклади в іншу частину тарілки.`, s);
  }
  const cnt = g => all.filter(s => GROUP[s] === g).length;
  const v = inZone('veg').filter(s => GROUP[s] === 'veg').length;
  if (v >= 2) add(true, v >= 3 ? 'Половина тарілки — овочі й фрукти, та ще й різні. Що більше кольорів, то краще!' : 'Половина тарілки — овочі й фрукти. Чудово!');
  else add(false, 'Додай овочів або фруктів: вони займають половину тарілки (хоча б 2 продукти).');
  if (inZone('grain').some(s => GROUP[s] === 'grain')) add(true, 'Є каша або цільнозерновий хліб — вони дають енергію.');
  else add(false, 'Додай кашу, бурий рис або цільнозерновий хліб — це чверть тарілки.');
  if (inZone('prot').some(s => GROUP[s] === 'prot')) add(true, 'Є білок — він «будує» тіло: риба, курка, яйця, квасоля, сир.');
  else add(false, 'Додай білок: рибу, курку, яйця, квасолю, сочевицю чи сир.');
  const d = inZone('cup')[0];
  if (!d) add(false, 'Постав поруч склянку води — це найкращий напій від спраги.');
  else if (GROUP[d] === 'water') add(true, 'Вода — найкращий напій від спраги.');
  else if (d === 'juice') add(false, 'У соках є цукор, тож сік — «час від часу». До обіду обери воду.', d);
  else if (d === 'soda') add(false, 'Солодка газована вода — не для щоденного вибору. Найкраще тамує спрагу вода.', d);
  else if (d === 'kefir') add(false, 'Кефір — смачний і корисний, але спрагу найкраще тамує вода.', d);

  document.querySelectorAll('.zone .item').forEach(e => e.classList.toggle('bad', bad.has(e.dataset.s)));
  const fails = out.filter(x => !x.ok).length;
  const stars = fails === 0 ? 3 : fails <= 2 ? 2 : 1;
  $('rh').textContent = fails === 0 ? 'Збалансований обід!' : fails <= 2 ? 'Майже! Ще трохи' : 'Добрий початок';
  $('stars').innerHTML = [1, 2, 3].map(n => `<span class="${n <= stars ? '' : 'off'}">⭐</span>`).join('');
  out.sort((a, b) => a.ok - b.ok);
  $('checks').innerHTML = out.map(x => `<li class="${x.ok ? 'ok' : 'no'}"><i>${x.ok ? '✓' : '!'}</i><span>${x.t}</span></li>`).join('');
  $('fix').hidden = fails === 0;
  $('result').hidden = false;
}
$('check').onclick = check;
$('fix').onclick = () => $('result').hidden = true;
$('again').onclick = () => { $('result').hidden = true; deal(); };
$('new').onclick = deal;
$('clear').onclick = () => document.querySelectorAll('.zone .item').forEach(unplace);
$('result').addEventListener('click', e => { if (e.target === $('result')) $('result').hidden = true; });
deal();
