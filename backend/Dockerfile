# VetGlobal backend (NestJS) — dev-oriented image.
# Dependencies are installed at build time; source is bind-mounted in compose
# for hot-reload. node_modules lives in a named volume (see docker-compose.yml).
FROM node:20-alpine

# openssl — Prisma query engine; font-dejavu — Cyrillic-capable TTF for PDF invoices.
RUN apk add --no-cache openssl bash font-dejavu

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 8000

# On container start: regenerate client (picks up schema changes into the
# node_modules volume), sync schema to the DB, seed idempotently, then watch.
CMD ["bash", "-c", "npx prisma generate && npx prisma db push --accept-data-loss && npm run prisma:seed && npm run start:dev"]
