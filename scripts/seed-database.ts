import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { Sequelize } from 'sequelize';
import models from '../shared/database/models';
import { sequelize } from '../shared/database/config';

const { Role, StaffRole } = models;

// Disable Sequelize query logging for cleaner output
// Note: Logging is controlled via config, but we can override per query if needed

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Disable Sequelize query logging for cleaner output
// We'll pass logging: false in transaction options
const NO_LOGGING = { logging: false };

// Configuration
const CONFIG = {
  NUM_SCHOOLS: 4,
  STUDENTS_PER_SCHOOL: 5200,
  CLASS_LEVELS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  CLASS_NAMES: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'],
  ACADEMIC_YEAR: '2024-2025',
  BATCH_SIZE: 100, // For batch inserts
};

// Indian data constants
const INDIAN_FIRST_NAMES = {
  male: ['Aarav', 'Aditya', 'Arjun', 'Dev', 'Ishaan', 'Krishna', 'Rohan', 'Siddharth', 'Vihaan', 'Yash', 'Rahul', 'Amit', 'Raj', 'Vikram'],
  female: ['Aanya', 'Ananya', 'Diya', 'Isha', 'Kavya', 'Meera', 'Pooja', 'Priya', 'Riya', 'Saanvi', 'Neha', 'Sneha', 'Priyanka', 'Anjali']
};

const INDIAN_LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Rao', 'Mehta', 'Joshi', 'Verma',
  'Shah', 'Desai', 'Agarwal', 'Malhotra', 'Kapoor', 'Chopra', 'Nair', 'Iyer', 'Menon', 'Pillai'
];

const INDIAN_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];
const INDIAN_STATES = ['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat'];
const BOARDS = ['CBSE', 'ICSE', 'State Board'];

const SUBJECTS = [
  { name: 'Mathematics', code: 'MATH', category: 'Academic' },
  { name: 'Science', code: 'SCI', category: 'Academic' },
  { name: 'English', code: 'ENG', category: 'Language' },
  { name: 'Hindi', code: 'HIN', category: 'Language' },
  { name: 'Social Studies', code: 'SST', category: 'Academic' },
  { name: 'Computer Science', code: 'CS', category: 'Technical' },
  { name: 'Physical Education', code: 'PE', category: 'Sports' },
  { name: 'Art', code: 'ART', category: 'Arts' },
];

const BOOK_CATEGORIES = ['Fiction', 'Non-Fiction', 'Textbook', 'Reference', 'Biography', 'Science', 'History', 'Literature'];
const INVENTORY_CATEGORIES = ['Stationery', 'Furniture', 'Electronics', 'Sports Equipment', 'Lab Equipment', 'Cleaning Supplies', 'Food Items'];
const VEHICLE_TYPES = ['Bus', 'Van', 'Mini Bus'];

// Helper function to assign role to staff
async function assignRoleToStaff(
  staff: any,
  roleName: string,
  schoolId: string,
  assignedBy: string,
  transaction: any
) {
  const role = await Role.findOne({
    where: { name: roleName, school_id: schoolId },
    transaction,
  });
  if (role) {
    await StaffRole.create({
      staff_id: staff.id,
      role_id: role.id,
      assigned_by: assignedBy,
      assigned_at: new Date(),
    }, { transaction });
  }
}

// Helper functions
function getIndianName(gender: 'male' | 'female'): { first: string; last: string } {
  return {
    first: faker.helpers.arrayElement(INDIAN_FIRST_NAMES[gender]),
    last: faker.helpers.arrayElement(INDIAN_LAST_NAMES),
  };
}

function getIndianPhone(): string {
  return `9${faker.string.numeric(9)}`;
}

function getIndianAddress() {
  return {
    city: faker.helpers.arrayElement(INDIAN_CITIES),
    state: faker.helpers.arrayElement(INDIAN_STATES),
    pincode: faker.string.numeric(6),
    address: `${faker.location.streetAddress()}, ${faker.location.secondaryAddress()}`,
  };
}

function generateUniqueEmail(baseEmail: string, usedEmails: Set<string>): string {
  let email = baseEmail;
  let counter = 1;
  while (usedEmails.has(email)) {
    email = baseEmail.replace('@', `${counter}@`);
    counter++;
  }
  usedEmails.add(email);
  return email;
}

// Batch insert helper
async function batchInsert<T>(
  model: any,
  data: T[],
  batchSize: number = CONFIG.BATCH_SIZE,
  progressCallback?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await model.bulkCreate(batch, { validate: true });
    if (progressCallback) {
      progressCallback(Math.min(i + batchSize, data.length), data.length);
    }
  }
}

