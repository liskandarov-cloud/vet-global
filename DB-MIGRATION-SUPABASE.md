# Переезд прод-БД на Supabase (устойчивый Postgres вместо free-tier Render)

**Зачем:** бесплатный Postgres Render суспендится/удаляется через ~90 дней →
бэкенд перестаёт стартовать с `P1001: Can't reach database server`. Supabase
даёт стабильный бесплатный Postgres без такого лимита.

**Важно про код:** менять код НЕ нужно. На старте контейнер сам выполняет
`prisma db push` (создаёт схему) + `seed` (демо-данные и админ). Достаточно
переключить `DATABASE_URL` на новую базу и передеплоить.

---

## Шаги (делаются в дашбордах — ~5 минут)

### 1. Создать проект Supabase
1. https://supabase.com → New project.
2. Регион — ближе к Render (EU / Frankfurt, если сервис в `fra1`).
3. Задать пароль БД (сохрани — понадобится в строке подключения).

### 2. Взять строку подключения (ПРЯМУЮ, порт 5432)
Supabase → Project Settings → **Database** → **Connection string** → **URI**.

- Нужен вариант **Direct connection** (хост вида `db.<ref>.supabase.co:5432`).
- **НЕ** transaction pooler (порт `6543`): `prisma db push` на старте по пулеру
  не работает. Прямое подключение (5432) годится и для push, и для рантайма.

Формат:
```
postgresql://postgres:ВАШ_ПАРОЛЬ@db.<ref>.supabase.co:5432/postgres?sslmode=require
```

### 3. Прописать в Render
Render → сервис **vetglobal-backend** → **Environment** → переменная
`DATABASE_URL` → вставить строку из шага 2 → **Save**.
(Сейчас `DATABASE_URL` подтянут из умершей базы `vetglobal-db` через render.yaml —
ручное значение в Environment его переопределит.)

### 4. Передеплоить
Render → **Manual Deploy → Deploy latest commit** (или Clear cache & deploy).
На старте автоматически: `prisma db push` → создаст все таблицы →
`seed` → создаст категории, демо-товары и админа (`ADMIN_EMAIL` + `ADMIN_PASSWORD`
из Environment) → `node dist/main.js`.

### 5. Проверка
Как только сервис ответит — я прогоню прод-проверки (в т.ч. фичу остатков `fc69560`).
Быстрый признак готовности:
```bash
curl -s -o /dev/null -w '%{http_code}\n' https://vetglobal-backend.onrender.com/api/health
```

---

## Что уже проверено локально
- `prisma db push` с текущей схемой (включая `stockQty`) на чистую БД — OK.
- `seed` + boot приложения — OK (health=200 за ~4 сек).
- Фича остатков end-to-end — 6/6.

## Заметки
- Реальные данные из старой Render-БД не переносятся (если база суспендилась без
  бэкапа — они утеряны; демо-данные пересоздаст seed). Если старая БД ещё жива и
  нужны данные — сначала снять дамп `pg_dump` и залить в Supabase перед шагом 4.
- Опционально (позже): убрать `seed` из команды старта, чтобы демо-данные не
  пересоздавались при каждом рестарте прод-контейнера.
