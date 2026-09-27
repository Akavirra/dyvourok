-- Передзамовлення з лендингу: хто хоче повну версію (перевірка попиту до старту продажів)
CREATE TABLE preorders (
  contact    TEXT PRIMARY KEY,               -- e-mail або Telegram/телефон, у нижньому регістрі
  name       TEXT NOT NULL DEFAULT '',
  grade      TEXT NOT NULL DEFAULT '',       -- '1-2' | '3-4' | 'інше'
  comment    TEXT NOT NULL DEFAULT '',
  source     TEXT NOT NULL DEFAULT '',       -- звідки прийшли (utm_source / ?from=)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
