# VetGlobal — B2B-маркетплейс ветеринарных решений

Цифровая B2B-платформа, объединяющая производителей, дистрибьюторов и оптовых
покупателей (птицефабрики, фермы КРС, ветклиники, ветаптеки). Прозрачные закупки
препаратов, вакцин, кормов и добавок напрямую от проверенных поставщиков —
с юридически значимым циклом сделки, лояльностью и аналитикой.

Монетизация: транзакционная комиссия **10–12%**, лояльность **VetPoints**, продвижение брендов.

## Стек

| Слой | Технология |
|------|-----------|
| Backend | **NestJS** (TypeScript) + **Prisma** |
| БД | **PostgreSQL 16** |
| Хранилище файлов | **MinIO** (S3-совместимое) — фото товаров, PDF-сертификаты |
| Frontend | **Next.js 14** (App Router) + Tailwind + i18n (RU/UZ) + recharts |
| Документы | PDF-счета (pdfkit + кириллический шрифт), Excel (exceljs) |
| Auth | JWT (Passport) + bcrypt, роли buyer / seller / admin |
| Тесты | Jest e2e (13 тестов против живого API) |

`legacy/` — исходный прототип (FastAPI + React CRA + MongoDB), оставлен как эталон.

## Быстрый старт (dev)

Нужен только **Docker Desktop**.

```bash
cp .env.example .env
docker compose up --build
```

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
| Swagger | http://localhost:8000/api/docs |
| MinIO Console | http://localhost:9001 |

При старте backend автоматически применяет схему (`prisma db push`) и заполняет
демо-данные (`prisma seed`): 4 поставщика, 3 покупателя, 26 товаров с картинками,
отзывы/рейтинги, 28 исторических заказов (для графиков), 9 статей блога.

### Демо-аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| Админ | admin@vetglobal.com | admin123 |
| Поставщик | seller@vetglobal.com | seller123 |
| Покупатель | buyer@vetglobal.com | buyer123 |

## Возможности

**Публичное:** каталог (фасетные фильтры, поиск, пагинация, сортировка), карточка
товара (галерея, PDF-сертификаты, аналоги, отзывы, избранное), корзина + checkout
(списание VetPoints, выбор контрагента), акции, проверенные поставщики (+профиль),
блог (RU/UZ, SEO-slug), ветконсультация, вход/регистрация, **тёмная тема**, адаптив.

**Кабинет покупателя:** заказы + страница заказа с таймлайном статусов, оплата,
счета PDF, баланс/история VetPoints, избранное, мультиконтрагенты (ИНН/МФО/р.счёт),
графики трат по месяцам и категориям, Excel-экспорт.

**Кабинет продавца:** PIM (товары, загрузка фото/сертификатов, код 1С), заказы
(статусы, ЭДО, доставка), акции, синхронизация 1С (ключ + endpoint), графики,
ЭЦП-подпись документов.

**Админка:** обзор + графики, **биллинг** (комиссии/выплаты по поставщикам + Excel),
заявки CRM (из бота и веб-формы), ветконсультации, пользователи (верификация/бан),
модерация отзывов, редактор блога.

### Интеграции (переключатель mock → live через `.env`)

Все внешние сервисы работают в **mock-режиме без кредов** (демо/логи в консоль) и
включаются на реальные одной переменной. Незакрытые места помечены `TODO(*-live)`.

| Интеграция | Переменные | mock → live |
|-----------|-----------|-------------|
| **Didox ЭДО** (счета-фактуры) | `DIDOX_MODE`, `DIDOX_BASE_URL`, `DIDOX_TOKEN` | mock подписывает симуляцией; live — /v2/documents |
| **E-imzo** (ЭЦП) | — | подпись PKCS#7 → Didox |
| **Платежи** Click/Payme/UZUM | `PAYMENTS_MODE`, `CLICK_*`, `PAYME_MERCHANT_ID`, `UZUM_MERCHANT_ID` | live строит реальные checkout-URL |
| **SMS** Eskiz.uz | `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM` | статусы заказа/доставки |
| **Email** SMTP/SendGrid | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | заказы, заявки, консультации |
| **Telegram-бот** (RU/UZ) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` | поиск + заявки в CRM |
| **1С/ERP** | ключ продавца (в кабинете) | `POST /sync/price` (JSON) и `/sync/price/xml` (CommerceML) |

## Тесты

```bash
docker compose exec backend npm run test:e2e
```

13 e2e-тестов: health, каталог + пагинация, auth всех ролей, RBAC, заказы
(комиссия + VetPoints), мин. заказ, избранное, биллинг, акции.

## Продакшн

Multi-stage сборка (slim runtime, Next standalone):

```bash
cp .env.example .env   # задайте секреты, JWT_SECRET, боевые URL и креды
docker compose -f docker-compose.prod.yml up --build -d
```

## Структура

```
backend/    NestJS API
  src/      auth, users, categories, products, orders, vetpoints, reviews,
            promotions, blog, analytics(+billing), storage, documents, mail,
            sms, telegram, leads, didox, delivery, consulting, payments, sync,
            eimzo, favorites
  prisma/   schema.prisma + seed.ts
  test/     e2e
frontend/   Next.js (App Router): каталог, товар, корзина, кабинеты, блог, …
docker-compose.yml          dev
docker-compose.prod.yml     prod
legacy/     исходный прототип (reference only)
```

## Дорожная карта (для боевого запуска нужны внешние доступы)

- Заполнить `TODO(*-live)`: реальный payload/статусы Didox, верификация вебхуков
  Click/Payme, CAPIWS-флоу E-IMZO, схема UZUM.
- Логистика: интеграция со службами доставки; финтех: B2B-рассрочка через банки.
- SSR-метаданные и sitemap для полного SEO блога.
