import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root FIRST
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// For migrations, prefer PUBLIC_DATABASE_URL (Railway public connection) if available
// Temporarily override DATABASE_URL so models use the public connection
const originalDatabaseUrl = process.env.DATABASE_URL;
if (process.env.PUBLIC_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.PUBLIC_DATABASE_URL;
  console.log('📡 Using PUBLIC_DATABASE_URL');
}

// Now import models - they will use the DATABASE_URL we just set
import models from '../shared/database/models';
import { sequelize } from '../shared/database/config';

// Restore original DATABASE_URL if we changed it
if (originalDatabaseUrl && process.env.PUBLIC_DATABASE_URL) {
  process.env.DATABASE_URL = originalDatabaseUrl;
}

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

