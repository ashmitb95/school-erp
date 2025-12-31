#!/bin/bash

# PostgreSQL Connection Helper Script

echo "🔌 Connecting to PostgreSQL..."
echo ""

# Get connection details from .env or use defaults
if [ -f .env ]; then
    source .env
fi

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-school_erp}
DB_USER=${DB_USER:-erp_user}
DB_PASSWORD=${DB_PASSWORD:-erp_password}

echo "Connection details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Connect via Docker
echo "Connecting via Docker container..."
docker exec -it erp-postgres psql -U "$DB_USER" -d "$DB_NAME"


