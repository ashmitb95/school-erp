import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Check if user has a specific permission
 * Usage: requirePermission('students', 'create')
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      
      if (!authReq.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const permissions = authReq.user.permissions || [];
      const permissionKey = `${resource}:${action}`;
      
      // Check for wildcard permission (super-admin)
      const hasWildcard = permissions.includes('*:*');
      
      // Check for specific permission
      const hasPermission = permissions.includes(permissionKey);
      
      if (!hasWildcard && !hasPermission) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `Permission required: ${permissionKey}`,
        });
      }
      
      next();
    } catch (error: any) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Check if user has a specific role
 * Usage: requireRole('principal')
 */
export const requireRole = (roleName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      
      if (!authReq.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const roles = authReq.user.roles || [];
      
      // Check for super-admin role (has all permissions)
      const isSuperAdmin = roles.includes('super-admin');
      
      // Check for specific role
      const hasRole = roles.includes(roleName);
      
      if (!isSuperAdmin && !hasRole) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `Role required: ${roleName}`,
        });
      }
      
      next();
    } catch (error: any) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Check if user has any of the specified roles
 * Usage: requireAnyRole(['principal', 'teacher'])
 */
export const requireAnyRole = (roleNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      
      if (!authReq.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const roles = authReq.user.roles || [];
      
      // Check for super-admin role
      const isSuperAdmin = roles.includes('super-admin');
      
      // Check if user has any of the required roles
      const hasAnyRole = roleNames.some(roleName => roles.includes(roleName));
      
      if (!isSuperAdmin && !hasAnyRole) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `One of these roles required: ${roleNames.join(', ')}`,
        });
      }
      
      next();
    } catch (error: any) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Check if user has all of the specified roles
 * Usage: requireAllRoles(['principal', 'hr-manager'])
 */
export const requireAllRoles = (roleNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      
      if (!authReq.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const roles = authReq.user.roles || [];
      
      // Check for super-admin role
      const isSuperAdmin = roles.includes('super-admin');
      
      // Check if user has all of the required roles
      const hasAllRoles = roleNames.every(roleName => roles.includes(roleName));
      
      if (!isSuperAdmin && !hasAllRoles) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `All of these roles required: ${roleNames.join(', ')}`,
        });
      }
      
      next();
    } catch (error: any) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

