-- Кабінет вчителя: класи й прогрес (синхронізація між пристроями), школа для грамот, згода на розсилку.
ALTER TABLE users ADD COLUMN state TEXT NOT NULL DEFAULT '{}';   -- {classes: {t, list}, prog: {ключ: {t, s}}} — див. lib/state.js
ALTER TABLE users ADD COLUMN school TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN news INTEGER;                        -- NULL — ще не питали, 1 — погодився на листи, 0 — відмовився
ALTER TABLE users ADD COLUMN news_at INTEGER;                     -- коли дав або відкликав згоду
