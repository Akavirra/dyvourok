-- Коди доступу, які продаються вчителям
CREATE TABLE codes (
  code        TEXT PRIMARY KEY,              -- DYVO-XXXX-XXXX
  note        TEXT NOT NULL DEFAULT '',      -- покупець: ім'я / e-mail, для водяного знака і для тебе
  packs       TEXT NOT NULL DEFAULT '*',     -- '*' — усі набори, або 'mova,novyi-rik'
  max_devices INTEGER NOT NULL DEFAULT 3,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER,                       -- NULL — безстроково
  revoked     INTEGER NOT NULL DEFAULT 0
);

-- Пристрої, на яких активовано код (ліміт — codes.max_devices)
CREATE TABLE devices (
  code       TEXT NOT NULL REFERENCES codes(code),
  device_id  TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT '',
  first_seen INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL,
  PRIMARY KEY (code, device_id)
);
