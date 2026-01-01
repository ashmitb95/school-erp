#!/bin/sh

# Standalone migration script for Railway
# Can be run manually via: railway run ./scripts/railway-migrate.sh

echo "🚀 Running Railway migrations and seeds..."

cd /app

# Run migrations
echo "📦 Running database migrations..."
npm run migrate || npx ts-node --transpile-only shared/database/migrate.ts

# Seed RBAC defaults
echo "🌱 Seeding RBAC defaults..."
npm run seed:rbac || npx ts-node --transpile-only scripts/seed-rbac-defaults.ts

# Migrate existing staff to RBAC
echo "🔄 Migrating existing staff to RBAC..."
npx ts-node --transpile-only scripts/migrate-to-rbac.ts

echo "✅ All migrations and seeds completed!"

