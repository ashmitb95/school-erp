// JavaScript version for direct execution
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'school_erp',
  process.env.DB_USER || 'erp_user',
  process.env.DB_PASSWORD || 'erp_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: console.log,
  }
);

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Enable extensions first
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm";');
    console.log('Extensions enabled.');

    // Import all models - they will register themselves with sequelize
    // We need to require each model file
    require('./models/School');
    require('./models/Staff');
    require('./models/Student');
    require('./models/Class');
    require('./models/Subject');
    require('./models/Attendance');
    require('./models/Fee');
    require('./models/Exam');
    require('./models/ExamResult');
    require('./models/Timetable');
    require('./models/LibraryBook');
    require('./models/LibraryTransaction');
    require('./models/InventoryItem');
    require('./models/TransportRoute');
    require('./models/Notification');
    
    // Initialize associations
    const models = require('./models');
    
    console.log('Models loaded. Syncing database...');
    // Sync all models
    await sequelize.sync({ alter: false, force: false });

    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

