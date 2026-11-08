#!/bin/sh
set -e
cd /repo/apps/api
attempt=0
until npx prisma migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -gt 30 ]; then
    echo "prisma migrate deploy failed" >&2
    exit 1
  fi
  echo "Жду PostgreSQL, попытка ${attempt}..."
  sleep 2
done
exec node dist/main.js
