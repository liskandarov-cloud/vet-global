# VetGlobal backend (NestJS) — dev-oriented image.
# Dependencies are installed at build time; source is bind-mounted in compose
# for hot-reload. node_modules lives in a named volume (see docker-compose.yml).
FROM node:22-alpine

# openssl — Prisma query engine; font-dejavu — Cyrillic-capable TTF for PDF invoices.
RUN apk add --no-cache openssl bash font-dejavu

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 8000

# На старте: пересобрать клиент (схема могла измениться), применить миграции
# тем же путём, что и на проде, идемпотентно засеять, затем следить за файлами.
#
# Локально тоже миграции, а не db push: иначе расхождение схем между разработкой
# и продом обнаруживалось бы только на выкатке.
CMD ["bash", "-c", "npx prisma generate && npm run migrate:deploy && npm run prisma:seed && npm run start:dev"]
