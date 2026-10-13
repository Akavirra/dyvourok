-- Сесії адмінки (вхід через Google, лише пошти з ADMIN_EMAILS). Рядок видалено — сесію відкликано.
CREATE TABLE admin_sessions (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL
);
