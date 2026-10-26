#!/bin/sh
set -e

echo "[InventoryOS] Starting Container Boot Sequence..."

# If DATABASE_URL is set, attempt automatic schema migration
if [ -n "$DATABASE_URL" ]; then
  echo "[InventoryOS] Applying Prisma database schema..."
  npx prisma db push --skip-generate || echo "[InventoryOS] Warning: Database schema push had warnings, proceeding..."
  if [ -f "prisma/seed.js" ]; then
    echo "[InventoryOS] Ensuring database seed data is populated..."
    node prisma/seed.js || echo "[InventoryOS] Warning: Database seed failed, proceeding..."
  fi
fi

echo "[InventoryOS] Launching NestJS backend application..."
exec "$@"
