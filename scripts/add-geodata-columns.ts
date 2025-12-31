import * as dotenv from 'dotenv';
import * as path from 'path';
import { sequelize } from '../shared/database/config';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Migration script to add latitude and longitude columns to students table
 */
async function addGeodataColumns() {
  try {
    console.log('🔄 Adding geodata columns to students table...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    const queryInterface = sequelize.getQueryInterface();

    // Check if columns already exist
    const tableDescription = await queryInterface.describeTable('students');
    
    if (!tableDescription.latitude) {
      console.log('   Adding latitude column...');
      await queryInterface.addColumn('students', 'latitude', {
        type: 'DECIMAL(10, 8)',
        allowNull: true,
        comment: 'Geographic latitude for transport route mapping',
      });
      console.log('   ✅ latitude column added');
    } else {
      console.log('   ⏭️  latitude column already exists');
    }

    if (!tableDescription.longitude) {
      console.log('   Adding longitude column...');
      await queryInterface.addColumn('students', 'longitude', {
        type: 'DECIMAL(11, 8)',
        allowNull: true,
        comment: 'Geographic longitude for transport route mapping',
      });
      console.log('   ✅ longitude column added');
    } else {
      console.log('   ⏭️  longitude column already exists');
    }

    // Add index for geospatial queries
    console.log('   Adding geospatial index...');
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_students_geodata 
        ON students(latitude, longitude)
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
      `);
      console.log('   ✅ Geospatial index created');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('   ⏭️  Geospatial index already exists');
      } else {
        throw e;
      }
    }

    console.log('\n✅ Geodata columns migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

addGeodataColumns();

