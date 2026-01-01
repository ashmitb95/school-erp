import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';

/**
 * Hook to check if user has a specific permission
 * @param resource - The resource (e.g., 'students', 'fees')
 * @param action - The action (e.g., 'create', 'read', 'update', 'delete')
 * @returns boolean indicating if user has the permission
 */
export const useHasPermission = (resource: string, action: string): boolean => {
  const { user } = useAuthStore();
  
  return useMemo(() => {
    if (!user) return false;
    
    const permissions = (user as any).permissions || [];
    const permissionKey = `${resource}:${action}`;
    
    // Check for wildcard permission (super-admin)
    if (permissions.includes('*:*')) {
      return true;
    }
    
    // Check for specific permission
    return permissions.includes(permissionKey);
  }, [user, resource, action]);
};

/**
 * Hook to check if user has a specific role
 * @param roleName - The role name (e.g., 'principal', 'teacher')
 * @returns boolean indicating if user has the role
 */
export const useHasRole = (roleName: string): boolean => {
  const { user } = useAuthStore();
  
  return useMemo(() => {
    if (!user) return false;
    
    const roles = (user as any).roles || [];
    
    // Check for super-admin role
    if (roles.includes('super-admin')) {
      return true;
    }
    
    // Check for specific role
    return roles.includes(roleName);
  }, [user, roleName]);
};

/**
 * Hook to check if user has any of the specified roles
 * @param roleNames - Array of role names
 * @returns boolean indicating if user has any of the roles
 */
export const useHasAnyRole = (roleNames: string[]): boolean => {
  const { user } = useAuthStore();
  
  return useMemo(() => {
    if (!user) return false;
    
    const roles = (user as any).roles || [];
    
    // Check for super-admin role
    if (roles.includes('super-admin')) {
      return true;
    }
    
    // Check if user has any of the required roles
    return roleNames.some(roleName => roles.includes(roleName));
  }, [user, roleNames]);
};

/**
 * Hook to check if user has all of the specified roles
 * @param roleNames - Array of role names
 * @returns boolean indicating if user has all of the roles
 */
export const useHasAllRoles = (roleNames: string[]): boolean => {
  const { user } = useAuthStore();
  
  return useMemo(() => {
    if (!user) return false;
    
    const roles = (user as any).roles || [];
    
    // Check for super-admin role
    if (roles.includes('super-admin')) {
      return true;
    }
    
    // Check if user has all of the required roles
    return roleNames.every(roleName => roles.includes(roleName));
  }, [user, roleNames]);
};

/**
 * Hook to get all user permissions
 * @returns object with roles and permissions arrays
 */
export const usePermissions = () => {
  const { user } = useAuthStore();
  
  return useMemo(() => {
    if (!user) {
      return { roles: [], permissions: [] };
    }
    
    return {
      roles: (user as any).roles || [],
      permissions: (user as any).permissions || [],
    };
  }, [user]);
};

