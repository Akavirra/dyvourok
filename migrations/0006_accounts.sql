-- Акаунти вчителів: вхід через Google або кодом з пошти. Доступ до наборів — через коди, прив'язані до акаунта (codes.user_id).
-- Коди без акаунта працюють як раніше (activate.js, ліміт пристроїв).
CREATE TABLE users (
  id         TEXT PRIMARY KEY,                -- випадковий id
  email      TEXT NOT NULL UNIQUE,            -- у нижньому регістрі
  name       TEXT NOT NULL DEFAULT '',
  google_sub TEXT UNIQUE,                     -- id акаунта Google, якщо входили через Google
  created_at INTEGER NOT NULL,
  last_login INTEGER NOT NULL
);

-- Сесії акаунтів: рядок на кожен вхід (пристрій). Видалення рядка = вихід / відкликання.
CREATE TABLE user_sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  label      TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL
);
CREATE INDEX user_sessions_user ON user_sessions (user_id);

-- Одноразовий вхід з пошти: 6-значний код і посилання (зберігаються лише хеші). Один активний запит на адресу.
CREATE TABLE login_codes (
  email      TEXT PRIMARY KEY,
  code_hash  TEXT NOT NULL,
  link_hash  TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  sent_at    INTEGER NOT NULL,
  hour_start INTEGER NOT NULL,                -- вікно ліміту відправок
  hour_sent  INTEGER NOT NULL DEFAULT 1
);

-- Ліміт листів з однієї IP-адреси (щоб форму не використали для розсилки)
CREATE TABLE login_ips (
  ip         TEXT PRIMARY KEY,
  hour_start INTEGER NOT NULL,
  n          INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE codes ADD COLUMN user_id TEXT;      -- акаунт, до якого прив'язано код
CREATE INDEX codes_user ON codes (user_id);
