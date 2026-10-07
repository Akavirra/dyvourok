-- Приватна нотатка до коду: контакт покупця, звідки прийшов, дата оплати. Бачить лише адмінка, на диплом не йде (на диплом — codes.note).
ALTER TABLE codes ADD COLUMN contact TEXT NOT NULL DEFAULT '';
