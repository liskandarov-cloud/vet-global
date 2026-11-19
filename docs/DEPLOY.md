# Деплой и эксплуатация VetHub

Сначала — как устроен и обслуживается боевой контур. Ниже — запасная схема
на своём сервере (docker compose), сейчас не используется.

## Боевой контур

| Контур | Где | Выкатка |
|---|---|---|
| Сайт https://vethub.uz | Cloudflare Workers, воркер `vethub-web` (OpenNext), кэш ISR в KV | Actions «Deploy frontend» по пушу в `main` с изменениями в `frontend/**` |
| API https://api.vethub.uz | Render, сервис `vethub-api`, free, Oregon; домен через прокси Cloudflare | автодеплой Render из `main` |
| База | Supabase, проект `vethub`, us-west-2; подключение только через session-пулер, порт 5432 | — |
| Файлы (фото, лицензии) | в самой базе, отдаются через `/api/files/:id` — пока не задан `S3_ENDPOINT` | — |
| Бэкап | Actions «Backup database», ночью в 02:30 UTC; дамп зашифрован | — |
| Мониторинг | Actions «Uptime» каждые 30 минут: доступность и версия прода; при сбое — issue с меткой `outage` | — |

Бесплатный Render даёт 750 часов в месяц на всё пространство, а keepalive
держит `vethub-api` включённым круглосуточно (до 744 часов). Второй бесплатный
сервис в этом пространстве исчерпает лимит, и Render приостановит оба.

### Какой код сейчас на проде

```bash
curl -s https://api.vethub.uz/api/health   # поле commit
curl -s https://vethub.uz/__version        # поле sha
```

При упавшей выкатке прод продолжает отвечать 200 прежним кодом, поэтому
`/api/health` со статусом ok ещё не значит «выкачено». Uptime сверяет оба
значения с `main` и открывает issue, если контур отстаёт дольше 40 минут.

### Переменные окружения API

Сервис создан не из Blueprint: правка `render.yaml` на прод **не попадает**.
Переменные меняются в Render → `vethub-api` → Environment и применяются только
выкаткой, не перезапуском. `render.yaml` описывает ту же конфигурацию и нужен,
чтобы пересоздать сервис.

### Выкатка фронтенда вручную

Если Actions выкатить не может (например, истёк `CLOUDFLARE_API_TOKEN`).
Нужны Node 22.12+ и вход в Cloudflare (`npx wrangler login`) под аккаунтом,
где живёт `vethub-web`.

```bash
git fetch origin
git worktree add --detach /tmp/vethub-build origin/main
cd /tmp/vethub-build/frontend && npm ci
NEXT_PUBLIC_API_URL=https://api.vethub.uz/api SITE_URL=https://vethub.uz \
  npx opennextjs-cloudflare build
npx wrangler deploy --var "BUILD_SHA:$(git rev-parse HEAD)"
curl -s https://vethub.uz/__version        # должен совпасть с git rev-parse HEAD
```

Откат на предыдущую версию — `npx wrangler rollback`.

### Бэкапы и восстановление

Ночной дамп перед загрузкой шифруется сертификатом `.github/backup-cert.pem`.
Закрытый ключ хранит владелец, в репозитории его нет: репозиторий публичный,
а артефакт Actions может скачать любой вошедший в GitHub. Каждую ночь дамп
восстанавливается в чистый Postgres, и строки сверяются с продом.

Восстанавливать всегда в **новую** базу, проверить, затем переключить
`DATABASE_URL` в Render. Поверх рабочей базы — никогда.

```bash
gh run list --workflow backup.yml --limit 5            # выбрать прогон
gh run download <run-id> -D bk
openssl cms -decrypt -binary -inform DER -inkey backup-decrypt-key.pem \
  -in bk/vetglobal-db-ДАТА/vetglobal-ДАТА.dump.cms -out vetglobal.dump
# Новая база той же версии Postgres. Схему public дамп создаёт сам.
psql "$TARGET_URL" -c 'DROP SCHEMA public CASCADE'
pg_restore --no-owner --no-acl --exit-on-error -d "$TARGET_URL" vetglobal.dump
```

