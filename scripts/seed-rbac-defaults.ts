import * as dotenv from 'dotenv';
import * as path from 'path';
import { sequelize } from '../shared/database/config';
import models from '../shared/database/models';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Default roles configuration
const DEFAULT_ROLES = [
  {
    name: 'super-admin',
    description: 'System-wide administrator with all permissions',
    is_system_role: true,
    school_id: null,
  },
  {
    name: 'principal',
    description: 'School principal with full school access',
    is_system_role: false,
  },
  {
    name: 'teacher',
    description: 'Teacher with class and subject management permissions',
    is_system_role: false,
  },
  {
    name: 'hr-manager',
    description: 'HR Manager with staff and payroll management permissions',
    is_system_role: false,
  },
  {
    name: 'accountant',
    description: 'Accountant with fee and payroll view permissions',
    is_system_role: false,
  },
  {
    name: 'transport-manager',
    description: 'Transport Manager with transport route management permissions',
    is_system_role: false,
  },
  {
    name: 'librarian',
    description: 'Librarian with library management permissions',
    is_system_role: false,
  },
  {
    name: 'parent',
    description: 'Parent with read access to own children\'s data',
    is_system_role: false,
  },
  {
    name: 'student',
    description: 'Student with read access to own data',
    is_system_role: false,
  },
];

// Default permissions - resource:action pairs
const DEFAULT_PERMISSIONS = [
  // Students
  { resource: 'students', action: 'create', description: 'Create new students' },
  { resource: 'students', action: 'read', description: 'View students' },
  { resource: 'students', action: 'update', description: 'Update student information' },
  { resource: 'students', action: 'delete', description: 'Delete students' },
  { resource: 'students', action: 'export', description: 'Export student data' },
  
  // Fees
  { resource: 'fees', action: 'create', description: 'Create fee records' },
  { resource: 'fees', action: 'read', description: 'View fees' },
  { resource: 'fees', action: 'update', description: 'Update fee records' },
  { resource: 'fees', action: 'delete', description: 'Delete fee records' },
  { resource: 'fees', action: 'approve', description: 'Approve fee payments' },
  { resource: 'fees', action: 'pay', description: 'Process fee payments' },
  { resource: 'fees', action: 'export', description: 'Export fee data' },
  
  // Attendance
  { resource: 'attendance', action: 'create', description: 'Mark attendance' },
  { resource: 'attendance', action: 'read', description: 'View attendance' },
  { resource: 'attendance', action: 'update', description: 'Update attendance records' },
  { resource: 'attendance', action: 'export', description: 'Export attendance data' },
  
  // Exams
  { resource: 'exams', action: 'create', description: 'Create exams' },
  { resource: 'exams', action: 'read', description: 'View exams' },
  { resource: 'exams', action: 'update', description: 'Update exams' },
  { resource: 'exams', action: 'delete', description: 'Delete exams' },
  { resource: 'exams', action: 'export', description: 'Export exam data' },
  
  // Exam Results
  { resource: 'exam_results', action: 'create', description: 'Enter exam results' },
  { resource: 'exam_results', action: 'read', description: 'View exam results' },
  { resource: 'exam_results', action: 'update', description: 'Update exam results' },
  
  // Staff
  { resource: 'staff', action: 'create', description: 'Create staff members' },
  { resource: 'staff', action: 'read', description: 'View staff' },
  { resource: 'staff', action: 'update', description: 'Update staff information' },
  { resource: 'staff', action: 'delete', description: 'Delete staff' },
  
  // HR
  { resource: 'hr', action: 'create', description: 'Create HR records' },
  { resource: 'hr', action: 'read', description: 'View HR data' },
  { resource: 'hr', action: 'update', description: 'Update HR records' },
  { resource: 'hr', action: 'delete', description: 'Delete HR records' },
  { resource: 'hr', action: 'approve', description: 'Approve HR requests' },
  
  // Payroll
  { resource: 'payroll', action: 'read', description: 'View payroll data' },
  { resource: 'payroll', action: 'generate', description: 'Generate payroll' },
  { resource: 'payroll', action: 'approve', description: 'Approve payroll' },
  
  // Leaves
  { resource: 'leaves', action: 'read', description: 'View leave requests' },
  { resource: 'leaves', action: 'approve', description: 'Approve leave requests' },
  { resource: 'leaves', action: 'reject', description: 'Reject leave requests' },
  
  // Analytics
  { resource: 'analytics', action: 'read', description: 'View analytics' },
  { resource: 'analytics', action: 'export', description: 'Export analytics data' },
  
  // Admission
  { resource: 'admission', action: 'create', description: 'Create admission applications' },
  { resource: 'admission', action: 'read', description: 'View admission applications' },
  { resource: 'admission', action: 'update', description: 'Update admission applications' },
  { resource: 'admission', action: 'approve', description: 'Approve admission applications' },
  { resource: 'admission', action: 'reject', description: 'Reject admission applications' },
  
  // Calendar
  { resource: 'calendar', action: 'create', description: 'Create calendar events' },
  { resource: 'calendar', action: 'read', description: 'View calendar events' },
  { resource: 'calendar', action: 'update', description: 'Update calendar events' },
  { resource: 'calendar', action: 'delete', description: 'Delete calendar events' },
  
  // Video Sessions
  { resource: 'video_sessions', action: 'create', description: 'Create video sessions' },
  { resource: 'video_sessions', action: 'read', description: 'View video sessions' },
  { resource: 'video_sessions', action: 'update', description: 'Update video sessions' },
  
  // Transport Routes
  { resource: 'transport_routes', action: 'create', description: 'Create transport routes' },
  { resource: 'transport_routes', action: 'read', description: 'View transport routes' },
  { resource: 'transport_routes', action: 'update', description: 'Update transport routes' },
  { resource: 'transport_routes', action: 'delete', description: 'Delete transport routes' },
  
  // Library
  { resource: 'library_books', action: 'create', description: 'Add library books' },
  { resource: 'library_books', action: 'read', description: 'View library books' },
  { resource: 'library_books', action: 'update', description: 'Update library books' },
  { resource: 'library_books', action: 'delete', description: 'Delete library books' },
  
  // Library Transactions
  { resource: 'library_transactions', action: 'create', description: 'Create library transactions' },
  { resource: 'library_transactions', action: 'read', description: 'View library transactions' },
  { resource: 'library_transactions', action: 'update', description: 'Update library transactions' },
  
  // Timetable
  { resource: 'timetable', action: 'read', description: 'View timetable' },
  
  // RBAC
  { resource: 'rbac', action: 'read', description: 'View roles and permissions' },
  { resource: 'rbac', action: 'create', description: 'Create roles and permissions' },
  { resource: 'rbac', action: 'update', description: 'Update roles and permissions' },
  { resource: 'rbac', action: 'delete', description: 'Delete roles and permissions' },
];