async function seedDatabase() {
  const transaction = await sequelize.transaction({ logging: false });
  
  try {
    console.log('🌱 Starting enterprise-grade database seeding...');
    console.log('📊 Configuration:');
    console.log(`   Schools: ${CONFIG.NUM_SCHOOLS}`);
    console.log(`   Students per school: ${CONFIG.STUDENTS_PER_SCHOOL}`);
    console.log(`   Total students: ${CONFIG.NUM_SCHOOLS * CONFIG.STUDENTS_PER_SCHOOL}`);
    
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Check if RBAC defaults are seeded
    const roleCount = await Role.count({ transaction });
    if (roleCount === 0) {
      console.log('⚠️  WARNING: No roles found in database.');
      console.log('   Please run: npm run seed:rbac (or ts-node scripts/seed-rbac-defaults.ts)');
      console.log('   before running this seed script.\n');
      console.log('   Proceeding anyway, but staff will not have roles assigned...\n');
    }

    // Step 1: Clear existing data (preserve admin users)
    process.stdout.write('🗑️  Clearing existing data... ');
    await sequelize.query('DELETE FROM exam_results;', { transaction });
    await sequelize.query('DELETE FROM exams;', { transaction });
    await sequelize.query('DELETE FROM fees;', { transaction });
    await sequelize.query('DELETE FROM attendances;', { transaction });
    await sequelize.query('DELETE FROM timetables;', { transaction });
    await sequelize.query('DELETE FROM library_transactions;', { transaction });
    await sequelize.query('DELETE FROM library_books;', { transaction });
    await sequelize.query('DELETE FROM inventory_items;', { transaction });
    await sequelize.query('DELETE FROM notifications;', { transaction });
    await sequelize.query('DELETE FROM students;', { transaction });
    await sequelize.query('DELETE FROM classes;', { transaction });
    await sequelize.query('DELETE FROM subjects;', { transaction });
    await sequelize.query('DELETE FROM transport_routes;', { transaction });
    await sequelize.query("DELETE FROM staff WHERE email NOT LIKE 'admin@%';", { transaction });
    await sequelize.query('DELETE FROM schools;', { transaction });
    console.log('✅ Done\n');

    const allData: any = {
      schools: [],
      subjects: [],
      transportRoutes: [],
      staff: [],
      classes: [],
      students: [],
      libraryBooks: [],
      inventoryItems: [],
      exams: [],
      examResults: [],
      fees: [],
      attendances: [],
      timetables: [],
      libraryTransactions: [],
      notifications: [],
    };

    const passwordHash = await bcrypt.hash('teacher@123', 10);

    // Step 2: Create Schools
    process.stdout.write('🏫 Creating schools... ');
    for (let i = 1; i <= CONFIG.NUM_SCHOOLS; i++) {
      const address = getIndianAddress();
      const school = await models.School.create({
        name: `${faker.company.name()} School - Branch ${i}`,
        code: `SCH${String(i).padStart(3, '0')}`,
        address: address.address,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: getIndianPhone(),
        email: `info@school${i}.edu.in`,
        principal_name: getIndianName('male').first + ' ' + getIndianName('male').last,
        principal_email: `principal@school${i}.edu.in`,
        board: faker.helpers.arrayElement(BOARDS),
        established_year: faker.number.int({ min: 1990, max: 2010 }),
        is_active: true,
        settings: {},
      }, { transaction, logging: false });
      allData.schools.push(school);
    }
    console.log(`✅ ${allData.schools.length} schools\n`);

    // Step 3: Create data for each school
    for (let schoolIndex = 0; schoolIndex < allData.schools.length; schoolIndex++) {
      const school = allData.schools[schoolIndex];
      const schoolNum = schoolIndex + 1;
      console.log(`\n📚 School ${schoolNum}/${allData.schools.length}: ${school.name}`);

      // 3.1: Create Subjects
      process.stdout.write('   📖 Subjects... ');
      const schoolSubjects = [];
      for (const subject of SUBJECTS) {
        const subj = await models.Subject.create({
          school_id: school.id,
          name: subject.name,
          code: subject.code,
          description: `${subject.name} - ${subject.category}`,
          is_active: true,
        }, { transaction, logging: false });
        schoolSubjects.push(subj);
      }
      allData.subjects.push(...schoolSubjects);
      console.log(`✅ ${schoolSubjects.length}`);

      // 3.2: Create Transport Routes
      process.stdout.write('   🚌 Transport routes... ');
      const schoolRoutes: any[] = [];
      for (let r = 1; r <= 5; r++) {
        const routeName = getIndianName('male');
        const route = await models.TransportRoute.create({
          school_id: school.id,
          route_name: `${routeName.first} ${routeName.last} Route`,
          route_number: `RT${school.code}${String(r).padStart(2, '0')}`,
          driver_name: getIndianName('male').first + ' ' + getIndianName('male').last,
          driver_phone: getIndianPhone(),
          vehicle_number: `${faker.string.alpha(2).toUpperCase()}${faker.string.numeric(2)} ${faker.string.alpha(2).toUpperCase()}${faker.string.numeric(4)}`,
          vehicle_type: faker.helpers.arrayElement(VEHICLE_TYPES),
          capacity: faker.number.int({ min: 30, max: 50 }),
          start_location: faker.location.streetAddress(),
          end_location: faker.location.streetAddress(),
          stops: Array.from({ length: faker.number.int({ min: 5, max: 10 }) }, () => faker.location.streetAddress()),
          fare_per_month: faker.number.float({ min: 500, max: 2000, fractionDigits: 2 }),
          is_active: true,
        }, { transaction, logging: false });
        schoolRoutes.push(route);
      }
      allData.transportRoutes.push(...schoolRoutes);
      console.log(`✅ ${schoolRoutes.length}`);

      // 3.3: Create Staff (Admin + Teachers)
      process.stdout.write('   👨‍🏫 Staff... ');
      const schoolStaff = [];
      const usedEmails = new Set<string>();

      // Create admin
      const adminEmail = `admin@school${schoolIndex + 1}.edu.in`;
      usedEmails.add(adminEmail);
      let admin = await models.Staff.findOne({ where: { email: adminEmail }, transaction });
      if (!admin) {
        const adminName = getIndianName('male');
        const adminAddress = getIndianAddress();
        admin = await models.Staff.create({
          school_id: school.id,
          employee_id: `EMP${school.code}001`,
          first_name: adminName.first,
          last_name: adminName.last,
          date_of_birth: faker.date.birthdate({ min: 30, max: 50, mode: 'age' }),
          gender: 'male',
          designation: 'Administrator',
          qualification: 'M.B.A',
          experience_years: faker.number.int({ min: 5, max: 15 }),
          phone: getIndianPhone(),
          email: adminEmail,
          address: adminAddress.address,
          city: adminAddress.city,
          state: adminAddress.state,
          pincode: adminAddress.pincode,
          joining_date: faker.date.past({ years: 5 }),
          password: passwordHash,
          is_active: true,
        }, { transaction, logging: false });
      } else {
        await admin.update({ password: passwordHash, is_active: true, school_id: school.id }, { transaction });
      }
      
      // Assign principal role to admin
      await assignRoleToStaff(admin, 'principal', school.id, admin.id, transaction);
      
      schoolStaff.push(admin);

      // Create teachers (2-3 per class)
      let empCounter = 2;
      for (let classLevel = 0; classLevel < CONFIG.CLASS_LEVELS.length; classLevel++) {
        const numTeachers = faker.number.int({ min: 2, max: 3 });
        for (let t = 0; t < numTeachers; t++) {
          const teacherGender = faker.helpers.arrayElement(['male', 'female'] as const);
          const teacherName = getIndianName(teacherGender);
          const teacherAddress = getIndianAddress();
          const baseEmail = `${teacherName.first.toLowerCase()}.${teacherName.last.toLowerCase()}@school${schoolIndex + 1}.edu.in`;
          const teacherEmail = generateUniqueEmail(baseEmail, usedEmails);

          const teacher = await models.Staff.create({
            school_id: school.id,
            employee_id: `EMP${school.code}${String(empCounter++).padStart(3, '0')}`,
            first_name: teacherName.first,
            last_name: teacherName.last,
            date_of_birth: faker.date.birthdate({ min: 25, max: 45, mode: 'age' }),
            gender: teacherGender,
            designation: 'Teacher',
            qualification: faker.helpers.arrayElement(['B.Ed', 'M.Ed', 'M.Sc', 'M.A']),
            experience_years: faker.number.int({ min: 1, max: 10 }),
            phone: getIndianPhone(),
            email: teacherEmail,
            address: teacherAddress.address,
            city: teacherAddress.city,
            state: teacherAddress.state,
            pincode: teacherAddress.pincode,
            joining_date: faker.date.past({ years: 3 }),
            password: passwordHash,
            is_active: true,
          }, { transaction, logging: false });
          
          // Assign teacher role
          await assignRoleToStaff(teacher, 'teacher', school.id, admin.id, transaction);
          
          schoolStaff.push(teacher);
        }
      }
      allData.staff.push(...schoolStaff);
      console.log(`✅ ${schoolStaff.length}`);

      // 3.4: Create Classes (with sections A, B, C, D for each level)
      process.stdout.write('   🎓 Classes... ');
      const schoolClasses = [];
      const SECTIONS = ['A', 'B', 'C', 'D']; // 4 sections per class level
      let teacherIndex = 1; // Skip admin (index 0)
      
      for (let i = 0; i < CONFIG.CLASS_LEVELS.length; i++) {
        for (const section of SECTIONS) {
          const classData = await models.Class.create({
            school_id: school.id,
            name: `Class ${CONFIG.CLASS_NAMES[i]}`,
            code: `C${String(CONFIG.CLASS_LEVELS[i]).padStart(2, '0')}-${section}`,
            section: section,
            level: CONFIG.CLASS_LEVELS[i],
            academic_year: CONFIG.ACADEMIC_YEAR,
            class_teacher_id: schoolStaff[teacherIndex % (schoolStaff.length - 1) + 1]?.id,
            capacity: faker.number.int({ min: 35, max: 50 }),
            is_active: true,
          }, { transaction, logging: false });
          schoolClasses.push(classData);
          teacherIndex++;
        }
      }
      allData.classes.push(...schoolClasses);
      console.log(`✅ ${schoolClasses.length}`);

      // 3.5: Create Students - Respecting class capacity limits
      process.stdout.write('   👥 Students... ');
      const schoolStudents = [];
      let admissionCounter = 1;

      // Calculate total capacity and distribute students intelligently
      const totalCapacity = schoolClasses.reduce((sum, cls) => sum + cls.capacity, 0);
      const targetStudents = CONFIG.STUDENTS_PER_SCHOOL;
      
      // If total capacity is less than target, fill classes proportionally up to capacity
      // If total capacity is more than target, distribute proportionally
      const fillRatio = Math.min(1, targetStudents / totalCapacity);
      
      // Distribute students proportionally by capacity, but respect individual class limits
      let remainingStudents = targetStudents;
      const classAllocations: Array<{ class: any; target: number }> = [];
      
      for (const classData of schoolClasses) {
        // Calculate proportional allocation based on capacity
        const proportionalAllocation = Math.floor(classData.capacity * fillRatio);
        // Add some randomness: 80-100% of capacity for realistic distribution
        const utilizationRate = faker.number.float({ min: 0.80, max: 1.0 });
        const targetForClass = Math.min(
          classData.capacity,
          Math.max(
            Math.floor(proportionalAllocation * utilizationRate),
            Math.floor(classData.capacity * 0.75) // At least 75% filled
          )
        );
        classAllocations.push({ class: classData, target: targetForClass });
      }
      
      // Adjust allocations to match total target (distribute remainder)
      const allocatedTotal = classAllocations.reduce((sum, a) => sum + a.target, 0);
      const difference = targetStudents - allocatedTotal;
      
      if (difference > 0) {
        // Distribute remainder to classes that have space
        const classesWithSpace = classAllocations
          .filter(a => a.target < a.class.capacity)
          .sort((a, b) => (b.class.capacity - b.target) - (a.class.capacity - a.target));
        
        let remaining = difference;
        for (const allocation of classesWithSpace) {
          if (remaining <= 0) break;
          const spaceAvailable = allocation.class.capacity - allocation.target;
          const toAdd = Math.min(remaining, spaceAvailable);
          allocation.target += toAdd;
          remaining -= toAdd;
        }
      } else if (difference < 0) {
        // Reduce allocations if we overshot
        const classesToReduce = classAllocations
          .sort((a, b) => b.target - a.target);
        
        let remaining = Math.abs(difference);
        for (const allocation of classesToReduce) {
          if (remaining <= 0) break;
          const toReduce = Math.min(remaining, allocation.target - Math.floor(allocation.class.capacity * 0.75));
          allocation.target -= toReduce;
          remaining -= toReduce;
        }
      }

      // Create students for each class according to allocation
      for (const { class: classData, target } of classAllocations) {
        const classStudents = [];
        for (let s = 0; s < target; s++) {
          const studentGender = faker.helpers.arrayElement(['male', 'female'] as const);
          const studentName = getIndianName(studentGender);
          const studentAddress = getIndianAddress();
          const dob = faker.date.birthdate({ min: 6 + classData.level, max: 8 + classData.level, mode: 'age' });

          const emergencyContact = getIndianName('male');
          const student = await models.Student.create({
            school_id: school.id,
            class_id: classData.id,
            admission_number: `ADM${school.code}${String(admissionCounter++).padStart(5, '0')}`,
            roll_number: String(s + 1).padStart(3, '0'),
            first_name: studentName.first,
            last_name: studentName.last,
            date_of_birth: dob,
            gender: studentGender,
            academic_year: CONFIG.ACADEMIC_YEAR,
            father_name: getIndianName('male').first + ' ' + getIndianName('male').last,
            father_phone: getIndianPhone(),
            mother_name: getIndianName('female').first + ' ' + getIndianName('female').last,
            mother_phone: getIndianPhone(),
            guardian_name: getIndianName('male').first + ' ' + getIndianName('male').last,
            guardian_phone: getIndianPhone(),
            emergency_contact_name: emergencyContact.first + ' ' + emergencyContact.last,
            emergency_contact_phone: getIndianPhone(),
            address: studentAddress.address,
            city: studentAddress.city,
            state: studentAddress.state,
            pincode: studentAddress.pincode,
            admission_date: faker.date.past({ years: 1 }),
            transport_route_id: schoolRoutes.length > 0 && faker.helpers.maybe(() => true, { probability: 0.3 })
              ? faker.helpers.arrayElement(schoolRoutes).id
              : undefined,
            is_active: true,
          }, { transaction, logging: false });
          classStudents.push(student);
        }
        schoolStudents.push(...classStudents);
      }
      allData.students.push(...schoolStudents);
      console.log(`✅ ${schoolStudents.length.toLocaleString()} (avg ${Math.round(schoolStudents.length / schoolClasses.length)} per class)`);

      // 3.6: Create Library Books
      process.stdout.write('   📚 Library books... ');
      const schoolBooks = [];
      for (let b = 0; b < 200; b++) {
        const book = await models.LibraryBook.create({
          school_id: school.id,
          title: faker.lorem.words({ min: 2, max: 5 }),
          author: getIndianName(faker.helpers.arrayElement(['male', 'female'])).first + ' ' + getIndianName('male').last,
          isbn: faker.string.numeric(13),
          publisher: faker.company.name(),
          category: faker.helpers.arrayElement(BOOK_CATEGORIES),
          total_copies: faker.number.int({ min: 1, max: 5 }),
          available_copies: faker.number.int({ min: 0, max: 3 }),
          location: `Shelf ${faker.string.alpha(1).toUpperCase()}${faker.number.int({ min: 1, max: 10 })}`,
          is_active: true,
        }, { transaction, logging: false });
        schoolBooks.push(book);
      }
      allData.libraryBooks.push(...schoolBooks);
      console.log(`✅ ${schoolBooks.length}`);

      // 3.7: Create Inventory Items
      process.stdout.write('   📦 Inventory items... ');
      const schoolInventory = [];
      for (let i = 0; i < 100; i++) {
        const category = faker.helpers.arrayElement(INVENTORY_CATEGORIES);
        const item = await models.InventoryItem.create({
          school_id: school.id,
          name: `${category} - ${faker.commerce.productName()}`,
          category: category,
          quantity: faker.number.int({ min: 10, max: 500 }),
          unit: faker.helpers.arrayElement(['pcs', 'kg', 'liters', 'boxes', 'units']),
          min_stock_level: faker.number.int({ min: 5, max: 50 }),
          location: `Store Room ${faker.number.int({ min: 1, max: 5 })}`,
          supplier: faker.company.name(),
          cost_per_unit: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
          is_active: true,
        }, { transaction, logging: false });
        schoolInventory.push(item);
      }
      allData.inventoryItems.push(...schoolInventory);
      console.log(`✅ ${schoolInventory.length}`);

      // 3.8: Create Exams (mix of completed, in_progress, and scheduled)
      process.stdout.write('   📝 Exams... ');
      const schoolExams = [];
      const examTypes = ['monthly_test', 'mid_term', 'final'];
      const examToday = new Date();
      
      // Helper to generate exam dates and status
      const getExamDateAndStatus = (examType: string, index: number): { startDate: Date; endDate: Date; status: 'completed' | 'in_progress' | 'scheduled' } => {
        // Monthly tests: distribute across past months
        // Mid-terms: October (past)
        // Finals: December (some completed, some upcoming)
        
        if (examType === 'monthly_test') {
          // Monthly tests in past 6 months
          const monthsAgo = (index % 6) + 1;
          const startDate = new Date(examToday);
          startDate.setMonth(startDate.getMonth() - monthsAgo);
          startDate.setDate(faker.number.int({ min: 1, max: 15 }));
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 3);
          return { startDate, endDate, status: 'completed' };
        } else if (examType === 'mid_term') {
          // Mid-term in October (past)
          const startDate = new Date(examToday.getFullYear(), 9, faker.number.int({ min: 10, max: 20 }));
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7);
          return { startDate, endDate, status: startDate < examToday ? 'completed' : 'scheduled' };
        } else {
          // Finals - some completed (past week), some in progress (this week), some upcoming
          const variant = index % 3;
          if (variant === 0) {
            // Completed last month
            const startDate = new Date(examToday);
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setDate(faker.number.int({ min: 1, max: 15 }));
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 10);
            return { startDate, endDate, status: 'completed' };
          } else if (variant === 1) {
            // In progress this week
            const startDate = new Date(examToday);
            startDate.setDate(startDate.getDate() - 2);
            const endDate = new Date(examToday);
            endDate.setDate(endDate.getDate() + 5);
            return { startDate, endDate, status: 'in_progress' };
          } else {
            // Scheduled for next month
            const startDate = new Date(examToday);
            startDate.setMonth(startDate.getMonth() + 1);
            startDate.setDate(faker.number.int({ min: 5, max: 20 }));
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 10);
            return { startDate, endDate, status: 'scheduled' };
          }
        }
      };

      let examIndex = 0;
      for (const examType of examTypes) {
        for (const subject of schoolSubjects) {
          // Only create one exam per subject per exam type (not per class)
          const { startDate, endDate, status } = getExamDateAndStatus(examType, examIndex);
          const exam = await models.Exam.create({
            school_id: school.id,
            name: `${examType.replace('_', ' ').toUpperCase()} - ${subject.name}`,
            exam_type: examType,
            academic_year: CONFIG.ACADEMIC_YEAR,
            start_date: startDate,
            end_date: endDate,
            class_id: null, // School-wide exam
            subject_id: subject.id,
            max_marks: 100,
            passing_marks: 33,
            status: status,
            is_active: true,
          }, { transaction, logging: false });
          schoolExams.push(exam);
          examIndex++;
        }
      }
      allData.exams.push(...schoolExams);
      console.log(`✅ ${schoolExams.length}`);

      // 3.9: Create Exam Results for COMPLETED exams with realistic score distribution
      process.stdout.write('   📊 Exam results... ');
      const schoolExamResults: any[] = [];
      
      // Helper to generate realistic marks with distribution:
      // 5% fail (< 33), 15% low scores (33-50), 30% average (50-70), 35% good (70-85), 15% excellent (85-100)
      const getRealisticMarks = (maxMarks: number): number => {
        const rand = Math.random() * 100;
        if (rand < 5) {
          // Failing (0-32%)
          return faker.number.float({ min: 0, max: maxMarks * 0.32, fractionDigits: 2 });
        } else if (rand < 20) {
          // Low scores (33-50%)
          return faker.number.float({ min: maxMarks * 0.33, max: maxMarks * 0.50, fractionDigits: 2 });
        } else if (rand < 50) {
          // Average (50-70%)
          return faker.number.float({ min: maxMarks * 0.50, max: maxMarks * 0.70, fractionDigits: 2 });
        } else if (rand < 85) {
          // Good (70-85%)
          return faker.number.float({ min: maxMarks * 0.70, max: maxMarks * 0.85, fractionDigits: 2 });
        } else {
          // Excellent (85-100%)
          return faker.number.float({ min: maxMarks * 0.85, max: maxMarks, fractionDigits: 2 });
        }
      };

      // Get completed exams
      const completedExams = schoolExams.filter((e: any) => e.status === 'completed');
      
      // For each completed exam, create results for all students
      for (const exam of completedExams) {
        if (!exam.subject_id) continue;
        
        // Sample students for this exam (200 per exam to keep reasonable)
        const examStudents = faker.helpers.arrayElements(schoolStudents, Math.min(200, schoolStudents.length));
        
        for (const student of examStudents) {
          const marks = getRealisticMarks(exam.max_marks);
          const grade = marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B+' : marks >= 60 ? 'B' : marks >= 50 ? 'C' : marks >= 33 ? 'D' : 'F';
          
          schoolExamResults.push({
            school_id: school.id,
            exam_id: exam.id,
            student_id: student.id,
            subject_id: exam.subject_id,
            marks_obtained: marks,
            max_marks: exam.max_marks,
            grade: grade,
            remarks: grade === 'F' ? 'Needs improvement' : faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.1 }),
          });
        }
      }
      
      // Batch insert exam results
      const resultBatchSize = 1000;
      for (let i = 0; i < schoolExamResults.length; i += resultBatchSize) {
        const batch = schoolExamResults.slice(i, i + resultBatchSize);
        await models.ExamResult.bulkCreate(batch, { transaction, logging: false });
      }
      
      allData.examResults.push(...schoolExamResults);
      console.log(`✅ ${schoolExamResults.length.toLocaleString()}`);

      // 3.10: Create Fees (using batch inserts for performance)
      process.stdout.write('   💰 Fees... ');
      const schoolFees: any[] = [];
      let feeCount = 0;
      
      // Generate fee data in memory first, then batch insert
      for (const student of schoolStudents) {
        // Monthly tuition fees (12 months)
        for (let month = 1; month <= 12; month++) {
          schoolFees.push({
            school_id: school.id,
            student_id: student.id,
            fee_type: 'tuition',
            amount: faker.number.float({ min: 2000, max: 5000, fractionDigits: 2 }),
            due_date: new Date(2024, month - 1, 15),
            status: faker.helpers.arrayElement(['pending', 'paid', 'partial'] as const),
            payment_method: faker.helpers.maybe(() => faker.helpers.arrayElement(['cash', 'online', 'cheque']), { probability: 0.3 }),
            receipt_number: faker.helpers.maybe(() => `RCP${faker.string.alphanumeric(8).toUpperCase()}`, { probability: 0.3 }),
            academic_year: CONFIG.ACADEMIC_YEAR,
          });
          feeCount++;
        }

        // Other fees (library, transport, hostel) - only for 30% of students
        if (faker.helpers.maybe(() => true, { probability: 0.3 })) {
          const otherFeeTypes = ['library', 'transport', 'hostel'];
          for (const feeType of otherFeeTypes) {
            if (faker.helpers.maybe(() => true, { probability: 0.5 })) {
              schoolFees.push({
                school_id: school.id,
                student_id: student.id,
                fee_type: feeType,
                amount: faker.number.float({ min: 500, max: 2000, fractionDigits: 2 }),
                due_date: faker.date.future({ years: 1 }),
                status: faker.helpers.arrayElement(['pending', 'paid'] as const),
                payment_method: faker.helpers.maybe(() => faker.helpers.arrayElement(['cash', 'online']), { probability: 0.4 }),
                receipt_number: faker.helpers.maybe(() => `RCP${faker.string.alphanumeric(8).toUpperCase()}`, { probability: 0.4 }),
                academic_year: CONFIG.ACADEMIC_YEAR,
              });
              feeCount++;
            }
          }
        }
      }
      
      // Batch insert fees in chunks for performance
      const feeBatchSize = 1000;
      let insertedCount = 0;
      for (let i = 0; i < schoolFees.length; i += feeBatchSize) {
        const batch = schoolFees.slice(i, i + feeBatchSize);
        await models.Fee.bulkCreate(batch, { transaction, logging: false, validate: true });
        insertedCount += batch.length;
        if (i % (feeBatchSize * 5) === 0 || i + feeBatchSize >= schoolFees.length) {
          process.stdout.write(`\r   💰 Fees... ${insertedCount.toLocaleString()}/${schoolFees.length.toLocaleString()}`);
        }
      }
      allData.fees.push(...schoolFees);
      console.log(` ✅ ${schoolFees.length.toLocaleString()}`);

      // 3.11: Create Attendance (last 30 days + today) - using batch inserts
      process.stdout.write('   📅 Attendance records... ');
      const schoolAttendances: any[] = [];
      const today = new Date();
      const teachers = schoolStaff.filter(s => s.designation === 'Teacher');
      
      // Helper function to get realistic attendance status and leave type
      // Distribution: 85% present, 10% absent, 4% late, 1% excused
      const getAttendanceData = (): { status: 'present' | 'absent' | 'late' | 'excused'; leave_type: 'planned' | 'unplanned' | null } => {
        const rand = Math.random() * 100;
        if (rand < 85) return { status: 'present', leave_type: null };
        if (rand < 95) {
          // Absent: 70% unplanned, 30% planned
          return { status: 'absent', leave_type: Math.random() < 0.7 ? 'unplanned' : 'planned' };
        }
        if (rand < 99) return { status: 'late', leave_type: null };
        // Excused: 90% planned, 10% unplanned
        return { status: 'excused', leave_type: Math.random() < 0.9 ? 'planned' : 'unplanned' };
      };
      
      // Generate attendance for ALL students for the last 30 days including today
      // To keep reasonable data size, we use a sample for historical and all for recent days
      const historicalDays = 28; // Days 2-30 ago: sample of students
      const recentDays = 2; // Days 0-1 (today and yesterday): ALL students
      
      // Map of class_id to class teacher
      const classTeacherMap: Record<string, any> = {};
      schoolClasses.forEach(c => {
        const teacher = c.class_teacher_id 
          ? schoolStaff.find(s => s.id === c.class_teacher_id)
          : faker.helpers.arrayElement(teachers);
        classTeacherMap[c.id] = teacher || faker.helpers.arrayElement(teachers);
      });
      
      // For recent days (today and yesterday) - mark all students
      for (let day = 0; day < recentDays; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - day);
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        for (const student of schoolStudents) {
          const markingTeacher = classTeacherMap[student.class_id];
          const attendanceData = getAttendanceData();
          schoolAttendances.push({
            school_id: school.id,
            student_id: student.id,
            class_id: student.class_id,
            date: date,
            status: attendanceData.status,
            leave_type: attendanceData.leave_type,
            marked_by: markingTeacher?.id || teachers[0]?.id,
            remarks: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.05 }),
          });
        }
      }
      
      // For historical days (2-30 days ago) - sample 2000 students per day
      const sampleSize = Math.min(2000, schoolStudents.length);
      for (let day = recentDays; day < 30; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - day);
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        // Randomly sample students for historical data
        const sampledStudents = faker.helpers.arrayElements(schoolStudents, sampleSize);
        
        for (const student of sampledStudents) {
          const markingTeacher = classTeacherMap[student.class_id];
          const attendanceData = getAttendanceData();
          schoolAttendances.push({
            school_id: school.id,
            student_id: student.id,
            class_id: student.class_id,
            date: date,
            status: attendanceData.status,
            leave_type: attendanceData.leave_type,
            marked_by: markingTeacher?.id || teachers[0]?.id,
            remarks: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.05 }),
          });
        }
      }
      
      // Batch insert attendances
      const attendanceBatchSize = 1000;
      let insertedAttendance = 0;
      for (let i = 0; i < schoolAttendances.length; i += attendanceBatchSize) {
        const batch = schoolAttendances.slice(i, i + attendanceBatchSize);
        await models.Attendance.bulkCreate(batch, { transaction, logging: false, validate: true });
        insertedAttendance += batch.length;
        if (i % (attendanceBatchSize * 10) === 0 || i + attendanceBatchSize >= schoolAttendances.length) {
          process.stdout.write(`\r   📅 Attendance records... ${insertedAttendance.toLocaleString()}/${schoolAttendances.length.toLocaleString()}`);
        }
      }
      allData.attendances.push(...schoolAttendances);
      console.log(` ✅ ${schoolAttendances.length.toLocaleString()}`);

      // 3.12: Create Timetables
      process.stdout.write('   ⏰ Timetables... ');
      const schoolTimetables = [];
      const periods = [
        { number: 1, start: '08:00', end: '08:45' },
        { number: 2, start: '08:45', end: '09:30' },
        { number: 3, start: '09:30', end: '10:15' },
        { number: 4, start: '10:30', end: '11:15' },
        { number: 5, start: '11:15', end: '12:00' },
        { number: 6, start: '12:00', end: '12:45' },
        { number: 7, start: '13:30', end: '14:15' },
        { number: 8, start: '14:15', end: '15:00' },
      ];

      for (const classData of schoolClasses) {
        const classTeachers = schoolStaff.filter(s => s.designation === 'Teacher').slice(0, schoolSubjects.length);
        for (let day = 1; day <= 5; day++) { // Monday to Friday
          for (const period of periods) {
            const subject = faker.helpers.arrayElement(schoolSubjects);
            const teacher = faker.helpers.arrayElement(classTeachers);
            const timetable = await models.Timetable.create({
              school_id: school.id,
              class_id: classData.id,
              subject_id: subject.id,
              teacher_id: teacher.id,
              day_of_week: day,
              period_number: period.number,
              start_time: period.start,
              end_time: period.end,
              room: `Room ${faker.number.int({ min: 101, max: 210 })}`,
              academic_year: CONFIG.ACADEMIC_YEAR,
              is_active: true,
            }, { transaction, logging: false });
            schoolTimetables.push(timetable);
          }
        }
      }
      allData.timetables.push(...schoolTimetables);
      console.log(`✅ ${schoolTimetables.length}`);

      // 3.13: Create Library Transactions
      process.stdout.write('   📖 Library transactions... ');
      const schoolLibraryTransactions = [];
      for (const book of schoolBooks.slice(0, 100)) {
        for (let t = 0; t < faker.number.int({ min: 1, max: 3 }); t++) {
          const student = faker.helpers.arrayElement(schoolStudents);
          const issueDate = faker.date.past({ years: 1 });
          const dueDate = new Date(issueDate);
          dueDate.setDate(dueDate.getDate() + 14); // 14 days loan period
          const isReturned = faker.helpers.maybe(() => true, { probability: 0.7 });
          
          const libTransaction = await models.LibraryTransaction.create({
            school_id: school.id,
            book_id: book.id,
            student_id: student.id,
            transaction_type: faker.helpers.arrayElement(['issue', 'return', 'renew'] as const),
            issue_date: issueDate,
            due_date: dueDate,
            return_date: isReturned ? faker.date.between({ from: issueDate, to: new Date() }) : undefined,
            fine_amount: isReturned && faker.helpers.maybe(() => true, { probability: 0.2 }) 
              ? faker.number.float({ min: 10, max: 100, fractionDigits: 2 }) 
              : undefined,
            status: isReturned ? 'returned' : (new Date() > dueDate ? 'overdue' : 'active'),
            remarks: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.1 }),
          }, { transaction, logging: false });
          schoolLibraryTransactions.push(libTransaction);
        }
      }
      allData.libraryTransactions.push(...schoolLibraryTransactions);
      console.log(`✅ ${schoolLibraryTransactions.length.toLocaleString()}`);

      // 3.14: Create Notifications
      process.stdout.write('   🔔 Notifications... ');
      const schoolNotifications = [];
      const notificationTypes: Array<'info' | 'alert' | 'reminder' | 'announcement'> = ['info', 'alert', 'reminder', 'announcement'];
      const priorities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
      
      for (let n = 0; n < 50; n++) {
        const recipientType = faker.helpers.arrayElement(['student', 'staff', 'parent', 'all'] as const);
          const recipientId = recipientType !== 'all' 
            ? (recipientType === 'student' 
                ? faker.helpers.arrayElement(schoolStudents).id 
                : faker.helpers.arrayElement(schoolStaff).id)
            : undefined;
          
          const notification = await models.Notification.create({
            school_id: school.id,
            recipient_type: recipientType,
            recipient_id: recipientId,
            title: faker.lorem.sentence({ min: 3, max: 6 }),
            message: faker.lorem.paragraph(),
            notification_type: faker.helpers.arrayElement(notificationTypes),
            priority: faker.helpers.arrayElement(priorities),
            is_read: faker.helpers.maybe(() => true, { probability: 0.4 }) ?? false,
            read_at: faker.helpers.maybe(() => faker.date.past(), { probability: 0.4 }),
          }, { transaction, logging: false });
        schoolNotifications.push(notification);
      }
      allData.notifications.push(...schoolNotifications);
      console.log(`✅ ${schoolNotifications.length}`);
    }

    // Commit transaction
    await transaction.commit();
    console.log('\n✅ Transaction committed successfully!');

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`🏫 Schools: ${allData.schools.length}`);
    console.log(`📚 Subjects: ${allData.subjects.length}`);
    console.log(`🚌 Transport Routes: ${allData.transportRoutes.length}`);
    console.log(`👨‍🏫 Staff: ${allData.staff.length}`);
    console.log(`🎓 Classes: ${allData.classes.length}`);
    console.log(`👥 Students: ${allData.students.length}`);
    console.log(`📖 Library Books: ${allData.libraryBooks.length}`);
    console.log(`📦 Inventory Items: ${allData.inventoryItems.length}`);
    console.log(`📝 Exams: ${allData.exams.length}`);
    console.log(`📊 Exam Results: ${allData.examResults.length}`);
    console.log(`💰 Fees: ${allData.fees.length}`);
    console.log(`📅 Attendance Records: ${allData.attendances.length}`);
    console.log(`⏰ Timetable Entries: ${allData.timetables.length}`);
    console.log(`📚 Library Transactions: ${allData.libraryTransactions.length}`);
    console.log(`🔔 Notifications: ${allData.notifications.length}`);
    console.log('='.repeat(60));

    console.log('\n🔑 Login Credentials:');
    console.log('   Password for all accounts: teacher@123');
    for (let i = 0; i < allData.schools.length; i++) {
      console.log(`   School ${i + 1}: admin@school${i + 1}.edu.in`);
    }

    console.log('\n✅ Enterprise-grade database seeding completed successfully!');
    process.exit(0);
  } catch (error: any) {
    await transaction.rollback();
    console.error('\n❌ Seeding failed! Transaction rolled back.');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

seedDatabase();