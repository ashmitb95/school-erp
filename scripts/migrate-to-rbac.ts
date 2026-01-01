import * as dotenv from 'dotenv';
import * as path from 'path';
import { sequelize } from '../shared/database/config';
import models from '../shared/database/models';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Staff, Role, StaffRole, School } = models;

// Designation to Role mapping
const DESIGNATION_TO_ROLE_MAP: Record<string, string> = {
  'Administrator': 'principal',      // Administrators become Principals
  'Teacher': 'teacher',               // Teachers remain Teachers
  'Principal': 'principal',           // If Principal designation exists
  'Accountant': 'accountant',         // If Accountant designation exists
  'Librarian': 'librarian',          // If Librarian designation exists
  'HR Manager': 'hr-manager',        // If HR Manager designation exists
  'Transport Manager': 'transport-manager', // If Transport Manager designation exists
};

async function migrateToRBAC() {
  const transaction = await sequelize.transaction({ logging: false });
  
  try {
    console.log('🔄 Starting RBAC migration...');
    console.log('📋 Mapping designations to roles:\n');
    Object.entries(DESIGNATION_TO_ROLE_MAP).forEach(([designation, role]) => {
      console.log(`   ${designation} → ${role}`);
    });
    console.log('   (Other designations → teacher)\n');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Step 1: Get all active staff
    process.stdout.write('👥 Loading staff members... ');
    const allStaff = await Staff.findAll({
      where: { is_active: true },
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name'],
        },
      ],
      transaction,
    });
    console.log(`✅ ${allStaff.length} staff members found\n`);

    // Step 2: Get all schools
    const schools = await School.findAll({ where: { is_active: true }, transaction });
    console.log(`🏫 Found ${schools.length} active schools\n`);

    // Step 3: Get all roles for each school
    const roleCache: Record<string, Record<string, any>> = {};
    for (const school of schools) {
      roleCache[school.id] = {};
      const roles = await Role.findAll({
        where: { school_id: school.id, is_system_role: false },
        transaction,
      });
      for (const role of roles) {
        roleCache[school.id][role.name] = role;
      }
    }

    // Step 4: Migrate each staff member
    process.stdout.write('🔄 Migrating staff to roles... ');
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const staff of allStaff) {
      try {
        const staffId = staff.get('id') as string;
        const designation = staff.get('designation') as string;
        const schoolId = staff.get('school_id') as string;
        const school = staff.get('school') as any;

        // Check if staff already has roles assigned
        const existingRoles = await StaffRole.count({
          where: { staff_id: staffId },
          transaction,
        });

        if (existingRoles > 0) {
          skipped++;
          continue; // Skip if already has roles
        }

        // Map designation to role name
        const roleName = DESIGNATION_TO_ROLE_MAP[designation] || 'teacher';

        // Get role for this school
        const role = roleCache[schoolId]?.[roleName];

        if (!role) {
          console.error(`\n⚠️  Role '${roleName}' not found for school ${school?.name || schoolId}`);
          errors++;
          continue;
        }

        // Assign role to staff
        await StaffRole.create({
          staff_id: staffId,
          role_id: role.id,
          assigned_by: staffId, // Self-assigned during migration
          assigned_at: new Date(),
        }, { transaction });

        migrated++;
      } catch (error: any) {
        console.error(`\n❌ Error migrating staff ${staff.get('employee_id')}:`, error.message);
        errors++;
      }
    }

    console.log(`✅ Migration complete!\n`);
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped (already has roles): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total: ${allStaff.length}\n`);

    // Step 5: Create super-admin user if doesn't exist
    process.stdout.write('👑 Checking for super-admin... ');
    const superAdminRole = await Role.findOne({
      where: { name: 'super-admin', is_system_role: true },
      transaction,
    });

    if (superAdminRole) {
      // Check if any staff has super-admin role
      const superAdminCount = await StaffRole.count({
        where: { role_id: superAdminRole.id },
        transaction,
      });

      if (superAdminCount === 0) {
        console.log('\n⚠️  No super-admin found. You may want to manually assign super-admin role to a staff member.');
        console.log('   Use: POST /api/rbac/staff/:id/roles with role_id of super-admin');
      } else {
        console.log(`✅ ${superAdminCount} super-admin(s) found`);
      }
    } else {
      console.log('⚠️  Super-admin role not found. Run seed-rbac-defaults.ts first.');
    }

    await transaction.commit();
    console.log('\n✅ Migration transaction committed successfully!');
    process.exit(0);
  } catch (error: any) {
    await transaction.rollback();
    console.error('\n❌ Migration failed! Transaction rolled back.');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

migrateToRBAC();

