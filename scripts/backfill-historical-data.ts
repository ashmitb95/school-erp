import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Sequelize } from 'sequelize';
import models from '../shared/database/models';
import { sequelize } from '../shared/database/config';
import * as crypto from 'crypto';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const NO_LOGGING = { logging: false };

// Indian city coordinates (approximate)
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Delhi': { lat: 28.6139, lng: 77.2090 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
};

// Helper to interpolate a point along a route path
function interpolatePointAlongRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  stops: Array<{ lat: number; lng: number }>,
  position: number // 0 to 1, where 0 is start and 1 is end
): { latitude: number; longitude: number } {
  // Create a path array: [start, ...stops, end]
  const path = [start, ...stops, end];
  
  // Calculate total path length
  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1].lng - path[i].lng;
    const dy = path[i + 1].lat - path[i].lat;
    const length = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(length);
    totalLength += length;
  }
  
  // Find which segment we're in
  const targetLength = totalLength * position;
  let accumulatedLength = 0;
  
  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulatedLength + segmentLengths[i] >= targetLength) {
      // We're in this segment
      const segmentProgress = (targetLength - accumulatedLength) / segmentLengths[i];
      const lat = path[i].lat + (path[i + 1].lat - path[i].lat) * segmentProgress;
      const lng = path[i].lng + (path[i + 1].lng - path[i].lng) * segmentProgress;
      return { latitude: lat, longitude: lng };
    }
    accumulatedLength += segmentLengths[i];
  }
  
  // Fallback to end point
  return { latitude: end.lat, longitude: end.lng };
}

// Helper to create a realistic route path with waypoints
function createRoutePath(
  startLocation: string,
  endLocation: string,
  city: string
): { start: { lat: number; lng: number }; end: { lat: number; lng: number }; stops: Array<{ lat: number; lng: number }> } {
  const baseCoords = CITY_COORDINATES[city] || CITY_COORDINATES['Delhi'];
  
  // Create start point (slightly offset from city center)
  const start = {
    lat: baseCoords.lat + (Math.random() - 0.5) * 0.15,
    lng: baseCoords.lng + (Math.random() - 0.5) * 0.15,
  };
  
  // Create end point (different area of city)
  const end = {
    lat: baseCoords.lat + (Math.random() - 0.5) * 0.15,
    lng: baseCoords.lng + (Math.random() - 0.5) * 0.15,
  };
  
  // Create intermediate waypoints (stops) along a curved path
  const numStops = 5;
  const stops: Array<{ lat: number; lng: number }> = [];
  
  for (let i = 1; i <= numStops; i++) {
    const t = i / (numStops + 1);
    // Use a curved interpolation (bezier-like) for more realistic route
    const lat = start.lat + (end.lat - start.lat) * t + Math.sin(t * Math.PI) * 0.02;
    const lng = start.lng + (end.lng - start.lng) * t + Math.cos(t * Math.PI) * 0.02;
    stops.push({ lat, lng });
  }
  
  return { start, end, stops };
}

