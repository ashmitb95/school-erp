import { sequelize } from '../shared/database/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function addColumnsAndBackfill() {
  console.log('🔧 Adding section to classes and status to exams...\n');

  try {
    // ============ ADD SECTION TO CLASSES ============
    console.log('📚 Processing classes table...');
    
    // Check if column exists
    const [sectionExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'classes' AND column_name = 'section';
    `);

    if ((sectionExists as any[]).length === 0) {
      // Add section column
      await sequelize.query(`
        ALTER TABLE classes 
        ADD COLUMN section VARCHAR(10) DEFAULT 'A';
      `);
      console.log('   ✅ Added section column to classes');

      // Create index
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_classes_section ON classes (section);
      `);
      console.log('   ✅ Created section index');

      // Backfill: Assign sections A, B, C, D based on row order within each school/level
      await sequelize.query(`
        WITH ranked_classes AS (
          SELECT 
            id, 
            school_id, 
            level,
            ROW_NUMBER() OVER (PARTITION BY school_id, level ORDER BY created_at, id) as rn
          FROM classes
        )
        UPDATE classes 
        SET section = 
          CASE 
            WHEN ranked_classes.rn = 1 THEN 'A'
            WHEN ranked_classes.rn = 2 THEN 'B'
            WHEN ranked_classes.rn = 3 THEN 'C'
            WHEN ranked_classes.rn = 4 THEN 'D'
            ELSE chr(64 + ranked_classes.rn::int)
          END,
          code = CONCAT(code, '-', 
            CASE 
              WHEN ranked_classes.rn = 1 THEN 'A'
              WHEN ranked_classes.rn = 2 THEN 'B'
              WHEN ranked_classes.rn = 3 THEN 'C'
              WHEN ranked_classes.rn = 4 THEN 'D'
              ELSE chr(64 + ranked_classes.rn::int)
            END
          )
        FROM ranked_classes
        WHERE classes.id = ranked_classes.id;
      `);
      console.log('   ✅ Backfilled section data (A, B, C, D per level)');
    } else {
      console.log('   ℹ️  Section column already exists');
    }

    // Show section distribution
    const [sectionStats] = await sequelize.query(`
      SELECT section, COUNT(*) as count 
      FROM classes 
      GROUP BY section 
      ORDER BY section;
    `);
    console.log('\n   📊 Section distribution:');
    (sectionStats as any[]).forEach((row: any) => {
      console.log(`      Section ${row.section}: ${row.count} classes`);
    });

    // ============ ADD STATUS TO EXAMS ============
    console.log('\n📝 Processing exams table...');
    
    const [statusExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'exams' AND column_name = 'status';
    `);

    if ((statusExists as any[]).length === 0) {
      // Create enum type
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE exam_status_enum AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('   ✅ Created exam_status_enum type');

      // Add status column
      await sequelize.query(`
        ALTER TABLE exams 
        ADD COLUMN status exam_status_enum DEFAULT 'scheduled';
      `);
      console.log('   ✅ Added status column to exams');

      // Create index
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_exams_status ON exams (status);
      `);
      console.log('   ✅ Created status index');

      // Backfill based on dates:
      // - Past exams (end_date < today): completed
      // - Current exams (start_date <= today <= end_date): in_progress
      // - Future exams: scheduled
      await sequelize.query(`
        UPDATE exams 
        SET status = 
          CASE 
            WHEN end_date < CURRENT_DATE THEN 'completed'::exam_status_enum
            WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'in_progress'::exam_status_enum
            ELSE 'scheduled'::exam_status_enum
          END;
      `);
      console.log('   ✅ Backfilled exam status based on dates');
    } else {
      console.log('   ℹ️  Status column already exists');
    }

    // Show exam status distribution
    const [examStats] = await sequelize.query(`
      SELECT status, COUNT(*) as count 
      FROM exams 
      GROUP BY status 
      ORDER BY status;
    `);
    console.log('\n   📊 Exam status distribution:');
    (examStats as any[]).forEach((row: any) => {
      console.log(`      ${row.status}: ${row.count} exams`);
    });

    // Show some completed exams with results
    const [completedWithResults] = await sequelize.query(`
      SELECT e.name, e.status, COUNT(er.id) as result_count
      FROM exams e
      LEFT JOIN exam_results er ON er.exam_id = e.id
      WHERE e.status = 'completed'
      GROUP BY e.id, e.name, e.status
      HAVING COUNT(er.id) > 0
      LIMIT 5;
    `);
    console.log('\n   📊 Sample completed exams with results:');
    (completedWithResults as any[]).forEach((row: any) => {
      console.log(`      ${row.name}: ${row.result_count} results`);
    });

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

addColumnsAndBackfill();