// Role-Permission mappings
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'super-admin': ['*:*'], // Wildcard for all permissions
  
  'principal': [
    'students:create', 'students:read', 'students:update', 'students:delete', 'students:export',
    'fees:read', 'fees:update', 'fees:approve', 'fees:export',
    'attendance:read', 'attendance:update', 'attendance:export',
    'exams:create', 'exams:read', 'exams:update', 'exams:delete', 'exams:export',
    'staff:read', 'staff:update',
    'hr:read', 'hr:approve',
    'analytics:read', 'analytics:export',
    'admission:create', 'admission:read', 'admission:update', 'admission:approve', 'admission:reject',
    'calendar:create', 'calendar:read', 'calendar:update', 'calendar:delete',
    'transport_routes:read',
    'library_books:read',
    'library_transactions:read',
    'timetable:read',
    'rbac:read',
  ],
  
  'teacher': [
    'students:read',
    'attendance:create', 'attendance:read', 'attendance:update',
    'exams:create', 'exams:read', 'exams:update',
    'exam_results:create', 'exam_results:read', 'exam_results:update',
    'calendar:read',
    'video_sessions:create', 'video_sessions:read', 'video_sessions:update',
    'timetable:read',
  ],
  
  'hr-manager': [
    'staff:read', 'staff:update',
    'hr:create', 'hr:read', 'hr:update', 'hr:delete', 'hr:approve',
    'payroll:read', 'payroll:generate', 'payroll:approve',
    'leaves:read', 'leaves:approve', 'leaves:reject',
  ],
  
  'accountant': [
    'fees:create', 'fees:read', 'fees:update', 'fees:delete', 'fees:approve', 'fees:export',
    'students:read',
    'payroll:read',
  ],
  
  'transport-manager': [
    'transport_routes:create', 'transport_routes:read', 'transport_routes:update', 'transport_routes:delete',
    'students:read',
  ],
  
  'librarian': [
    'library_books:create', 'library_books:read', 'library_books:update', 'library_books:delete',
    'library_transactions:create', 'library_transactions:read', 'library_transactions:update',
  ],
  
  'parent': [
    'students:read',
    'attendance:read',
    'fees:read', 'fees:pay',
    'exams:read',
    'calendar:read',
  ],
  
  'student': [
    'students:read',
    'attendance:read',
    'fees:read', 'fees:pay',
    'exams:read',
    'timetable:read',
    'calendar:read',
  ],
};

