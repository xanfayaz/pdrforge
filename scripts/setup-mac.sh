#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Нужен Node.js 20 или новее: https://nodejs.org или brew install node"
  exit 1
fi

major="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$major" -lt 20 ]; then
  echo "Нужен Node.js 20+, сейчас $(node -v)"
  exit 1
fi

if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  echo "Создан apps/api/.env"
fi
if [ ! -f apps/web/.env.local ]; then
  cp apps/web/.env.example apps/web/.env.local
  echo "Создан apps/web/.env.local"
fi

if [ -x /opt/homebrew/opt/postgresql@16/bin/pg_isready ]; then
  export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
elif [ -x /usr/local/opt/postgresql@16/bin/pg_isready ]; then
  export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
fi

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "Не найден pg_isready."
  echo "Homebrew: brew install postgresql@16 && brew services start postgresql@16"
  echo "Либо откройте Postgres.app и добавьте его bin в PATH."
  echo "Либо поднимите всё через Docker: docker compose up --build"
  exit 1
fi

if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "PostgreSQL не отвечает на localhost:5432."
  echo "Homebrew: brew services start postgresql@16"
  echo "Postgres.app: включите сервер в приложении."
  exit 1
fi

role_exists="$(psql -h localhost -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='pdrforge'" 2>/dev/null || true)"
if [ "$role_exists" != "1" ]; then
  echo "Создаю роль pdrforge..."
  psql -h localhost -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE pdrforge LOGIN PASSWORD 'pdrforge' SUPERUSER;"
fi

db_exists="$(psql -h localhost -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='pdrforge'" 2>/dev/null || true)"
if [ "$db_exists" != "1" ]; then
  echo "Создаю базу pdrforge..."
  psql -h localhost -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE pdrforge OWNER pdrforge;"
fi

npm install
npm run build -w @pdrforge/shared
npm run db:migrate

echo
echo "Готово. Дальше: npm run dev"
echo "Кабинет: http://localhost:3000"
echo "API:     http://localhost:4000/api/v1/health"
echo "На лендинге нажмите «Войти как демо». Мастерская создастся при старте API."
