import React from 'react';
import { Navigate } from 'react-router-dom';
import { useHasPermission, useHasRole } from '../../hooks/usePermissions';

interface PermissionRouteProps {
  children: React.ReactNode;
  resource?: string;
  action?: string;
  role?: string;
  fallback?: React.ReactNode;
}

/**
 * Route guard component that checks permissions before rendering children
 * Usage:
 * <PermissionRoute resource="students" action="read">
 *   <StudentsPage />
 * </PermissionRoute>
 */
const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  resource,
  action,
  role,
  fallback,
}) => {
  const hasPermission = resource && action ? useHasPermission(resource, action) : true;
  const hasRequiredRole = role ? useHasRole(role) : true;

  if (!hasPermission || !hasRequiredRole) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default PermissionRoute;