// Generate receipt number
function generateReceiptNumber(prefix: string = 'RCP'): string {
  return `${prefix}${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

// Generate transaction ID
function generateTransactionId(gateway: string = 'razorpay'): string {
  const prefix = gateway === 'razorpay' ? 'pay_' : gateway === 'stripe' ? 'pi_' : 'txn_';
  return `${prefix}${crypto.randomBytes(12).toString('hex')}`;
}

// Calculate grade from marks
function calculateGrade(marksObtained: number, maxMarks: number): string {
  const percentage = (marksObtained / maxMarks) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

async function backfillHistoricalData() {
  const transaction = await sequelize.transaction();

  try {
    console.log('\n🔄 Starting Historical Data Backfill...\n');

    // Get all schools
    const schools = await models.School.findAll({ transaction, ...NO_LOGGING });
    const allStudents = await models.Student.findAll({ transaction, ...NO_LOGGING });
    const allClasses = await models.Class.findAll({ transaction, ...NO_LOGGING });
    const allSubjects = await models.Subject.findAll({ transaction, ...NO_LOGGING });
    const allStaff = await models.Staff.findAll({ transaction, ...NO_LOGGING });

    // Group students by school
    const studentsBySchool = new Map<string, any[]>();
    allStudents.forEach(student => {
      const schoolId = student.get('school_id') as string;
      if (!studentsBySchool.has(schoolId)) {
        studentsBySchool.set(schoolId, []);
      }
      studentsBySchool.get(schoolId)!.push(student);
    });

    // Group classes by school
    const classesBySchool = new Map<string, any[]>();
    allClasses.forEach(cls => {
      const schoolId = cls.get('school_id') as string;
      if (!classesBySchool.has(schoolId)) {
        classesBySchool.set(schoolId, []);
      }
      classesBySchool.get(schoolId)!.push(cls);
    });

    // Group subjects by school
    const subjectsBySchool = new Map<string, any[]>();
    allSubjects.forEach(subject => {
      const schoolId = subject.get('school_id') as string;
      if (!subjectsBySchool.has(schoolId)) {
        subjectsBySchool.set(schoolId, []);
      }
      subjectsBySchool.get(schoolId)!.push(subject);
    });

    let totalGeodataUpdated = 0;
    let totalPastExams = 0;
    let totalPastExamResults = 0;
    let totalHistoricalFees = 0;
    let totalPastTimetables = 0;

    for (const school of schools) {
      const schoolId = school.get('id') as string;
      const schoolStudents = studentsBySchool.get(schoolId) || [];
      const schoolClasses = classesBySchool.get(schoolId) || [];
      const schoolSubjects = subjectsBySchool.get(schoolId) || [];
      const schoolStaff = allStaff.filter(s => s.get('school_id') === schoolId);

      console.log(`\n📚 Processing ${school.get('name')}...`);

      // 1. Backfill Student Geodata along Transport Routes
      process.stdout.write('   📍 Assigning students to routes and geotagging... ');
      let geodataCount = 0;
      
      // Get transport routes for this school
      const transportRoutes = await models.TransportRoute.findAll({
        where: { school_id: schoolId, is_active: true },
        transaction,
        ...NO_LOGGING,
      });

      if (transportRoutes.length === 0) {
        console.log(`⚠️  No transport routes found, skipping geodata`);
      } else {
        // Distribute students across routes
        const studentsPerRoute = Math.ceil(schoolStudents.length / transportRoutes.length);
        
        for (let routeIndex = 0; routeIndex < transportRoutes.length; routeIndex++) {
          const route = transportRoutes[routeIndex];
          const routeStart = route.get('start_location') as string;
          const routeEnd = route.get('end_location') as string;
          
          // Get students for this route (distribute evenly)
          const routeStudents = schoolStudents.slice(
            routeIndex * studentsPerRoute,
            Math.min((routeIndex + 1) * studentsPerRoute, schoolStudents.length)
          );
          
          // Create route path based on city
          const city = routeStart.split(',')[1]?.trim() || schoolStudents[0]?.get('city') || 'Delhi';
          const routePath = createRoutePath(routeStart, routeEnd, city);
          
          // Assign students along the route path
          for (let i = 0; i < routeStudents.length; i++) {
            const student = routeStudents[i];
            // Distribute students evenly along the route (0 to 1)
            const position = i / Math.max(1, routeStudents.length - 1);
            
            // Get coordinates along the route
            const coords = interpolatePointAlongRoute(
              routePath.start,
              routePath.end,
              routePath.stops,
              position
            );
            
            // Add small random offset (within 50-100m) to simulate actual addresses
            const offset = 0.001; // ~100m
            coords.latitude += (Math.random() - 0.5) * offset;
            coords.longitude += (Math.random() - 0.5) * offset;
            
            // Update student with geodata and assign to route
            await student.update({
              latitude: coords.latitude,
              longitude: coords.longitude,
              transport_route_id: route.get('id') as string,
            }, { transaction, ...NO_LOGGING });
            
            geodataCount++;
          }
        }
        
        // Handle students not assigned to any route (use city center with small offset)
        const unassignedStudents = schoolStudents.filter(s => !s.get('transport_route_id'));
        for (const student of unassignedStudents) {
          const city = student.get('city') as string;
          const baseCoords = CITY_COORDINATES[city] || CITY_COORDINATES['Delhi'];
          await student.update({
            latitude: baseCoords.lat + (Math.random() - 0.5) * 0.05,
            longitude: baseCoords.lng + (Math.random() - 0.5) * 0.05,
          }, { transaction, ...NO_LOGGING });
          geodataCount++;
        }
      }
      
      totalGeodataUpdated += geodataCount;
      console.log(`✅ ${geodataCount}`);

      // 2. Create Past Exams (last 2-3 academic years)
      process.stdout.write('   📝 Creating past exams... ');
      const pastAcademicYears = [
        '2022-2023',
        '2023-2024',
      ];
      const examTypes = ['unit_test', 'mid_term', 'final', 'assignment'];
      const pastExams: any[] = [];

      for (const academicYear of pastAcademicYears) {
        for (const examType of examTypes) {
          // Create class-level exams
          for (const cls of schoolClasses.slice(0, 6)) { // Limit to first 6 classes
            const examDate = faker.date.past({ years: 2 });
            const endDate = new Date(examDate);
            endDate.setDate(endDate.getDate() + faker.number.int({ min: 1, max: 5 }));

            const exam = await models.Exam.create({
              school_id: schoolId,
              name: `${examType.charAt(0).toUpperCase() + examType.slice(1)} Exam - ${cls.get('name')}`,
              exam_type: examType,
              academic_year: academicYear,
              start_date: examDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              class_id: cls.get('id'),
              max_marks: faker.helpers.arrayElement([50, 80, 100]),
              passing_marks: faker.helpers.arrayElement([20, 32, 40]),
              is_active: false, // Past exams are inactive
            }, { transaction, ...NO_LOGGING });

            pastExams.push(exam);
          }

          // Create subject-specific exams
          for (const subject of schoolSubjects.slice(0, 4)) { // Limit to first 4 subjects
            const examDate = faker.date.past({ years: 2 });
            const endDate = new Date(examDate);
            endDate.setDate(endDate.getDate() + 1);

            const exam = await models.Exam.create({
              school_id: schoolId,
              name: `${subject.get('name')} ${examType.charAt(0).toUpperCase() + examType.slice(1)}`,
              exam_type: examType,
              academic_year: academicYear,
              start_date: examDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              subject_id: subject.get('id'),
              max_marks: faker.helpers.arrayElement([50, 80, 100]),
              passing_marks: faker.helpers.arrayElement([20, 32, 40]),
              is_active: false,
            }, { transaction, ...NO_LOGGING });

            pastExams.push(exam);
          }
        }
      }
      totalPastExams += pastExams.length;
      console.log(`✅ ${pastExams.length}`);

      // 3. Create Exam Results for Past Exams
      process.stdout.write('   📊 Creating past exam results... ');
      let examResultsCount = 0;

      for (const exam of pastExams) {
        const examId = exam.get('id') as string;
        const maxMarks = parseFloat(exam.get('max_marks') as string);
        const passingMarks = parseFloat(exam.get('passing_marks') as string);
        const classId = exam.get('class_id') as string;
        const subjectId = exam.get('subject_id') as string;

        // Get students for this exam
        let eligibleStudents: any[] = [];
        if (classId) {
          eligibleStudents = schoolStudents.filter(s => s.get('class_id') === classId);
        } else {
          // For subject-specific exams, get students from all classes
          eligibleStudents = schoolStudents.slice(0, 50); // Limit to avoid too many results
        }

        // Create results for 70-90% of eligible students
        const numResults = Math.floor(eligibleStudents.length * faker.number.float({ min: 0.7, max: 0.9 }));
        const selectedStudents = faker.helpers.arrayElements(eligibleStudents, numResults);

        for (const student of selectedStudents) {
          // Determine which subject this result is for
          const resultSubjectId = subjectId || faker.helpers.arrayElement(schoolSubjects).get('id') as string;
          
          // Generate realistic marks (some students fail, most pass)
          const isPassing = faker.helpers.maybe(() => true, { probability: 0.85 });
          const marksObtained = isPassing
            ? faker.number.float({ min: passingMarks, max: maxMarks, fractionDigits: 2 })
            : faker.number.float({ min: 0, max: passingMarks - 1, fractionDigits: 2 });

          const grade = calculateGrade(marksObtained, maxMarks);

          await models.ExamResult.create({
            school_id: schoolId,
            exam_id: examId,
            student_id: student.get('id') as string,
            subject_id: resultSubjectId,
            marks_obtained: marksObtained,
            max_marks: maxMarks,
            grade: grade,
            remarks: faker.helpers.maybe(() => faker.helpers.arrayElement(['Good', 'Excellent', 'Needs Improvement', 'Satisfactory']), { probability: 0.3 }),
          }, { transaction, ...NO_LOGGING });

          examResultsCount++;
        }
      }
      totalPastExamResults += examResultsCount;
      console.log(`✅ ${examResultsCount.toLocaleString()}`);

      // 4. Create Historical Fee Payments
      process.stdout.write('   💰 Creating historical fee payments... ');
      const feeTypes = ['tuition', 'library', 'transport', 'hostel', 'sports', 'lab'];
      let historicalFeesCount = 0;

      // Get existing fees for this school
      const existingFees = await models.Fee.findAll({
        where: { school_id: schoolId },
        transaction,
        ...NO_LOGGING,
      });

      // Create historical paid fees for past 2-3 academic years
      for (const academicYear of pastAcademicYears) {
        // Create 2-3 fee records per student per year
        for (const student of schoolStudents.slice(0, Math.min(1000, schoolStudents.length))) {
          const numFees = faker.number.int({ min: 2, max: 4 });
          
          for (let i = 0; i < numFees; i++) {
            const feeType = faker.helpers.arrayElement(feeTypes);
            const dueDate = faker.date.past({ years: 2 });
            const isPaid = faker.helpers.maybe(() => true, { probability: 0.75 }); // 75% paid
            
            if (isPaid) {
              const paidDate = faker.date.between({ from: dueDate, to: new Date() });
              const paymentMethod = faker.helpers.arrayElement(['razorpay', 'stripe', 'cash', 'bank_transfer', 'cheque']);
              const transactionId = generateTransactionId(paymentMethod);
              const receiptNumber = generateReceiptNumber();

              const amount = feeType === 'tuition' 
                ? faker.number.float({ min: 5000, max: 15000, fractionDigits: 2 })
                : feeType === 'transport'
                ? faker.number.float({ min: 500, max: 2000, fractionDigits: 2 })
                : faker.number.float({ min: 200, max: 1000, fractionDigits: 2 });

              await models.Fee.create({
                school_id: schoolId,
                student_id: student.get('id') as string,
                fee_type: feeType,
                amount: amount,
                due_date: dueDate.toISOString().split('T')[0],
                paid_date: paidDate.toISOString().split('T')[0],
                status: 'paid',
                payment_method: paymentMethod,
                transaction_id: transactionId,
                receipt_number: receiptNumber,
                academic_year: academicYear,
                remarks: faker.helpers.maybe(() => `Paid via ${paymentMethod}`, { probability: 0.2 }),
              }, { transaction, ...NO_LOGGING });

              historicalFeesCount++;
            } else {
              // Some unpaid fees
              const amount = feeType === 'tuition' 
                ? faker.number.float({ min: 5000, max: 15000, fractionDigits: 2 })
                : feeType === 'transport'
                ? faker.number.float({ min: 500, max: 2000, fractionDigits: 2 })
                : faker.number.float({ min: 200, max: 1000, fractionDigits: 2 });

              await models.Fee.create({
                school_id: schoolId,
                student_id: student.get('id') as string,
                fee_type: feeType,
                amount: amount,
                due_date: dueDate.toISOString().split('T')[0],
                status: 'pending',
                academic_year: academicYear,
              }, { transaction, ...NO_LOGGING });

              historicalFeesCount++;
            }
          }
        }
      }
      totalHistoricalFees += historicalFeesCount;
      console.log(`✅ ${historicalFeesCount.toLocaleString()}`);

      // 5. Create Past Timetables
      process.stdout.write('   ⏰ Creating past timetables... ');
      let pastTimetablesCount = 0;

      for (const academicYear of pastAcademicYears) {
        // Create timetables for each class
        for (const cls of schoolClasses) {
          const classId = cls.get('id') as string;
          const classSubjects = schoolSubjects.slice(0, 6); // 6 subjects per class
          const classTeachers = schoolStaff.filter(s => 
            s.get('designation') === 'Teacher'
          ).slice(0, classSubjects.length);

          if (classTeachers.length === 0) continue;

          // Create weekly timetable (Monday to Friday, 1-5 = Mon-Fri)
          const daysOfWeek = [1, 2, 3, 4, 5]; // Monday to Friday
          const periodsPerDay = 8; // 8 periods per day
          const periodTimes = [
            { start: '08:00', end: '08:45' },
            { start: '08:45', end: '09:30' },
            { start: '09:45', end: '10:30' },
            { start: '10:30', end: '11:15' },
            { start: '11:30', end: '12:15' },
            { start: '12:15', end: '13:00' },
            { start: '14:00', end: '14:45' },
            { start: '14:45', end: '15:30' },
          ];

          for (const dayOfWeek of daysOfWeek) {
            // Shuffle subjects for variety
            const shuffledSubjects = faker.helpers.shuffle([...classSubjects]);
            const shuffledTeachers = faker.helpers.shuffle([...classTeachers]);

            for (let period = 1; period <= periodsPerDay; period++) {
              const subjectIndex = (period - 1) % shuffledSubjects.length;
              const subject = shuffledSubjects[subjectIndex];
              const teacher = shuffledTeachers[subjectIndex % shuffledTeachers.length];
              const periodTime = periodTimes[period - 1];

              await models.Timetable.create({
                school_id: schoolId,
                class_id: classId,
                subject_id: subject.get('id') as string,
                teacher_id: teacher.get('id') as string,
                day_of_week: dayOfWeek,
                period_number: period,
                start_time: periodTime.start,
                end_time: periodTime.end,
                room: `Room ${faker.number.int({ min: 101, max: 305 })}`,
                academic_year: academicYear,
                is_active: false, // Past timetables are inactive
              }, { transaction, ...NO_LOGGING });

              pastTimetablesCount++;
            }
          }
        }
      }
      totalPastTimetables += pastTimetablesCount;
      console.log(`✅ ${pastTimetablesCount.toLocaleString()}`);
    }

    // Commit transaction
    await transaction.commit();
    console.log('\n✅ Backfill transaction committed successfully!');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 HISTORICAL DATA BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`📍 Student Geodata Updated: ${totalGeodataUpdated.toLocaleString()}`);
    console.log(`📝 Past Exams Created: ${totalPastExams.toLocaleString()}`);
    console.log(`📊 Past Exam Results Created: ${totalPastExamResults.toLocaleString()}`);
    console.log(`💰 Historical Fees Created: ${totalHistoricalFees.toLocaleString()}`);
    console.log(`⏰ Past Timetables Created: ${totalPastTimetables.toLocaleString()}`);
    console.log('='.repeat(60));

    console.log('\n✅ Historical data backfill completed successfully!');
    process.exit(0);
  } catch (error: any) {
    await transaction.rollback();
    console.error('\n❌ Backfill failed! Transaction rolled back.');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

backfillHistoricalData();

