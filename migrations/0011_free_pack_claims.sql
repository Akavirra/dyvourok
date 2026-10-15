-- Безкоштовні набори, які вчитель свідомо додав до свого акаунта.
-- Це окремо від codes: безкоштовне отримання не є продажем і не потребує коду.
CREATE TABLE user_packs (
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id          TEXT NOT NULL,
  claimed_at       INTEGER NOT NULL,
  source           TEXT NOT NULL DEFAULT '',
  grade            TEXT NOT NULL DEFAULT '',
  last_opened_at   INTEGER,
  open_count       INTEGER NOT NULL DEFAULT 0,
  last_download_at INTEGER,
  download_count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, pack_id)
);

CREATE INDEX user_packs_pack_claimed ON user_packs (pack_id, claimed_at);
CREATE INDEX user_packs_user ON user_packs (user_id);
