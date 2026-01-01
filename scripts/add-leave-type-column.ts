import { sequelize } from '../shared/database/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function addLeaveTypeColumn() {
  console.log('🔧 Adding leave_type column to attendances table...');

  try {
    // Check if column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendances' AND column_name = 'leave_type';
    `);

    if ((results as any[]).length > 0) {
      console.log('✅ Column leave_type already exists');
      process.exit(0);
    }

    // Create the ENUM type first
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE leave_type_enum AS ENUM ('planned', 'unplanned');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ Created leave_type_enum type');

    // Add the column
    await sequelize.query(`
      ALTER TABLE attendances 
      ADD COLUMN leave_type leave_type_enum;
    `);
    console.log('✅ Added leave_type column');

    // Create index
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_attendances_leave_type ON attendances (leave_type);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_attendances_school_date_leave_type ON attendances (school_id, date, leave_type);
    `);
    console.log('✅ Created indexes');

    // Backfill existing data: set leave_type for existing absences
    // 70% unplanned (unexpected), 30% planned (with notice)
    console.log('📝 Backfilling existing attendance records...');
    
    // Update absences - 70% unplanned
    await sequelize.query(`
      UPDATE attendances 
      SET leave_type = 'unplanned'
      WHERE status = 'absent' 
        AND leave_type IS NULL
        AND random() < 0.7;
    `);

    // Update remaining absences as planned
    await sequelize.query(`
      UPDATE attendances 
      SET leave_type = 'planned'
      WHERE status = 'absent' 
        AND leave_type IS NULL;
    `);

    // Update excused - 90% planned (they had permission)
    await sequelize.query(`
      UPDATE attendances 
      SET leave_type = 'planned'
      WHERE status = 'excused' 
        AND leave_type IS NULL
        AND random() < 0.9;
    `);

    // Update remaining excused as unplanned
    await sequelize.query(`
      UPDATE attendances 
      SET leave_type = 'unplanned'
      WHERE status = 'excused' 
        AND leave_type IS NULL;
    `);

    console.log('✅ Backfilled leave_type for existing records');

    // Show stats
    const [stats] = await sequelize.query(`
      SELECT 
        status, 
        leave_type, 
        COUNT(*) as count 
      FROM attendances 
      WHERE status IN ('absent', 'excused')
      GROUP BY status, leave_type 
      ORDER BY status, leave_type;
    `);
    
    console.log('\n📊 Leave type distribution:');
    (stats as any[]).forEach((row: any) => {
      console.log(`   ${row.status} - ${row.leave_type || 'null'}: ${row.count}`);
    });

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

addLeaveTypeColumn();



