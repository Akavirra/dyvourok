-- Облік продажів в адмінці. Усе лише для адмінки: покупцю й далі йдуть тільки codes.note і codes.packs.
ALTER TABLE codes ADD COLUMN hi TEXT NOT NULL DEFAULT '';        -- звертання в кличному відмінку для повідомлень («Надіє»)
ALTER TABLE codes ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE codes ADD COLUMN source TEXT NOT NULL DEFAULT '';    -- messenger | instagram | site | tiktok | other
ALTER TABLE codes ADD COLUMN grade TEXT NOT NULL DEFAULT '';     -- 1-4 | 5-7 | 8-11
ALTER TABLE codes ADD COLUMN amount INTEGER;                     -- ₴; NULL — звичайна ціна
ALTER TABLE codes ADD COLUMN paid_at INTEGER;                    -- мс; NULL — день створення коду
ALTER TABLE codes ADD COLUMN kind TEXT NOT NULL DEFAULT 'sale';  -- sale | gift | test (gift і test не йдуть у продажі)
UPDATE codes SET kind = 'test' WHERE note LIKE 'Власник%';

-- Статус заявки з сайту: new | written | paid | declined
ALTER TABLE preorders ADD COLUMN status TEXT NOT NULL DEFAULT 'new';
