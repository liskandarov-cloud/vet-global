#!/usr/bin/env bash
# Сборка и выкатка сайта демо-стенда https://demo.vethub.uz с этого компьютера
# (вход wrangler под аккаунтом betterfuture). API стенда поднимает workflow
# «Demo stand»; если Render выдал ему другой адрес, передайте его в DEMO_API_URL
# и поправьте env.demo.vars в wrangler.jsonc.
set -euo pipefail
cd "$(dirname "$0")/.."
export NEXT_PUBLIC_API_URL="${DEMO_API_URL:-https://vethub-demo-api.onrender.com/api}"
export SITE_URL=https://demo.vethub.uz
export NEXT_PUBLIC_DEMO=true
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy --env demo
