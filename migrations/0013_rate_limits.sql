-- Прості ліміти на публічні форми (заявка на покупку тощо): лічильник за ключем у годинному вікні.
CREATE TABLE rate_limits (
  key          TEXT PRIMARY KEY,       -- напр. 'preorder:<ip>'
  window_start INTEGER NOT NULL,
  n            INTEGER NOT NULL DEFAULT 0
);
