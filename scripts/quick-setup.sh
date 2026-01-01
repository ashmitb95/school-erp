#!/bin/bash

# Quick Setup Script - Sets up database and generates JWT

echo "🚀 Praxis ERP Quick Setup"
echo "========================="
echo ""

# 1. Generate JWT Secret
echo "1️⃣  Generating JWT Secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "   Generated: $JWT_SECRET"
echo ""

# 2. Update .env file
if [ ! -f .env ]; then
    echo "2️⃣  Creating .env file..."
    cp .env.example .env
    echo "   ✅ Created .env from .env.example"
else
    echo "2️⃣  .env file already exists"
fi

# Update JWT_SECRET in .env
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
else
    # Linux
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
fi
echo "   ✅ Updated JWT_SECRET in .env"
echo ""

# 3. Check PostgreSQL
echo "3️⃣  Checking PostgreSQL..."
if docker ps | grep -q erp-postgres; then
    echo "   ✅ PostgreSQL container is running"
else
    echo "   ⚠️  PostgreSQL container is not running"
    echo "   Starting PostgreSQL..."
    docker-compose up -d postgres
    sleep 5
fi
echo ""

# 4. Run migrations
echo "4️⃣  Running database migrations..."
npm run migrate
if [ $? -eq 0 ]; then
    echo "   ✅ Database migrations completed"
else
    echo "   ❌ Migration failed"
    exit 1
fi
echo ""

# 5. Summary
echo "✅ Setup Complete!"
echo ""
echo "📋 Summary:"
echo "   • JWT Secret: $JWT_SECRET"
echo "   • Database: school_erp"
echo "   • User: erp_user"
echo ""
echo "🔗 Connect to PostgreSQL:"
echo "   docker exec -it erp-postgres psql -U erp_user -d school_erp"
echo ""
echo "📝 Next steps:"
echo "   1. Create a school (see DATABASE_SETUP.md)"
echo "   2. Create a staff user with hashed password"
echo "   3. Start services: npm run dev"
echo ""


