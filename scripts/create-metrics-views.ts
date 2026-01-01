import * as dotenv from 'dotenv';
import * as path from 'path';
import { sequelize } from '../shared/database/config';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Migration: Create database views for metrics
 * - Absent today view
 * - Attendance metrics view
 * - Low score metrics view
 */
async function createMetricsViews() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const queryInterface = sequelize.getQueryInterface();

    // 1. Create view for students absent today
    console.log('📊 Creating "absent_today" view...');
    await sequelize.query(`
      DROP VIEW IF EXISTS absent_today CASCADE;
      
      CREATE VIEW absent_today AS
      SELECT 
        s.id as student_id,
        s.school_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.roll_number,
        c.id as class_id,
        c.name as class_name,
        c.level as class_level,
        a.date,
        a.status,
        a.leave_type,
        a.remarks,
        a.marked_by,
        st.first_name || ' ' || st.last_name as marked_by_name
      FROM students s
      INNER JOIN classes c ON s.class_id = c.id
      INNER JOIN attendances a ON s.id = a.student_id
      LEFT JOIN staff st ON a.marked_by = st.id
      WHERE a.date = CURRENT_DATE
        AND a.status = 'absent'
        AND s.is_active = true
        AND c.is_active = true
      ORDER BY c.name, s.roll_number;
    `);
    console.log('✅ Created "absent_today" view');

    // 2. Create view for attendance metrics (aggregated by student)
    console.log('📊 Creating "attendance_metrics" view...');
    await sequelize.query(`
      DROP VIEW IF EXISTS attendance_metrics CASCADE;
      
      CREATE VIEW attendance_metrics AS
      SELECT 
        s.id as student_id,
        s.school_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.roll_number,
        c.id as class_id,
        c.name as class_name,
        c.level as class_level,
        COUNT(a.id) FILTER (WHERE a.status = 'present') as present_count,
        COUNT(a.id) FILTER (WHERE a.status = 'absent') as absent_count,
        COUNT(a.id) FILTER (WHERE a.status = 'late') as late_count,
        COUNT(a.id) FILTER (WHERE a.status = 'excused') as excused_count,
        COUNT(a.id) FILTER (WHERE a.status = 'absent' AND a.leave_type = 'unplanned') as unplanned_absent_count,
        COUNT(a.id) as total_records,
        CASE 
          WHEN COUNT(a.id) > 0 
          THEN ROUND(
            (COUNT(a.id) FILTER (WHERE a.status = 'present')::DECIMAL / COUNT(a.id)::DECIMAL) * 100, 
            2
          )
          ELSE 0 
        END as attendance_percentage,
        MIN(a.date) as first_attendance_date,
        MAX(a.date) as last_attendance_date
      FROM students s
      INNER JOIN classes c ON s.class_id = c.id
      LEFT JOIN attendances a ON s.id = a.student_id
        AND a.date >= CURRENT_DATE - INTERVAL '30 days'
      WHERE s.is_active = true
        AND c.is_active = true
      GROUP BY s.id, s.school_id, s.first_name, s.last_name, s.admission_number, s.roll_number, 
               c.id, c.name, c.level;
    `);
    console.log('✅ Created "attendance_metrics" view');

    // 3. Create view for low score metrics (students with low exam scores)
    console.log('📊 Creating "low_score_metrics" view...');
    await sequelize.query(`
      DROP VIEW IF EXISTS low_score_metrics CASCADE;
      
      CREATE VIEW low_score_metrics AS
      SELECT 
        er.id as exam_result_id,
        er.school_id,
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.roll_number,
        c.id as class_id,
        c.name as class_name,
        c.level as class_level,
        e.id as exam_id,
        e.name as exam_name,
        e.exam_type,
        e.exam_date,
        sub.id as subject_id,
        sub.name as subject_name,
        sub.code as subject_code,
        er.marks_obtained,
        er.max_marks,
        ROUND((er.marks_obtained::DECIMAL / er.max_marks::DECIMAL) * 100, 2) as percentage,
        er.grade,
        er.remarks,
        CASE 
          WHEN (er.marks_obtained::DECIMAL / er.max_marks::DECIMAL) * 100 < 40 THEN 'Fail'
          WHEN (er.marks_obtained::DECIMAL / er.max_marks::DECIMAL) * 100 < 60 THEN 'Low'
          WHEN (er.marks_obtained::DECIMAL / er.max_marks::DECIMAL) * 100 < 75 THEN 'Average'
          ELSE 'Good'
        END as performance_category,
        er.created_at,
        er.updated_at
      FROM exam_results er
      INNER JOIN students s ON er.student_id = s.id
      INNER JOIN classes c ON s.class_id = c.id
      INNER JOIN exams e ON er.exam_id = e.id
      INNER JOIN subjects sub ON er.subject_id = sub.id
      WHERE s.is_active = true
        AND c.is_active = true
        AND (er.marks_obtained::DECIMAL / er.max_marks::DECIMAL) * 100 < 60
      ORDER BY percentage ASC, e.exam_date DESC, c.name, s.roll_number;
    `);
    console.log('✅ Created "low_score_metrics" view');

    // 4. Create indexes for better query performance
    console.log('📊 Creating indexes for metrics views...');
    
    // Index on attendances for absent today queries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_attendances_date_status 
      ON attendances(date, status) 
      WHERE status = 'absent';
    `);
    
    // Index on attendances for metrics (date range queries)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_attendances_student_date 
      ON attendances(student_id, date DESC);
    `);
    
    // Index on exam_results for low score queries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_results_percentage 
      ON exam_results(school_id, student_id, (marks_obtained::DECIMAL / max_marks::DECIMAL));
    `);
    
    console.log('✅ Created indexes for metrics views');

    // Verify views were created
    const views = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
        AND table_name IN ('absent_today', 'attendance_metrics', 'low_score_metrics')
      ORDER BY table_name;
    `);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Created views:');
    (views[0] as any[]).forEach((view: any) => {
      console.log(`   - ${view.table_name}`);
    });

    console.log('\n💡 Usage examples:');
    console.log('   SELECT * FROM absent_today WHERE school_id = \'<school_id>\';');
    console.log('   SELECT * FROM attendance_metrics WHERE attendance_percentage < 75 ORDER BY attendance_percentage;');
    console.log('   SELECT * FROM low_score_metrics WHERE school_id = \'<school_id>\' AND performance_category = \'Low\';');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createMetricsViews();



