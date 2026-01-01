import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';
import * as path from 'path';
import models from './models';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// For migrations, prefer PUBLIC_DATABASE_URL (Railway public connection) if available
// Otherwise fall back to DATABASE_URL
const databaseUrl = process.env.PUBLIC_DATABASE_URL || process.env.DATABASE_URL;

// Create a temporary sequelize instance for migrations if using public URL
let sequelize = require('./config').sequelize;

// If PUBLIC_DATABASE_URL is set, create a new connection for migrations
if (process.env.PUBLIC_DATABASE_URL && process.env.PUBLIC_DATABASE_URL !== process.env.DATABASE_URL) {
  const url = new URL(process.env.PUBLIC_DATABASE_URL);
  sequelize = new Sequelize(
    url.pathname.slice(1).split('?')[0],
    url.username,
    url.password,
    {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: process.env.PUBLIC_DATABASE_URL?.includes('sslmode=require') ? {
          require: true,
          rejectUnauthorized: false,
        } : false,
      },
    }
  );
  console.log('📡 Using PUBLIC_DATABASE_URL for migrations');
}

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

