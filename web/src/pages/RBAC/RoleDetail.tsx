import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ArrowLeft, Check, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useHasRole } from '../../hooks/usePermissions';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import styles from './RBAC.module.css';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

interface RolePermission {
  id: string;
  permission: Permission;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  role_permissions?: RolePermission[];
}

const RoleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = useHasRole('super-admin');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const { data: role, isLoading: roleLoading } = useQuery(
    ['rbac-role', id],
    async () => {
      const response = await api.get(`/rbac/roles/${id}`);
      return response.data.data as Role;
    },
    {
      enabled: !!id,
      onSuccess: (data) => {
        // Initialize selected permissions from existing role permissions
        const existing = new Set(
          (data.role_permissions || []).map((rp: RolePermission) => rp.permission.id)
        );
        setSelectedPermissions(existing);
      },
    }
  );

  const { data: allPermissions, isLoading: permsLoading } = useQuery(
    ['rbac-permissions'],
    async () => {
      const response = await api.get('/rbac/permissions');
      return response.data.data as Permission[];
    }
  );

  const assignPermissionMutation = useMutation(
    async (permissionId: string) => {
      await api.post(`/rbac/roles/${id}/permissions`, { permission_id: permissionId });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['rbac-role', id]);
        queryClient.invalidateQueries(['rbac-permissions']);
        showSuccess('Permission assigned successfully');
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Failed to assign permission');
      },
    }
  );

  const removePermissionMutation = useMutation(
    async (permissionId: string) => {
      await api.delete(`/rbac/roles/${id}/permissions/${permissionId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['rbac-role', id]);
        queryClient.invalidateQueries(['rbac-permissions']);
        showSuccess('Permission removed successfully');
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Failed to remove permission');
      },
    }
  );

  const handlePermissionToggle = (permission: Permission) => {
    if (!isSuperAdmin || role?.is_system_role) return;

    const isSelected = selectedPermissions.has(permission.id);

    if (isSelected) {
      removePermissionMutation.mutate(permission.id);
      setSelectedPermissions((prev) => {
        const next = new Set(prev);
        next.delete(permission.id);
        return next;
      });
    } else {
      assignPermissionMutation.mutate(permission.id);
      setSelectedPermissions((prev) => {
        const next = new Set(prev);
        next.add(permission.id);
        return next;
      });
    }
  };

  if (roleLoading || permsLoading) {
    return (
      <div className={styles.detailContainer}>
        <div className={styles.loading}>Loading role details...</div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className={styles.detailContainer}>
        <Card>
          <p>Role not found</p>
          <Link to="/rbac/roles">Back to Roles</Link>
        </Card>
      </div>
    );
  }

  const existingPermissionIds = new Set(
    (role.role_permissions || []).map((rp: RolePermission) => rp.permission.id)
  );

  // Group permissions by resource
  const permissionsByResource: Record<string, Permission[]> = {};
  (allPermissions || []).forEach((perm) => {
    if (!permissionsByResource[perm.resource]) {
      permissionsByResource[perm.resource] = [];
    }
    permissionsByResource[perm.resource].push(perm);
  });

  return (
    <div className={styles.detailContainer}>
      <div className={styles.detailHeader}>
        <Link to="/rbac/roles" className={styles.backLink}>
          <ArrowLeft size={18} />
          Back to Roles
        </Link>
        <h1 className={styles.title}>{role.name}</h1>
        {role.description && <p className={styles.subtitle}>{role.description}</p>}
        {role.is_system_role && (
          <span className={styles.systemBadge}>System Role</span>
        )}
      </div>

      <Card className={styles.permissionsSection}>
        <h2 className={styles.sectionTitle}>Permissions</h2>
        <p className={styles.sectionDescription}>
          {isSuperAdmin && !role.is_system_role
            ? 'Click on permissions to assign or remove them from this role'
            : 'View permissions assigned to this role'}
        </p>

        {Object.entries(permissionsByResource).map(([resource, permissions]) => (
          <div key={resource} style={{ marginTop: '1.5rem' }}>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: 'var(--gunmetal)',
              marginBottom: '0.75rem',
              textTransform: 'capitalize'
            }}>
              {resource.replace('_', ' ')}
            </h3>
            <div className={styles.permissionsGrid}>
              {permissions.map((permission) => {
                const isAssigned = existingPermissionIds.has(permission.id);
                const canToggle = isSuperAdmin && !role.is_system_role;

                return (
                  <div
                    key={permission.id}
                    className={styles.permissionCard}
                    style={{
                      cursor: canToggle ? 'pointer' : 'default',
                      opacity: isAssigned ? 1 : 0.6,
                      borderColor: isAssigned ? 'var(--gunmetal)' : 'var(--taupe-grey)30',
                    }}
                    onClick={() => canToggle && handlePermissionToggle(permission)}
                  >
                    <div className={styles.permissionInfo}>
                      <div className={styles.permissionKey}>
                        {permission.resource}:{permission.action}
                      </div>
                      {permission.description && (
                        <div className={styles.permissionDesc}>
                          {permission.description}
                        </div>
                      )}
                    </div>
                    {isAssigned ? (
                      <Check size={20} color="var(--color-success)" />
                    ) : (
                      <X size={20} color="var(--taupe-grey)" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

export default RoleDetail;

