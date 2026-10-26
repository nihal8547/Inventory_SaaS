#!/bin/sh
set -e

echo "[InventoryOS] Starting Container Boot Sequence..."

# If DATABASE_URL is set, attempt automatic schema migration
if [ -n "$DATABASE_URL" ]; then
  echo "[InventoryOS] Applying Prisma database schema..."
  npx prisma db push --skip-generate || echo "[InventoryOS] Warning: Database schema push had warnings, proceeding..."
fi

echo "[InventoryOS] Launching NestJS backend application..."
exec "$@"
