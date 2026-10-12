# Дивоурок

Інтерактивні уроки-свята для 1–11 класів. Статичний PWA + Cloudflare Pages Functions + D1.

## Структура
- `public/` — застосунок (HTML/CSS/JS без збирання), працює і з диска (`file://`, повний доступ — офлайн-архів)
  - `js/app.js` — екрани, маршрути (`#/pack/<id>/...`), доступ/демо, типи завдань (`cipher`, `order`, `words`, `pairs`, `quiz`)
  - `packs/<id>/pack.js` — дані набору; медіа й PDF поруч
  - `admin.html` — адмінка кодів (вхід за `ADMIN_TOKEN`)
  - `sw.js` — офлайн-кеш (після змін підняти `VERSION`)
- `functions/api/activate.js` — активація коду на пристрої → сесія в HttpOnly-кукі (30 днів)
- `functions/api/session.js` — оновлення сесії (POST) і вихід з пристрою (DELETE)
- Акаунти (`lib/account.js`, міграція `0006_accounts.sql`): вхід через Google або 6-значним кодом/посиланням з пошти, без паролів.
  Доступ акаунта = усі коди, прив'язані до нього (`codes.user_id`); код, у якого в адмінці вказано e-mail, прив'язується сам, щойно людина увійде з цією поштою.
  Якщо на пристрої була сесія коду, при вході код переходить в акаунт, а місце пристрою звільняється. Коди без акаунта працюють як раніше.
  - `functions/api/auth/google.js` + `google/callback.js` — OAuth Google; `auth/email.js` — лист з кодом (Resend); `auth/verify.js` — перевірка коду/посилання; `auth/config.js` — які способи входу ввімкнено
  - `functions/api/me.js` — дані акаунта, прив'язка коду, ім'я
- `functions/api/admin/codes.js` — створення/список/блокування кодів
- `functions/api/preorder.js` — заявка «Хочу повну версію» з лендингу (таблиця `preorders`)
- `functions/api/admin/preorders.js` — список і видалення заявок (блок «Передзамовлення» в `/admin`)
- `functions/packs/[[path]].js` — віддає відео й PDF лише з дійсною сесією (демо-файли відкриті)
- `subs/<набір>/*.vtt` — субтитри мультфільмів (у кадрі їх немає); `python scripts/embed_subs.py` вбудовує їх у `pack.js` (поле `subs`), плеєр в `app.js` показує за бажанням
- `lib/auth.js` — підпис сесій (HMAC-SHA256), генерація кодів `DYVO-XXXX-XXXX`
- `migrations/` — схема D1

## Локально
```
npx wrangler d1 migrations apply dyvourok-db --local
npx wrangler pages dev --port 5173
```
Потрібен файл `.dev.vars` (не в git):
```
SESSION_SECRET=<випадковий рядок>
ADMIN_TOKEN=<пароль адмінки>
# необов'язково локально: без RESEND_API_KEY код входу з пошти друкується в консоль wrangler і показується на екрані
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
```

## Публікація
```
npx wrangler d1 migrations apply dyvourok-db --remote
npx wrangler pages deploy
```
Секрети продакшену: `npx wrangler pages secret put SESSION_SECRET` / `ADMIN_TOKEN` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `RESEND_API_KEY` (необов'язково `MAIL_FROM`, типово `Дивоурок <vhid@dyvourok.com.ua>`).
Google: адреса повернення `https://dyvourok.com.ua/api/auth/google/callback`. Поки ключів Google немає, кнопка Google у застосунку схована.

## Новий набір
Папка `public/packs/<id>/` з `pack.js` → рядок `<script>` в `index.html` → публічні файли в `CORE` у `sw.js` → за потреби демо-файли в `PUBLIC` у `functions/packs/[[path]].js`.
