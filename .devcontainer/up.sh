#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

echo "Жду Docker..."
i=0
until docker info >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "Docker в Codespaces не ответил." >&2
    exit 1
  fi
  sleep 2
done

# Сборка двух образов сразу не влезает в 8 ГБ codespace.
export COMPOSE_PARALLEL_LIMIT=1
if [ "${1:-}" = "--build" ]; then
  docker compose up --build -d
else
  docker compose up -d
fi

echo "Жду кабинет на порту 3000..."
i=0
until docker compose exec -T web node -e "fetch('http://127.0.0.1:3000/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 90 ]; then
    echo "Кабинет не открылся. Последние логи:" >&2
    docker compose logs --tail=60 >&2 || true
    exit 1
  fi
  sleep 2
done

if ! bash -c 'echo >/dev/tcp/127.0.0.1/3000' 2>/dev/null; then
  echo "Порт 3000 не слушает внутри codespace, ссылка откроется пустой страницей." >&2
  exit 1
fi

echo ""
echo "PDRForge слушает http://localhost:3000"
echo "Вкладка Ports → порт 3000 → Port Visibility → Public."
echo "Ссылка https://<имя-codespace>-3000.app.github.dev открывается с телефона."
echo "Вход: кнопка «Войти как демо»."
