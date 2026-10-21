-- Завантаження безкоштовних PDF з каталогу /materialy: лічильник по днях і джерелах (без даних про людей).
CREATE TABLE downloads (
  slug   TEXT NOT NULL,
  day    TEXT NOT NULL,              -- YYYY-MM-DD за Києвом
  source TEXT NOT NULL DEFAULT '',
  n      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (slug, day, source)
);
