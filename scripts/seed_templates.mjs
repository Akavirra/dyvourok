// Одноразово: шаблони відповідей зі сторінки den-movy/social/out/«Шаблони відповідей Дивоурок — оновлено.html»
// → migrations/0009_reply_templates.sql (таблиця + початкові шаблони). Змінні частини стають плейсхолдерами,
// які адмінка підставляє сама: {price}, {price_note}, {link}, {howto}, {wish}, {follow} …
// Запуск: node scripts/seed_templates.mjs
import fs from 'node:fs';

const SRC = 'C:/CProjects/11/den-movy/social/out/Шаблони відповідей Дивоурок — оновлено.html';
const html = fs.readFileSync(SRC, 'utf8');
const start = html.indexOf('const SECTIONS = [');
const end = html.indexOf('\n];', start) + 3;
const PRICE = '{price}', PRICE_NOTE = '{price_note}', LINK = '{link}', APP = '{app}', MAIL = '{mail}',
  HOWTO = '{howto}', WISH = '{wish}', FOLLOW = '{follow}';
const SECTIONS = new Function('PRICE', 'PRICE_NOTE', 'LINK', 'APP', 'MAIL', 'HOWTO', 'WISH', 'FOLLOW',
  html.slice(start, end) + '\nreturn SECTIONS;')(PRICE, PRICE_NOTE, LINK, APP, MAIL, HOWTO, WISH, FOLLOW);

const PRICE_SWITCH = Date.parse('2026-10-20T00:00:00+03:00');   // шаблони «лише до 19.10» ховаються самі
const q = s => s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'";
const now = Date.now();
const rows = [];
let sort = 0;
for (const sec of SECTIONS) {
  for (const it of sec.items) {
    sort += 10;
    rows.push(`(${[q(sec.title), q(it.t), q(it.ch), q(it.when || ''), q(it.n || ''), q(it.s || ''), q(it.x), it.earlyOnly ? PRICE_SWITCH : 'NULL', sort, now, now].join(', ')})`);
  }
}

const sql = `-- Шаблони відповідей покупцям (адмінка → «Повідомлення»). Редагуються в адмінці.
-- Плейсхолдери в тексті: {hi} {name} {code} {email} — дані клієнта; {card} {owner} {paylink} {sign} — реквізити (admin_settings);
-- {price} {price_note} {link} {app} {mail} {howto} {wish} {follow} — підставляє адмінка.
CREATE TABLE reply_templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  section    TEXT NOT NULL,
  title      TEXT NOT NULL,
  channel    TEXT NOT NULL DEFAULT 'msg',   -- msg (Messenger) | mail (лист) | com (коментар)
  hint       TEXT NOT NULL DEFAULT '',      -- коли надсилати
  note       TEXT NOT NULL DEFAULT '',      -- застереження для себе
  subject    TEXT NOT NULL DEFAULT '',      -- тема листа
  body       TEXT NOT NULL DEFAULT '',
  show_until INTEGER,                       -- після цієї миті шаблон ховається (NULL — завжди)
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Дрібні налаштування адмінки (реквізити для шаблонів тощо)
CREATE TABLE admin_settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL DEFAULT ''
);

INSERT INTO reply_templates (section, title, channel, hint, note, subject, body, show_until, sort, created_at, updated_at) VALUES
${rows.join(',\n')};
`;
fs.writeFileSync(new URL('../migrations/0009_reply_templates.sql', import.meta.url), sql);
console.log(rows.length + ' templates');
