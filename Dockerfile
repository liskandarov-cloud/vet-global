# Root Dockerfile — builds the BACKEND from the repo root, so hosts like Railway
# that build from the repo root (no "Root Directory" set) pick it up automatically
# and use Docker instead of an auto-detector. Frontend deploys separately (Vercel).
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/ ./
RUN npm run build
# Compile the seed to plain JS (prod runtime has no ts-node).
RUN npx tsc prisma/seed.ts --outDir dist-seed --module commonjs --target ES2021 \
    --esModuleInterop --skipLibCheck --moduleResolution node --resolveJsonModule

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl bash font-dejavu
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-seed ./dist-seed
COPY backend/prisma ./prisma
EXPOSE 8000
CMD ["bash", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist-seed/seed.js && node dist/main.js"]
