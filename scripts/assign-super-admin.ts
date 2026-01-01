import * as dotenv from 'dotenv';
import * as path from 'path';
import { sequelize } from '../shared/database/config';
import models from '../shared/database/models';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Role, StaffRole, Staff } = models;

async function assignSuperAdmin() {
  try {
    const staffEmail = process.argv[2];
    
    if (!staffEmail) {
      console.error('❌ Usage: ts-node scripts/assign-super-admin.ts <staff-email>');
      console.error('   Example: ts-node scripts/assign-super-admin.ts admin@school1.edu.in');
      process.exit(1);
    }

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Find staff by email
    const staff = await Staff.findOne({
      where: { email: staffEmail, is_active: true },
    });

    if (!staff) {
      console.error(`❌ Staff member with email "${staffEmail}" not found or is inactive`);
      process.exit(1);
    }

    console.log(`👤 Found staff: ${staff.get('first_name')} ${staff.get('last_name')} (${staffEmail})`);

    // Find super-admin role
    const superAdminRole = await Role.findOne({
      where: { name: 'super-admin', is_system_role: true },
    });

    if (!superAdminRole) {
      console.error('❌ Super-admin role not found. Run seed-rbac-defaults.ts first.');
      process.exit(1);
    }

    // Check if already assigned
    const existing = await StaffRole.findOne({
      where: { staff_id: staff.get('id'), role_id: superAdminRole.id },
    });

    if (existing) {
      console.log('✅ Staff member already has super-admin role');
      process.exit(0);
    }

    // Assign super-admin role
    await StaffRole.create({
      staff_id: staff.get('id') as string,
      role_id: superAdminRole.id,
      assigned_by: staff.get('id') as string, // Self-assigned
      assigned_at: new Date(),
    });

    console.log('✅ Super-admin role assigned successfully!');
    console.log(`\n📝 Staff member "${staff.get('first_name')} ${staff.get('last_name')}" now has super-admin privileges.`);
    console.log('   They can now manage roles and permissions for all users.\n');

    await sequelize.close();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Assignment failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

assignSuperAdmin();

