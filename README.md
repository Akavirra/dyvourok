# Дивоурок

Інтерактивні уроки-свята для початкової школи. Статичний PWA + Cloudflare Pages Functions + D1.

## Структура
- `public/` — застосунок (HTML/CSS/JS без збирання), працює і з диска (`file://`, повний доступ — офлайн-архів)
  - `js/app.js` — екрани, маршрути (`#/pack/<id>/...`), доступ/демо, типи завдань (`cipher`, `order`, `words`, `pairs`, `quiz`)
  - `packs/<id>/pack.js` — дані набору; медіа й PDF поруч
  - `admin.html` — адмінка кодів (вхід за `ADMIN_TOKEN`)
  - `sw.js` — офлайн-кеш (після змін підняти `VERSION`)
- `functions/api/activate.js` — активація коду на пристрої → сесія в HttpOnly-кукі (30 днів)
- `functions/api/session.js` — оновлення сесії (POST) і вихід з пристрою (DELETE)
- `functions/api/admin/codes.js` — створення/список/блокування кодів
- `functions/packs/[[path]].js` — віддає відео й PDF лише з дійсною сесією (демо-файли відкриті)
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
```

## Публікація
```
npx wrangler d1 migrations apply dyvourok-db --remote
npx wrangler pages deploy
```
Секрети продакшену: `npx wrangler pages secret put SESSION_SECRET` / `ADMIN_TOKEN`.

## Новий набір
Папка `public/packs/<id>/` з `pack.js` → рядок `<script>` в `index.html` → публічні файли в `CORE` у `sw.js` → за потреби демо-файли в `PUBLIC` у `functions/packs/[[path]].js`.
