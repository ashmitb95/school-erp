import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root FIRST
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// For migrations, prefer PUBLIC_DATABASE_URL (Railway public connection) if available
// Temporarily override DATABASE_URL so models use the public connection
const originalDatabaseUrl = process.env.DATABASE_URL;
if (process.env.PUBLIC_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.PUBLIC_DATABASE_URL;
  console.log('📡 Using PUBLIC_DATABASE_URL for migrations');
}

// Now import models - they will use the DATABASE_URL we just set
import models from './models';
import { sequelize } from './config';

// Restore original DATABASE_URL if we changed it
if (originalDatabaseUrl && process.env.PUBLIC_DATABASE_URL) {
  process.env.DATABASE_URL = originalDatabaseUrl;
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

    // Verify RBAC models are loaded
    if (!models.Role || !models.Permission || !models.RolePermission || !models.StaffRole) {
      console.error('❌ RBAC models not found! Available models:', modelNames);
      throw new Error('RBAC models (Role, Permission, RolePermission, StaffRole) are not loaded');
    }
    console.log('✅ RBAC models verified: Role, Permission, RolePermission, StaffRole, User');

    // Sync all models (creates tables if they don't exist)
    console.log('Syncing database schema...');
    await sequelize.sync({ alter: false, force: false });

    console.log('Database migration completed successfully!');
    console.log('All tables have been created with optimized indexes.');

    // Display table information
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    console.log(`\nCreated tables: ${tables.join(', ')}`);
    
    // Verify RBAC tables were created
    const requiredTables = ['permissions', 'roles', 'role_permissions', 'staff_roles', 'users'];
    const missingTables = requiredTables.filter(t => !tables.includes(t));
    if (missingTables.length > 0) {
      console.error(`\n⚠️  WARNING: Missing RBAC tables: ${missingTables.join(', ')}`);
      console.error('   This may indicate an issue with model initialization.');
    } else {
      console.log('\n✅ All RBAC tables verified: permissions, roles, role_permissions, staff_roles, users');
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();

