-- Оголошення в застосунку (дзвіночок і банер). Створюються в адмінці.
CREATE TABLE announcements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',     -- звичайний текст, переноси рядків зберігаються
  button_label TEXT NOT NULL DEFAULT '',
  button_url   TEXT NOT NULL DEFAULT '',     -- '#/pack/mova' (у застосунку) або https://…
  audience     TEXT NOT NULL DEFAULT 'all',  -- all | buyers (є набір) | demo (без набору)
  grades       TEXT NOT NULL DEFAULT '',     -- '' — усім; '1-4,5-7' — лише тим, хто працює з цими версіями
  important    INTEGER NOT NULL DEFAULT 0,   -- 1 — банер у бібліотеці й на сторінці набору, доки не закриють
  starts_at    INTEGER NOT NULL,
  ends_at      INTEGER,                      -- NULL — без кінця
  hidden       INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

-- Хто бачив / прочитав / натиснув кнопку. viewer: 'u:<id акаунта>' або 'd:<id пристрою>'.
CREATE TABLE announcement_views (
  ann_id     INTEGER NOT NULL,
  viewer     TEXT NOT NULL,
  seen_at    INTEGER,
  read_at    INTEGER,
  clicked_at INTEGER,
  PRIMARY KEY (ann_id, viewer)
);
