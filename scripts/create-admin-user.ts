import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { sequelize } from '../shared/database/config';
import models from '../shared/database/models';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { School, Staff, Role, StaffRole } = models;

async function createAdminUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Create or get school
    let school = await School.findOne({ where: { code: 'SCH001' } });
    
    if (!school) {
      console.log('📚 Creating school...');
      school = await School.create({
        name: 'School 2',
        code: 'SCH001',
        address: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        phone: '9876543210',
        email: 'info@school2.edu.in',
        principal_name: 'Principal Name',
        principal_email: 'principal@school2.edu.in',
        board: 'CBSE',
        established_year: 2000,
        is_active: true,
      });
      console.log(`✅ School created: ${school.get('name')} (${school.get('id')})`);
    } else {
      console.log(`✅ School found: ${school.get('name')} (${school.get('id')})`);
    }

    // Check if admin user exists
    const existingAdmin = await Staff.findOne({
      where: { email: 'admin@school2.edu.in' },
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log(`   Email: ${existingAdmin.get('email')}`);
      console.log(`   Name: ${existingAdmin.get('first_name')} ${existingAdmin.get('last_name')}`);
      process.exit(0);
    }

    // Create admin user
    console.log('👤 Creating admin user...');
    const passwordHash = await bcrypt.hash('teacher@123', 10);
    
    const admin = await Staff.create({
      school_id: school.get('id') as string,
      employee_id: 'EMP001',
      first_name: 'Admin',
      last_name: 'User',
      date_of_birth: new Date('1990-01-01'),
      gender: 'male',
      designation: 'Administrator',
      qualification: 'B.Ed',
      experience_years: 5,
      phone: '9876543210',
      email: 'admin@school2.edu.in',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      joining_date: new Date('2024-01-01'),
      password: passwordHash,
      is_active: true,
    });

    // Assign principal role to admin
    const principalRole = await Role.findOne({
      where: { name: 'principal', school_id: school.get('id') as string },
    });
    
    if (principalRole) {
      // Check if role is already assigned
      const existingRole = await StaffRole.findOne({
        where: { staff_id: admin.get('id'), role_id: principalRole.id },
      });
      
      if (!existingRole) {
        await StaffRole.create({
          staff_id: admin.get('id') as string,
          role_id: principalRole.id,
          assigned_by: admin.get('id') as string,
          assigned_at: new Date(),
        });
        console.log('✅ Principal role assigned to admin');
      } else {
        console.log('ℹ️  Principal role already assigned');
      }
    } else {
      console.log('⚠️  Principal role not found. Run seed-rbac-defaults.ts first.');
    }

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${admin.get('email')}`);
    console.log(`   Password: teacher@123`);
    console.log(`   Name: ${admin.get('first_name')} ${admin.get('last_name')}`);
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createAdminUser();



