import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Op } from 'sequelize';
import models from '../../../shared/database/models';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { requirePermission, requireRole } from '../middleware/permissions';
import { safeRedisDel } from '../../../shared/utils/redis';

const { Role, Permission, RolePermission, StaffRole, Staff, School } = models;

const router = Router();

// Note: Authentication is handled at the main server level (index.ts)
// All RBAC endpoints are already protected by requireAuth middleware

// Validation schemas
const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  is_system_role: z.boolean().default(false),
  school_id: z.string().uuid().optional(),
});

const assignRoleSchema = z.object({
  role_id: z.string().uuid(),
});

const assignPermissionSchema = z.object({
  permission_id: z.string().uuid(),
});

// ==================== ROLES ENDPOINTS ====================

// GET /api/rbac/roles - List all roles
router.get('/roles', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { school_id } = req.query;
    const userSchoolId = authReq.user?.school_id;

    const where: any = {};
    
    // Filter by school_id if provided, or show system roles + user's school roles
    if (school_id) {
      where.school_id = school_id;
    } else {
      // Show system roles and roles for user's school
      where[Op.or] = [
        { is_system_role: true },
        { school_id: userSchoolId },
      ];
    }

    const roles = await Role.findAll({
      where,
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    res.json({ data: roles });
  } catch (error: any) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// POST /api/rbac/roles - Create role (super-admin only)
router.post('/roles', requireRole('super-admin'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const data = createRoleSchema.parse(req.body);
    const userSchoolId = authReq.user?.school_id;

    // Non-system roles must have school_id
    if (!data.is_system_role && !data.school_id && !userSchoolId) {
      return res.status(400).json({ error: 'school_id is required for non-system roles' });
    }

    const schoolId = data.school_id || userSchoolId;

    // Check if role with same name already exists for this school
    const existing = await Role.findOne({
      where: {
        name: data.name,
        school_id: data.is_system_role ? null : schoolId,
        is_system_role: data.is_system_role,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }

    const role = await Role.create({
      name: data.name,
      description: data.description,
      is_system_role: data.is_system_role,
      school_id: data.is_system_role ? null : schoolId,
    });

    res.status(201).json({ data: role });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/rbac/roles/:id - Get role details with permissions
router.get('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id, {
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name'],
          required: false,
        },
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
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({ data: role });
  } catch (error: any) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// PUT /api/rbac/roles/:id - Update role (super-admin only)
router.put('/roles/:id', requireRole('super-admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = createRoleSchema.partial().parse(req.body);

    const role = await Role.findByPk(id);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Cannot update system roles
    if (role.is_system_role) {
      return res.status(400).json({ error: 'Cannot update system roles' });
    }

    await role.update(data);

    // Invalidate cache for all staff with this role
    const staffRoles = await StaffRole.findAll({ where: { role_id: id } });
    for (const sr of staffRoles) {
      await safeRedisDel(`user:${sr.staff_id}:permissions`);
    }

    res.json({ data: role });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// DELETE /api/rbac/roles/:id - Delete role (super-admin only)
router.delete('/roles/:id', requireRole('super-admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Cannot delete system roles
    if (role.is_system_role) {
      return res.status(400).json({ error: 'Cannot delete system roles' });
    }

    // Check if role is assigned to any staff
    const staffCount = await StaffRole.count({ where: { role_id: id } });
    if (staffCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete role that is assigned to staff',
        message: `${staffCount} staff member(s) have this role`,
      });
    }

    // Delete role permissions first
    await RolePermission.destroy({ where: { role_id: id } });

    // Delete role
    await role.destroy();

    res.json({ message: 'Role deleted successfully' });
  } catch (error: any) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ==================== PERMISSIONS ENDPOINTS ====================

// GET /api/rbac/permissions - List all permissions
router.get('/permissions', async (req: Request, res: Response) => {
  try {
    const { resource, action } = req.query;

    const where: any = {};
    if (resource) where.resource = resource;
    if (action) where.action = action;

    const permissions = await Permission.findAll({
      where,
      order: [['resource', 'ASC'], ['action', 'ASC']],
    });

    res.json({ data: permissions });
  } catch (error: any) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ==================== STAFF ROLES ENDPOINTS ====================

// GET /api/rbac/staff/:id/roles - Get staff roles
router.get('/staff/:id/roles', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authReq = req as AuthRequest;

    // Users can only view their own roles unless they have permission
    if (id !== authReq.user?.id && !authReq.user?.permissions?.includes('rbac:read')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const staffRoles = await StaffRole.findAll({
      where: { staff_id: id },
      include: [
        {
          model: Role,
          as: 'role',
          include: [
            {
              model: School,
              as: 'school',
              attributes: ['id', 'name'],
              required: false,
            },
          ],
        },
        {
          model: Staff,
          as: 'assigner',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
      order: [['assigned_at', 'DESC']],
    });

    res.json({ data: staffRoles });
  } catch (error: any) {
    console.error('Get staff roles error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// POST /api/rbac/staff/:id/roles - Assign role to staff (super-admin only)
router.post('/staff/:id/roles', requireRole('super-admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authReq = req as AuthRequest;
    const data = assignRoleSchema.parse(req.body);

    // Verify staff exists
    const staff = await Staff.findByPk(id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Verify role exists
    const role = await Role.findByPk(data.role_id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if role is already assigned
    const existing = await StaffRole.findOne({
      where: { staff_id: id, role_id: data.role_id },
    });

    if (existing) {
      return res.status(400).json({ error: 'Role already assigned to this staff member' });
    }

    // Assign role
    const staffRole = await StaffRole.create({
      staff_id: id,
      role_id: data.role_id,
      assigned_by: authReq.user!.id,
      assigned_at: new Date(),
    });

    // Invalidate cache
    await safeRedisDel(`user:${id}:permissions`);

    res.status(201).json({ data: staffRole });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// DELETE /api/rbac/staff/:id/roles/:roleId - Remove role from staff (super-admin only)
router.delete('/staff/:id/roles/:roleId', requireRole('super-admin'), async (req: Request, res: Response) => {
  try {
    const { id, roleId } = req.params;

    const staffRole = await StaffRole.findOne({
      where: { staff_id: id, role_id: roleId },
    });

    if (!staffRole) {
      return res.status(404).json({ error: 'Role assignment not found' });
    }

    await staffRole.destroy();

    // Invalidate cache
    await safeRedisDel(`user:${id}:permissions`);

    res.json({ message: 'Role removed successfully' });
  } catch (error: any) {
    console.error('Remove role error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ==================== ROLE PERMISSIONS ENDPOINTS ====================

// POST /api/rbac/roles/:id/permissions - Assign permission to role (super-admin only)
router.post('/roles/:id/permissions', requireRole('super-admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = assignPermissionSchema.parse(req.body);

    // Verify role exists
    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Verify permission exists
    const permission = await Permission.findByPk(data.permission_id);
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    // Check if permission is already assigned
    const existing = await RolePermission.findOne({
      where: { role_id: id, permission_id: data.permission_id },
    });

    if (existing) {
      return res.status(400).json({ error: 'Permission already assigned to this role' });
    }

    // Assign permission
    const rolePermission = await RolePermission.create({
      role_id: id,
      permission_id: data.permission_id,
    });

    // Invalidate cache for all staff with this role
    const staffRoles = await StaffRole.findAll({ where: { role_id: id } });
    for (const sr of staffRoles) {
      await safeRedisDel(`user:${sr.staff_id}:permissions`);
    }

    res.status(201).json({ data: rolePermission });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Assign permission error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// DELETE /api/rbac/roles/:id/permissions/:permissionId - Remove permission from role (super-admin only)
router.delete('/roles/:id/permissions/:permissionId', requireRole('super-admin'), async (req: Request, res: Response) => {
  try {
    const { id, permissionId } = req.params;

    const rolePermission = await RolePermission.findOne({
      where: { role_id: id, permission_id: permissionId },
    });

    if (!rolePermission) {
      return res.status(404).json({ error: 'Permission assignment not found' });
    }

    await rolePermission.destroy();

    // Invalidate cache for all staff with this role
    const staffRoles = await StaffRole.findAll({ where: { role_id: id } });
    for (const sr of staffRoles) {
      await safeRedisDel(`user:${sr.staff_id}:permissions`);
    }

    res.json({ message: 'Permission removed successfully' });
  } catch (error: any) {
    console.error('Remove permission error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ==================== USER PERMISSIONS ENDPOINTS ====================

// GET /api/rbac/me/permissions - Get current user's permissions
router.get('/me/permissions', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({
      data: {
        roles: user.roles || [],
        permissions: user.permissions || [],
        designation: user.designation, // Legacy
      },
    });
  } catch (error: any) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

export default router;