async function seedRBACDefaults() {
  let transaction: any = null;
  
  try {
    console.log('🌱 Seeding RBAC defaults...');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');
    
    // Ensure models are initialized by syncing
    await sequelize.sync({ alter: false });
    console.log('✅ Models initialized\n');
    
    // Access models - same pattern as seed-database.ts
    const { Role, Permission, RolePermission, School } = models;
    
    // Verify models are available
    if (!Role || !Permission || !RolePermission || !School) {
      console.error('❌ Model check failed:');
      console.error('   Available model keys:', Object.keys(models));
      console.error('   Role:', !!Role);
      console.error('   Permission:', !!Permission);
      console.error('   RolePermission:', !!RolePermission);
      console.error('   School:', !!School);
      throw new Error('Models not properly initialized. Please ensure all model files are compiled and imported correctly.');
    }
    
    console.log('✅ All required models are available\n');
    
    transaction = await sequelize.transaction({ logging: false });
    
    // Step 1: Create all permissions
    process.stdout.write('📝 Creating permissions... ');
    const createdPermissions: Record<string, any> = {};
    
    for (const perm of DEFAULT_PERMISSIONS) {
      const [permission] = await Permission.findOrCreate({
        where: { resource: perm.resource, action: perm.action },
        defaults: {
          resource: perm.resource,
          action: perm.action,
          description: perm.description,
        },
        transaction,
      });
      const key = `${perm.resource}:${perm.action}`;
      createdPermissions[key] = permission;
    }
    console.log(`✅ ${Object.keys(createdPermissions).length} permissions\n`);
    
    // Step 2: Create system roles (super-admin)
    process.stdout.write('👤 Creating system roles... ');
    const superAdminRole = await Role.findOrCreate({
      where: { name: 'super-admin', is_system_role: true },
      defaults: {
        name: 'super-admin',
        description: 'System-wide administrator with all permissions',
        is_system_role: true,
        school_id: null,
      },
      transaction,
    });
    console.log('✅ System roles created\n');
    
    // Step 3: Assign all permissions to super-admin (wildcard handling)
    process.stdout.write('🔗 Assigning permissions to super-admin... ');
    // For super-admin, we'll assign all permissions
    for (const permission of Object.values(createdPermissions)) {
      await RolePermission.findOrCreate({
        where: {
          role_id: superAdminRole[0].id,
          permission_id: permission.id,
        },
        defaults: {
          role_id: superAdminRole[0].id,
          permission_id: permission.id,
        },
        transaction,
      });
    }
    console.log('✅ Permissions assigned\n');
    
    // Step 4: Create school-specific roles for each school
    process.stdout.write('🏫 Creating school-specific roles... ');
    const schools = await School.findAll({ where: { is_active: true }, transaction });
    
    for (const school of schools) {
      for (const roleDef of DEFAULT_ROLES.filter(r => !r.is_system_role)) {
        await Role.findOrCreate({
          where: { name: roleDef.name, school_id: school.id },
          defaults: {
            name: roleDef.name,
            description: roleDef.description,
            is_system_role: false,
            school_id: school.id,
          },
          transaction,
        });
      }
    }
    console.log(`✅ Roles created for ${schools.length} schools\n`);
    
    // Step 5: Assign permissions to each role for each school
    process.stdout.write('🔗 Assigning permissions to roles... ');
    let totalAssignments = 0;
    
    for (const school of schools) {
      for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
        if (roleName === 'super-admin') continue; // Already handled
        
        const role = await Role.findOne({
          where: { name: roleName, school_id: school.id },
          transaction,
        });
        
        if (!role) continue;
        
        for (const permKey of permissionKeys) {
          const permission = createdPermissions[permKey];
          if (permission) {
            await RolePermission.findOrCreate({
              where: {
                role_id: role.id,
                permission_id: permission.id,
              },
              defaults: {
                role_id: role.id,
                permission_id: permission.id,
              },
              transaction,
            });
            totalAssignments++;
          }
        }
      }
    }
    console.log(`✅ ${totalAssignments} permission assignments\n`);
    
    await transaction.commit();
    console.log('\n✅ RBAC defaults seeded successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Permissions: ${Object.keys(createdPermissions).length}`);
    console.log(`   - System Roles: 1 (super-admin)`);
    console.log(`   - School Roles: ${DEFAULT_ROLES.filter(r => !r.is_system_role).length} per school`);
    console.log(`   - Schools: ${schools.length}`);
    
    await sequelize.close();
    process.exit(0);
  } catch (error: any) {
    if (transaction) {
      await transaction.rollback();
    }
    console.error('\n❌ Seeding failed! Transaction rolled back.');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

seedRBACDefaults();

