# VetGlobal — интеграции со сторонними сервисами

Все внешние сервисы реализованы по паттерну **mock → live**: без кредов работают в
демо-режиме (лог/симуляция), на боевые переключаются переменными в `.env` — код
менять не нужно. Ниже — статус, расположение в коде, переменные и как получить ключи.

Легенда статуса: ✅ проверено вживую · ⚙️ протокол реализован по спецификации (нужны ключи) · 🟡 код готов, публичной песочницы нет.

---

## 1. Email (SMTP / SendGrid / Ethereal) — ✅

- **Код:** `backend/src/mail/mail.service.ts`, `notifications.service.ts`
- **Env:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- **Режимы:**
  - пусто → лог в консоль (dev);
  - `SMTP_HOST=ethereal` → **реальная отправка через Ethereal** (тестовый ящик nodemailer, без регистрации); в лог пишется `preview:`-ссылка на письмо;
  - `SMTP_HOST=smtp.sendgrid.net`, `SMTP_USER=apikey`, `SMTP_PASS=<API key>` → SendGrid;
  - любой другой SMTP (Gmail, Mailgun, корпоративный).
- **Проверено:** смена статуса заказа → реальное письмо с preview-ссылкой ethereal.email.
- **Прод-ключи:** зарегистрировать SendGrid (sendgrid.com) → создать API Key, либо взять SMTP-доступ у своего почтового провайдера.

## 2. Telegram-бот — ✅

