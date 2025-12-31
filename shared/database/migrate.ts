import { sequelize } from './config';
import models from './models';

/**
 * Database Migration Script
 * Creates all tables with proper indexes and constraints
 */
async function migrate() {
  try {
    console.log('Starting database migration...');

    // Ensure extensions are enabled
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm";');
    console.log('Extensions enabled.');

    // Import all models to ensure they're registered
    console.log('Loading models...');
    const modelNames = Object.keys(models);
    console.log(`Loaded ${modelNames.length} models: ${modelNames.join(', ')}`);

    // Sync all models (creates tables if they don't exist)
    console.log('Syncing database schema...');
    await sequelize.sync({ alter: false, force: false });

    console.log('Database migration completed successfully!');
    console.log('All tables have been created with optimized indexes.');

    // Display table information
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    console.log(`\nCreated tables: ${tables.join(', ')}`);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();

