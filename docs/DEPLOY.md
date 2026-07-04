# Деплой VetGlobal

Проект полностью контейнеризован. Ниже — три сценария: локальный прод, публичный
деплой на VPS (рекомендуется — весь стек в docker) и заметки по managed-платформам.

---

## 1. Локальный прод (проверка сборки)

```bash
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d --build
```
Открыть http://localhost:3000. Slim-образы, Next standalone, `node dist/main.js`.
Данные берутся из того же тома, что и dev (`docker compose up`), поэтому БД уже
засеяна. Вернуться в dev: `docker compose -f docker-compose.prod.yml down && docker compose up -d`.

## 2. Публичный деплой на VPS (Caddy + авто-HTTPS) — рекомендуется

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

## 3. Managed-платформы (альтернатива)

- **Frontend → Vercel** (Next.js нативно), **Backend → Railway/Render** (Docker),
  **Postgres → managed**, **файлы → Cloudflare R2 / AWS S3** (совместимо, поменять
  `S3_ENDPOINT`/ключи). Дороже по времени настройки, чем единый VPS.
- **Fly.io** — деплой Docker-образов + managed Postgres + volumes.

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