- **Код:** `backend/src/telegram/telegram.service.ts` (grammy, long-polling), `telegram.i18n.ts`
- **Env:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` (опц.), `FRONTEND_URL`
- **Функции:** RU/UZ, поиск по каталогу, пошаговый сбор заявки → CRM (`Lead`), пинг админ-чата.
- **Проверено:** бот @vetglobaltg_bot поднят и залогинен (реальный токен от @BotFather).
- **Прод-ключи:** [@BotFather](https://t.me/BotFather) → `/newbot` → токен. Chat id — через @userinfobot.

## 3. SMS — Eskiz.uz — 🟡

- **Код:** `backend/src/sms/sms.service.ts`
- **Env:** `ESKIZ_BASE_URL` (`https://notify.eskiz.uz/api`), `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM` (по умолчанию `4546`)
- **Флоу:** `POST /auth/login` (email+password) → токен (кэшируется, ре-авторизация при 401) → `POST /message/sms/send` (`mobile_phone`, `message`, `from`).
- **Хуки:** смена статуса заказа и доставки → SMS покупателю.
- **Проверено:** запрос доходит до боевого API и принимается по формату; публичный тест-аккаунт `test@eskiz.uz` **более не действителен** (401). Нужны креды реального Eskiz-аккаунта.
- **Ключи:** регистрация на [eskiz.uz](https://eskiz.uz) → раздел «SMS-шлюз» даёт логин/пароль **шлюза** (не личного кабинета). Отправляемый текст должен быть одобрен как шаблон.
- Документация: [Postman](https://documenter.getpostman.com/view/663428/TVK5eMco).

## 4. Платежи — Payme (Merchant API) — ⚙️

- **Код:** `backend/src/payments/payme.service.ts`, эндпоинт `POST /api/payments/payme`
- **Env:** `PAYME_MERCHANT_ID` (для checkout-ссылки), `PAYME_KEY` («Key для системы» из кабинета — Basic-auth секрет)
- **Протокол:** JSON-RPC 2.0, Basic-auth `Paycom:KEY`. Методы: `CheckPerformTransaction`,
  `CreateTransaction`, `PerformTransaction`, `CancelTransaction`, `CheckTransaction`,
  `GetStatement`. Идентификация заказа — `params.account.order_id`; сумма в тийинах.
  Состояние транзакции хранится в `Payment.meta` (state 1/2/-1/-2).
- **Checkout-ссылка** строится в `providers.ts` (base64 `m=merchant;ac.order_id=..;a=<тийины>`).
- **Проверено локально:** bad auth → `-32504`, неверная сумма → `-31001`, create→perform→заказ CONFIRMED, CheckTransaction→state 2.
- **Ключи / песочница:** кабинет мерчанта Payme Business → «Key для системы»; песочница
  [test.paycom.uz](https://test.paycom.uz) **вызывает ваш эндпоинт** `/api/payments/payme`
  (нужен публичный URL — домен или туннель вроде ngrok).
- Документация: [developer.help.paycom.uz](https://developer.help.paycom.uz/metody-merchant-api/), [Песочница](https://developer.help.paycom.uz/pesochnitsa/).

## 5. Платежи — Click (Shop API) — ⚙️

- **Код:** `backend/src/payments/click.service.ts`, эндпоинты `POST /api/payments/click/prepare` и `/complete`
- **Env:** `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`
- **Протокол:** два вебхука — **Prepare** (`action=0`) и **Complete** (`action=1`).
  Подпись `sign_string`:
  - Prepare: `md5(click_trans_id + service_id + secret + merchant_trans_id + amount + action + sign_time)`
  - Complete: `md5(click_trans_id + service_id + secret + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)`
  `merchant_trans_id` = наш `Payment.id`. Коды ошибок: 0 ok, -1 подпись, -2 сумма, -4 уже оплачено, -6 нет транзакции, -9 отменено.
- **Проверено локально:** валидная подпись → `error 0`, неверная → `-1`, complete → заказ CONFIRMED.
- **Ключи / песочница:** кабинет Click Merchant (схема **Shop API**) → `service_id`, `merchant_id`, `secret_key`; Click вызывает ваши Prepare/Complete URL (нужен публичный URL).
- Документация: [docs.click.uz](https://docs.click.uz/en/), [Testing](https://docs.click.uz/en/click-api-testing/).

## 6. Платежи — UZUM Bank — 🟡

- **Код:** `providers.ts` (построитель ссылки — скелет), `PaymentsService`
- **Env:** `UZUM_MERCHANT_ID`
- **Статус:** checkout-URL как заглушка; точная схема и мерчант-API UZUM подключаются по договору с банком (публичной песочницы нет). `TODO(uzum-live)`.

## 7. ЭДО — Didox.uz — 🟡

- **Код:** `backend/src/didox/` (адаптеры `mock`/`live`), `eimzo/` (подпись)
- **Env:** `DIDOX_MODE` (`mock`|`live`), `DIDOX_BASE_URL` (тест `https://testapi3.didox.uz`, прод `https://api-partners.didox.uz`), `DIDOX_TOKEN`
- **Флоу:** заказ → счёт-фактура (`createFactura`) → отправка → статус (SENT→SIGNED). В live
  адаптере (`live.adapter.ts`) маппинг на `/v2/documents`; точные поля/коды статусов —
  `TODO(didox-live)` (уточняются по партнёрским докам под токен).
- **Проверено:** mock-флоу (send→SENT→sync→SIGNED, счёт помечается подписанным).
- **Ключи:** **партнёрский токен** выдаёт аккаунт-менеджер Didox — не self-service:
  [@Didox_account](https://t.me/Didox_account), +998 50 122 05 18. См. также память `didox-api`.
- Документация (SPA): [api-docs.didox.uz](https://api-docs.didox.uz/ru/home), [1С Postman](https://documenter.getpostman.com/view/7157122/TVsrEUYF).

## 8. E-imzo (ЭЦП) — 🟡

- **Код:** `backend/src/eimzo/`, фронт-хелпер `frontend/src/lib/eimzo.ts`
- **Флоу:** `GET /eimzo/prepare/:orderId` → данные для подписи → клиент подписывает через
  E-IMZO (CAPIWS, wss://127.0.0.1:64443) → `POST /eimzo/sign/:orderId` (PKCS#7) → в Didox.
- **Проверено:** mock (prepare→sign→SIGNED, подпись сохранена). Реальный флоу требует
  браузерного модуля E-IMZO и `e-imzo.min.js` (`TODO(eimzo-live)`). Docs: [e-imzo.uz](https://e-imzo.uz).

## 9. 1С / ERP синхронизация — ✅

- **Код:** `backend/src/sync/` — приём прайса по ключу продавца.
- **Флоу:** продавец генерит ключ в кабинете → `POST /api/sync/price` (JSON) или
  `/api/sync/price/xml` (CommerceML) с заголовком `X-Sync-Key` → обновление цены/остатков
  по `Product.externalId`.
- **Проверено:** JSON и CommerceML XML обновляют товары; неверный ключ → 401.
- «Ключи»: генерируются самим поставщиком в UI — внешних кредов не требуется.

---

## Как получить публичный URL для вебхуков (Payme/Click)

Payme и Click **вызывают ваш сервер**, поэтому для реальной песочницы нужен публичный HTTPS-URL:
- на проде — домен, указывающий на backend;
- локально — туннель: `ngrok http 8000`, затем в кабинете мерчанта указать
  `https://<ngrok>/api/payments/payme` (Payme) и `.../api/payments/click/{prepare,complete}` (Click).

## Сводка «что осталось для боевого запуска»

| Сервис | Что нужно |
|--------|-----------|
| Email | SendGrid API key **или** любой SMTP |
| Telegram | ✅ подключён |
| Eskiz | логин/пароль SMS-шлюза + одобренные шаблоны |
| Payme | `PAYME_KEY` из кабинета + публичный URL |
| Click | `CLICK_SERVICE_ID/SECRET_KEY` + публичный URL |
| UZUM | договор с банком |
| Didox | партнёрский токен от аккаунт-менеджера |
| E-imzo | браузерный модуль + сертификаты |
| 1С | ✅ ключ генерится в UI |
