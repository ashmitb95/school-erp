#!/bin/bash

# Database Setup Script
# This script helps you set up the database and create initial data

echo "🚀 School ERP Database Setup"
echo "============================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
fi

# Check if PostgreSQL is running
if ! docker ps | grep -q erp-postgres; then
    echo "❌ PostgreSQL container is not running!"
    echo "   Start it with: docker-compose up -d postgres"
    exit 1
fi

echo "✅ PostgreSQL container is running"
echo ""

# Run migrations
echo "📦 Running database migrations..."
npm run migrate

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed!"
else
    echo "❌ Migration failed. Check the error above."
    exit 1
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a school: Use the API or SQL (see QUICKSTART.md)"
echo "2. Create a staff user with hashed password"
echo "3. Start your services: npm run dev"
echo ""


