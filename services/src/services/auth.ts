import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { sequelize } from '../../../shared/database/config';
import models from '../../../shared/database/models';
import { safeRedisDel } from '../../../shared/utils/redis';

const { Staff, School, StaffRole, Role, RolePermission, Permission } = models;

const router = Router();
const JWT_SECRET = (process.env.JWT_SECRET || 'your-secret-key') as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find staff by email (without include first to avoid association issues)
    const staff = await Staff.findOne({
      where: { email, is_active: true },
    });

    if (!staff) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get password from staff record
    const staffPassword = staff.get('password') as string;
    if (!staffPassword) {
      console.error('Staff found but no password set');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password with bcrypt
    const isValidPassword = await bcrypt.compare(password, staffPassword);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Load user roles and permissions
    const staffId = String(staff.get('id'));
    const staffRoles = await StaffRole.findAll({
      where: { staff_id: staffId },
      include: [
        {
          model: Role,
          as: 'role',
          include: [
            {
              model: RolePermission,
              as: 'role_permissions',
              include: [
                {
                  model: Permission,
                  as: 'permission',
                },
              ],
            },
          ],
        },
      ],
    });

    const roles: string[] = [];
    const permissions: string[] = [];
    const permissionSet = new Set<string>();

    for (const staffRole of staffRoles) {
      const role = staffRole.get('role') as any;
      if (role) {
        roles.push(role.name);

        // Check for super-admin wildcard
        if (role.name === 'super-admin') {
          permissions.push('*:*');
        } else {
          // Collect all permissions for this role
          const rolePermissions = role.role_permissions || [];
          for (const rp of rolePermissions) {
            const permission = rp.get('permission') as any;
            if (permission) {
              const permKey = `${permission.resource}:${permission.action}`;
              if (!permissionSet.has(permKey)) {
                permissionSet.add(permKey);
                permissions.push(permKey);
              }
            }
          }
        }
      }
    }

    // Backward compatibility: If no roles assigned, use designation
    const designation = String(staff.get('designation'));
    if (roles.length === 0) {
      const designationToRole: Record<string, string> = {
        'Administrator': 'principal',
        'Teacher': 'teacher',
        'Principal': 'principal',
        'Accountant': 'accountant',
        'Librarian': 'librarian',
      };
      const mappedRole = designationToRole[designation] || 'teacher';
      roles.push(mappedRole);
      
      // Get basic permissions based on designation
      const designationPermissions: Record<string, string[]> = {
        'Administrator': [
          'students:create', 'students:read', 'students:update', 'students:delete', 'students:export',
          'fees:read', 'fees:update', 'fees:approve', 'fees:export',
          'attendance:read', 'attendance:update', 'attendance:export',
          'exams:create', 'exams:read', 'exams:update', 'exams:delete', 'exams:export',
          'staff:read', 'staff:update',
          'calendar:create', 'calendar:read', 'calendar:update', 'calendar:delete',
        ],
        'Teacher': [
          'students:read',
          'attendance:create', 'attendance:read', 'attendance:update',
          'exams:create', 'exams:read', 'exams:update',
          'exam_results:create', 'exam_results:read', 'exam_results:update',
          'calendar:read',
          'timetable:read',
        ],
      };
      permissions.push(...(designationPermissions[designation] || []));
    }

    // Generate JWT token
    const payload = {
      id: staffId,
      school_id: String(staff.get('school_id')),
      email: String(staff.get('email')),
      roles: roles,
      permissions: permissions,
      designation: designation, // Legacy field, kept for backward compatibility
    };
    const token = jwt.sign(payload as object, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

    res.json({
      token,
      user: {
        id: staff.get('id'),
        school_id: staff.get('school_id'),
        email: staff.get('email'),
        name: `${staff.get('first_name')} ${staff.get('last_name')}`,
        roles: roles,
        permissions: permissions,
        designation: designation,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Verify token endpoint
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Verify user still exists and is active
    const staff = await Staff.findOne({
      where: { id: decoded.id, is_active: true },
    });

    if (!staff) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Load fresh roles and permissions
    const staffRoles = await StaffRole.findAll({
      where: { staff_id: decoded.id },
      include: [
        {
          model: Role,
          as: 'role',
          include: [
            {
              model: RolePermission,
              as: 'role_permissions',
              include: [
                {
                  model: Permission,
                  as: 'permission',
                },
              ],
            },
          ],
        },
      ],
    });

    const roles: string[] = [];
    const permissions: string[] = [];
    const permissionSet = new Set<string>();

    for (const staffRole of staffRoles) {
      const role = staffRole.get('role') as any;
      if (role) {
        roles.push(role.name);
        if (role.name === 'super-admin') {
          permissions.push('*:*');
        } else {
          const rolePermissions = role.role_permissions || [];
          for (const rp of rolePermissions) {
            const permission = rp.get('permission') as any;
            if (permission) {
              const permKey = `${permission.resource}:${permission.action}`;
              if (!permissionSet.has(permKey)) {
                permissionSet.add(permKey);
                permissions.push(permKey);
              }
            }
          }
        }
      }
    }

    // Backward compatibility
    const designation = staff?.get('designation') as string || decoded.designation || '';
    if (roles.length === 0 && designation) {
      const designationToRole: Record<string, string> = {
        'Administrator': 'principal',
        'Teacher': 'teacher',
        'Principal': 'principal',
        'Accountant': 'accountant',
        'Librarian': 'librarian',
      };
      roles.push(designationToRole[designation] || 'teacher');
    }

    res.json({
      user: {
        id: decoded.id,
        school_id: decoded.school_id,
        email: decoded.email,
        roles: roles,
        permissions: permissions,
        designation: designation,
      },
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh permissions endpoint (without re-login)
router.get('/refresh-permissions', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Invalidate cache
    await safeRedisDel(`user:${decoded.id}:permissions`);

    // Load fresh roles and permissions
    const staffRoles = await StaffRole.findAll({
      where: { staff_id: decoded.id },
      include: [
        {
          model: Role,
          as: 'role',
          include: [
            {
              model: RolePermission,
              as: 'role_permissions',
              include: [
                {
                  model: Permission,
                  as: 'permission',
                },
              ],
            },
          ],
        },
      ],
    });

    const roles: string[] = [];
    const permissions: string[] = [];
    const permissionSet = new Set<string>();

    for (const staffRole of staffRoles) {
      const role = staffRole.get('role') as any;
      if (role) {
        roles.push(role.name);
        if (role.name === 'super-admin') {
          permissions.push('*:*');
        } else {
          const rolePermissions = role.role_permissions || [];
          for (const rp of rolePermissions) {
            const permission = rp.get('permission') as any;
            if (permission) {
              const permKey = `${permission.resource}:${permission.action}`;
              if (!permissionSet.has(permKey)) {
                permissionSet.add(permKey);
                permissions.push(permKey);
              }
            }
          }
        }
      }
    }

    res.json({
      roles,
      permissions,
    });
  } catch (error: any) {
    console.error('Refresh permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'auth' });
});

export default router;

