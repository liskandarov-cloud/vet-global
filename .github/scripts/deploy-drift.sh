#!/usr/bin/env bash
# Сверка: на проде работает код не старше последнего коммита main, который
# затрагивает этот контур. Печатает «ok …» или «FAIL …»; при расхождении
# дописывает строку в отчёт ($1, по умолчанию /tmp/failed.md) и выходит с 1.
#
# Зачем: при неудачной выкатке прод продолжает отвечать 200 старым кодом.
# Так незамеченными прошли восемь упавших деплоев бэкенда и полтора месяца
# битого токена выкатки фронтенда — проверки доступности были зелёными.
#
# Запуск из корня репозитория с историей main (checkout с fetch-depth: 0).
set -uo pipefail
REPORT="${1:-/tmp/failed.md}"
GRACE="${DRIFT_GRACE_SEC:-2400}" # 40 минут на сборку и выкатку
REF="${DRIFT_REF:-HEAD}"
status=0

check() {
  local name="$1" actual="$2"; shift 2
  local expected age full
  expected=$(git log -1 --format=%H "$REF" -- "$@")
  age=$(( $(date +%s) - $(git log -1 --format=%ct "$expected") ))
  full=$(git rev-parse --verify -q "${actual:-none}^{commit}" 2>/dev/null || true)
  if [ -n "$full" ] && git merge-base --is-ancestor "$expected" "$full"; then
    echo "ok   $name: ${full:0:7} (нужен не старше ${expected:0:7})"; return 0
  fi
  if [ "$age" -lt "$GRACE" ]; then
    echo "ok   $name: ${expected:0:7} выкатывается ($((age / 60)) мин)"; return 0
  fi
  local got="${actual:-версия не отдаётся}"
  echo "FAIL $name: на проде «${got}», а в main уже ${expected:0:7} ($((age / 60)) мин назад)"
  printf -- '- **%s** отстаёт от main: на проде `%s`, ожидался `%s` или новее\n' "$name" "$got" "${expected:0:7}" >> "$REPORT"
  status=1
}

backend=$(curl -s -m 90 https://api.vethub.uz/api/health | jq -r '.commit // empty' 2>/dev/null || true)
frontend=$(curl -s -m 60 https://vethub.uz/__version | jq -r '.sha // empty' 2>/dev/null || true)

# Пути — те, по изменению которых выкатывается контур.
check "Бэкенд (Render)" "$backend" backend Dockerfile
check "Фронтенд (Cloudflare)" "$frontend" frontend .github/workflows/deploy-frontend.yml
exit "$status"
