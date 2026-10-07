-- Хто проходить демо: анонімно, без особистих даних. visitor — випадковий id пристрою з localStorage (dyvo_device).
-- Один рядок на відвідувача й подію: first_at — коли вперше, n — скільки разів.
CREATE TABLE demo_events (
  visitor  TEXT NOT NULL,
  event    TEXT NOT NULL,                    -- start | stop | play | half | end | task | done | locked | samples | want | code | preorder
  source   TEXT NOT NULL DEFAULT '',         -- звідки прийшли на сайт (?from= / utm_source / реферер)
  first_at INTEGER NOT NULL,
  last_at  INTEGER NOT NULL,
  n        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (visitor, event)
);
CREATE INDEX demo_events_first ON demo_events (first_at);
