import * as dotenv from 'dotenv';
import * as path from 'path';
import { sequelize } from '../shared/database/config';
import models from '../shared/database/models';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Attendance, Student, Class, Staff, ExamResult, Exam, Subject } = models;

/**
 * Seed script to add:
 * 1. Today's attendance records (with absences)
 * 2. Additional attendance data for metrics calculation
 * 3. Low score exam results
 */
async function seedTodayMetrics() {
  const transaction = await sequelize.transaction({ logging: false });

  try {
    console.log('🌱 Seeding today\'s metrics data...\n');
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get all active schools
    const schools = await models.School.findAll({
      where: { is_active: true },
      transaction,
    });

    if (schools.length === 0) {
      console.log('⚠️  No active schools found. Please run the main seed script first.');
      process.exit(1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    let totalTodayAttendance = 0;
    let totalAbsentToday = 0;
    let totalHistoricalAttendance = 0;
    let totalLowScoreResults = 0;

    for (const school of schools) {
      console.log(`\n📚 Processing School: ${school.get('name')} (${school.get('code')})`);

      // Get all active students for this school
      const students = await models.Student.findAll({
        where: { school_id: school.id, is_active: true },
        include: [{ model: models.Class, as: 'class' }],
        transaction,
      });

      if (students.length === 0) {
        console.log('   ⚠️  No students found, skipping...');
        continue;
      }

      // Get teachers for marking attendance
      const teachers = await models.Staff.findAll({
        where: { school_id: school.id, is_active: true, designation: 'Teacher' },
        transaction,
      });

      if (teachers.length === 0) {
        console.log('   ⚠️  No teachers found, skipping...');
        continue;
      }

      // Get classes to map class teachers
      const classes = await models.Class.findAll({
        where: { school_id: school.id, is_active: true },
        transaction,
      });

      const classTeacherMap: Record<string, any> = {};
      classes.forEach((c: any) => {
        const classTeacher = c.class_teacher_id
          ? teachers.find((t: any) => t.id === c.class_teacher_id)
          : teachers[Math.floor(Math.random() * teachers.length)];
        classTeacherMap[c.id] = classTeacher || teachers[0];
      });

      // 1. Create TODAY's attendance records
      console.log('   📅 Creating today\'s attendance records...');
      const todayAttendances: any[] = [];
      let absentCount = 0;

      // Delete existing attendance for today to recreate it
      await Attendance.destroy({
        where: {
          school_id: school.id,
          date: todayStr,
        },
        transaction,
      });

      // Create attendance for all students for today
      for (const student of students) {

          const studentClass = classes.find((c: any) => c.id === student.class_id);
          const markingTeacher = studentClass
            ? classTeacherMap[studentClass.id]
            : teachers[Math.floor(Math.random() * teachers.length)];

        // Distribution: 85% present, 10% absent, 4% late, 1% excused
        const rand = Math.random() * 100;
        let status: 'present' | 'absent' | 'late' | 'excused';
        let leave_type: 'planned' | 'unplanned' | null = null;

        if (rand < 85) {
          status = 'present';
        } else if (rand < 95) {
          status = 'absent';
          leave_type = Math.random() < 0.7 ? 'unplanned' : 'planned';
          absentCount++;
        } else if (rand < 99) {
          status = 'late';
        } else {
          status = 'excused';
          leave_type = Math.random() < 0.9 ? 'planned' : 'unplanned';
        }

        todayAttendances.push({
          school_id: school.id,
          student_id: student.id,
          class_id: student.class_id,
          date: todayStr,
          status: status,
          leave_type: leave_type,
          marked_by: markingTeacher?.id || teachers[0].id,
          remarks: status === 'absent' && Math.random() < 0.1
            ? ['Sick', 'Family emergency', 'Personal reason', ''][Math.floor(Math.random() * 4)]
            : null,
        });
      }

      if (todayAttendances.length > 0) {
        await Attendance.bulkCreate(todayAttendances, {
          transaction,
          logging: false,
          validate: true,
        });
        totalTodayAttendance += todayAttendances.length;
        totalAbsentToday += absentCount;
        console.log(`   ✅ Created ${todayAttendances.length} attendance records for today (${absentCount} absent)`);
      } else {
        console.log('   ℹ️  All students already have attendance for today');
      }

      // 2. Add additional historical attendance data for metrics (if needed)
      console.log('   📊 Checking historical attendance data for metrics...');
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Check how many attendance records exist in the last 30 days
      const existingHistoricalCount = await Attendance.count({
        where: {
          school_id: school.id,
          date: {
            [sequelize.Sequelize.Op.gte]: thirtyDaysAgo.toISOString().split('T')[0],
            [sequelize.Sequelize.Op.lt]: todayStr,
          },
        },
        transaction,
      });

      // If we have less than 1000 records in the last 30 days, add more
      if (existingHistoricalCount < 1000) {
        console.log(`   📈 Adding historical attendance data (${existingHistoricalCount} existing, target: 1000+)...`);
        const historicalAttendances: any[] = [];
        const daysToAdd = 30;
        const studentsPerDay = Math.min(50, students.length); // Sample 50 students per day

        for (let day = 1; day <= daysToAdd; day++) {
          const date = new Date(today);
          date.setDate(date.getDate() - day);
          // Skip weekends
          if (date.getDay() === 0 || date.getDay() === 6) continue;

          const dateStr = date.toISOString().split('T')[0];

          // Check if we already have data for this date
          const existingForDate = await Attendance.count({
            where: {
              school_id: school.id,
              date: dateStr,
            },
            transaction,
          });

          if (existingForDate > 0) continue; // Skip if already has data

          // Sample students for this day
          const shuffled = [...students].sort(() => 0.5 - Math.random());
          const sampledStudents = shuffled.slice(0, studentsPerDay);

          for (const student of sampledStudents) {
          const studentClass = classes.find((c: any) => c.id === student.class_id);
          const markingTeacher = studentClass
            ? classTeacherMap[studentClass.id]
            : teachers[Math.floor(Math.random() * teachers.length)];

            const rand = Math.random() * 100;
            let status: 'present' | 'absent' | 'late' | 'excused';
            let leave_type: 'planned' | 'unplanned' | null = null;

            if (rand < 85) {
              status = 'present';
            } else if (rand < 95) {
              status = 'absent';
              leave_type = Math.random() < 0.7 ? 'unplanned' : 'planned';
            } else if (rand < 99) {
              status = 'late';
            } else {
              status = 'excused';
              leave_type = Math.random() < 0.9 ? 'planned' : 'unplanned';
            }

            historicalAttendances.push({
              school_id: school.id,
              student_id: student.id,
              class_id: student.class_id,
              date: dateStr,
              status: status,
              leave_type: leave_type,
              marked_by: markingTeacher?.id || teachers[0].id,
            });
          }
        }

        if (historicalAttendances.length > 0) {
          await Attendance.bulkCreate(historicalAttendances, {
            transaction,
            logging: false,
            validate: true,
          });
          totalHistoricalAttendance += historicalAttendances.length;
          console.log(`   ✅ Added ${historicalAttendances.length} historical attendance records`);
        }
      } else {
        console.log(`   ✅ Sufficient historical data exists (${existingHistoricalCount} records)`);
      }

      // 3. Add low score exam results
      console.log('   📉 Adding low score exam results...');
      const exams = await Exam.findAll({
        where: {
          school_id: school.id,
          status: 'completed',
          is_active: true,
        },
        transaction,
      });

      const subjects = await Subject.findAll({
        where: { school_id: school.id },
        transaction,
      });

      if (exams.length > 0 && subjects.length > 0) {
        const lowScoreResults: any[] = [];

        // For each exam, add some low score results
        for (const exam of exams) {
          if (!exam.subject_id) continue;

          // Check existing results for this exam
          const existingResults = await ExamResult.count({
            where: {
              exam_id: exam.id,
            },
            transaction,
          });

          // If no results exist, create some low score ones
          if (existingResults === 0) {
            const shuffled = [...students].sort(() => 0.5 - Math.random());
            const examStudents = shuffled.slice(0, Math.min(30, students.length));

            for (const student of examStudents) {
              // Generate low scores: 20% fail (< 33%), 30% low (33-50%)
              const rand = Math.random();
              let marksObtained: number;
              if (rand < 0.2) {
                // Fail: 0-32%
                marksObtained = Math.round((Math.random() * exam.max_marks * 0.32) * 100) / 100;
              } else {
                // Low: 33-50%
                marksObtained = Math.round((exam.max_marks * 0.33 + Math.random() * exam.max_marks * 0.17) * 100) / 100;
              }

              const percentage = (marksObtained / exam.max_marks) * 100;
              const grade =
                percentage >= 90
                  ? 'A+'
                  : percentage >= 80
                  ? 'A'
                  : percentage >= 70
                  ? 'B+'
                  : percentage >= 60
                  ? 'B'
                  : percentage >= 50
                  ? 'C'
                  : percentage >= 33
                  ? 'D'
                  : 'F';

              lowScoreResults.push({
                school_id: school.id,
                exam_id: exam.id,
                student_id: student.id,
                subject_id: exam.subject_id,
                marks_obtained: marksObtained,
                max_marks: exam.max_marks,
                grade: grade,
                remarks: percentage < 33 ? 'Needs improvement' : 'Below average',
              });
            }
          }
        }

        if (lowScoreResults.length > 0) {
          await ExamResult.bulkCreate(lowScoreResults, {
            transaction,
            logging: false,
            validate: true,
          });
          totalLowScoreResults += lowScoreResults.length;
          console.log(`   ✅ Added ${lowScoreResults.length} low score exam results`);
        } else {
          console.log('   ℹ️  Exam results already exist or no completed exams found');
        }
      } else {
        console.log('   ℹ️  No completed exams or subjects found');
      }
    }

    await transaction.commit();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Metrics data seeding completed!');
    console.log('='.repeat(60));
    console.log(`📅 Today's attendance records: ${totalTodayAttendance}`);
    console.log(`   └─ Absent today: ${totalAbsentToday}`);
    console.log(`📊 Historical attendance records: ${totalHistoricalAttendance}`);
    console.log(`📉 Low score exam results: ${totalLowScoreResults}`);
    console.log('\n💡 You can now query:');
    console.log('   - Students absent today: SELECT * FROM attendances WHERE date = CURRENT_DATE AND status = \'absent\';');
    console.log('   - Attendance metrics: Calculate from attendances table for last 30 days');
    console.log('   - Low scores: SELECT * FROM exam_results WHERE (marks_obtained::DECIMAL / max_marks::DECIMAL) * 100 < 60;');

    process.exit(0);
  } catch (error: any) {
    await transaction.rollback();
    console.error('\n❌ Seeding failed! Transaction rolled back.');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

seedTodayMetrics();

