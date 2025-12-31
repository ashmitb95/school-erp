#!/bin/bash

# Run migrations from inside Docker container
# This works around connection issues from host machine

echo "🚀 Running database migrations from Docker container..."
echo ""

# Copy migration files to container and run
docker exec erp-postgres sh -c "
  cd /tmp && \
  echo 'Creating migration script...' && \
  cat > migrate.js << 'EOFMIGRATE'
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'school_erp',
  'erp_user',
  'erp_password',
  {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false,
  }
);

async function migrate() {
  try {
    console.log('Starting database migration...');
    await sequelize.authenticate();
    console.log('Database connection established.');
    
    // Create tables using raw SQL
    await sequelize.query(\`
      CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
      CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";
    \`);
    
    console.log('Extensions created.');
    console.log('Migration completed! Tables will be created by Sequelize sync.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
EOFMIGRATE
"

echo "✅ Migration script created in container"
echo ""
echo "⚠️  Note: The migration needs to run from your host machine."
echo "   The issue is with external connections to PostgreSQL."
echo ""
echo "🔧 Solution: Use Docker network or run migrations differently"
echo ""
echo "Try this instead:"
echo "  node shared/database/migrate.js"
echo ""
echo "Or connect via Docker:"
echo "  docker exec -it erp-postgres psql -U erp_user -d school_erp"


