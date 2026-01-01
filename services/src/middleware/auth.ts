import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import models from '../../../shared/database/models';
import { safeRedisGet, safeRedisSetEx } from '../../../shared/utils/redis';

const { Staff, StaffRole, Role, RolePermission, Permission } = models;
const JWT_SECRET = (process.env.JWT_SECRET || 'your-secret-key') as string;
const PERMISSION_CACHE_TTL = 3600; // 1 hour

export interface AuthRequest extends Request {
  user?: {
    id: string;
    school_id: string;
    email: string;
    roles: string[];
    permissions: string[];
    designation: string; // Legacy field, kept for backward compatibility
  };
}

/**
 * Load user roles and permissions from database or cache
 */
async function loadUserRolesAndPermissions(staffId: string): Promise<{ roles: string[]; permissions: string[] }> {
  // Try to get from cache first
  const cacheKey = `user:${staffId}:permissions`;
  const cached = await safeRedisGet(cacheKey);
  
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return { roles: parsed.roles || [], permissions: parsed.permissions || [] };
    } catch (e) {
      // Cache corrupted, continue to database
    }
  }
  
  // Load from database
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
  
  // Cache the result
  await safeRedisSetEx(
    cacheKey,
    PERMISSION_CACHE_TTL,
    JSON.stringify({ roles, permissions })
  );
  
  return { roles, permissions };
}

/**
 * Get permissions based on designation (backward compatibility)
 */
function getDesignationPermissions(designation: string): string[] {
  const designationMap: Record<string, string[]> = {
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
  
  return designationMap[designation] || [];
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Verify user still exists and is active
    const staff = await Staff.findOne({
      where: { id: decoded.id, is_active: true },
    });

    if (!staff) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const designation = staff.get('designation') as string;
    const schoolId = staff.get('school_id') as string;
    const email = staff.get('email') as string;

    // Load roles and permissions from RBAC system
    let { roles, permissions } = await loadUserRolesAndPermissions(decoded.id);
    
    // Backward compatibility: If no roles assigned, use designation
    if (roles.length === 0) {
      // Map designation to role name
      const designationToRole: Record<string, string> = {
        'Administrator': 'principal',
        'Teacher': 'teacher',
        'Principal': 'principal',
        'Accountant': 'accountant',
        'Librarian': 'librarian',
      };
      
      const mappedRole = designationToRole[designation] || 'teacher';
      roles = [mappedRole];
      permissions = getDesignationPermissions(designation);
    }

    // Attach user to request
    (req as AuthRequest).user = {
      id: decoded.id,
      school_id: schoolId,
      email: email,
      roles: roles,
      permissions: permissions,
      designation: designation, // Legacy field, kept for reference
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