### Частые операции

- **Одобрить продавца.** Админка → Пользователи → продавец → «Подтвердить».
  Пока продавец не одобрен, покупатели не видят его товаров. Пароль админа —
  в Render → Environment → `ADMIN_PASSWORD`.
- **Загрузить прайс продавца.** Кабинет продавца → импорт (Excel или CSV,
  колонки сопоставляются по синонимам). Повторный импорт с тем же артикулом (или
  названием и производителем) обновляет карточку, а не создаёт новую.
- **Вебхуки платежей** для кабинетов мерчантов:
  Payme — `https://api.vethub.uz/api/payments/payme`,
  Click — `https://api.vethub.uz/api/payments/click/prepare` и `.../complete`.

---

## Запасная схема: свой сервер

## 1. Локальный прод (проверка сборки)

```bash
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d --build
```
Открыть http://localhost:3000. Slim-образы, Next standalone, `node dist/main.js`.
Данные берутся из того же тома, что и dev (`docker compose up`), поэтому БД уже
засеяна. Вернуться в dev: `docker compose -f docker-compose.prod.yml down && docker compose up -d`.

## 2. Публичный деплой на VPS (Caddy + авто-HTTPS)

Подходит любой VPS с Docker (Hetzner, DigitalOcean, Contabo, …), 2 vCPU / 2–4 GB RAM.

**Шаги:**

1. **DNS:** создать A-записи на IP сервера:
   - `APP_DOMAIN` (напр. `vetglobal.uz`) — сайт;
   - `FILES_DOMAIN` (напр. `files.vetglobal.uz`) — раздача картинок/сертификатов (MinIO).

2. **На сервере:**
   ```bash
   # установить Docker
   curl -fsSL https://get.docker.com | sh
   git clone <repo> vet-global && cd vet-global
   cp .env.example .env
   ```

3. **Отредактировать `.env`** — обязательно:
   - `APP_DOMAIN`, `FILES_DOMAIN` — ваши домены;
   - `JWT_SECRET` — длинная случайная строка (`openssl rand -hex 32`);
   - `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, `ADMIN_PASSWORD` — сменить;
   - боевые креды интеграций (см. [INTEGRATIONS.md](INTEGRATIONS.md)).

4. **Запуск:**
   ```bash
   docker compose -f docker-compose.deploy.yml up -d --build
   ```
   Caddy сам получит TLS-сертификаты Let's Encrypt. Через ~1 минуту сайт доступен по
   `https://APP_DOMAIN`.

5. **Первичный сид** (только если БД пустая — свежий сервер). Прод-образ не сеет
   автоматически; выполнить один раз через dev-образ или psql:
   ```bash
   docker compose run --rm --entrypoint "npm run prisma:seed" \
     -e DATABASE_URL="postgresql://vetglobal:...@postgres:5432/vetglobal" backend
   ```
   (либо один раз поднять dev-стек, который сеет на старте, затем переключиться на deploy).

**Роутинг Caddy** (`deploy/Caddyfile`): `APP_DOMAIN/api/*` → backend, остальное →
frontend; `FILES_DOMAIN` → MinIO (публичное чтение бакета).

### Вебхуки платежей
После деплоя в кабинетах мерчантов указать:
- Payme: `https://APP_DOMAIN/api/payments/payme`
- Click: `https://APP_DOMAIN/api/payments/click/prepare` и `.../complete`

## Обновление
```bash
git pull
docker compose -f docker-compose.deploy.yml up -d --build
```
Схема БД синхронизируется на старте backend (`prisma db push`). Для продакшена
рекомендуется перейти на версионные миграции (`prisma migrate deploy`).

## Бэкапы
- Postgres: `docker compose exec postgres pg_dump -U vetglobal vetglobal > backup.sql`
- MinIO: том `miniodata` (или `mc mirror`).
