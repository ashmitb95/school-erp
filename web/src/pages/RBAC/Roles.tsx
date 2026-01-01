import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Shield, Building2 } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { useHasRole } from '../../hooks/usePermissions';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import styles from './RBAC.module.css';

interface Role {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  school_id?: string;
  school?: {
    id: string;
    name: string;
  };
}

const Roles: React.FC = () => {
  const { user } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = useHasRole('super-admin');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const { data, isLoading } = useQuery(['rbac-roles'], async () => {
    const response = await api.get('/rbac/roles');
    return response.data.data || [];
  });

  const deleteMutation = useMutation(
    async (id: string) => {
      await api.delete(`/rbac/roles/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['rbac-roles']);
        showSuccess('Role deleted successfully');
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Failed to delete role');
      },
    }
  );

  const handleDelete = async (role: Role) => {
    if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      return;
    }

    if (role.is_system_role) {
      showError('Cannot delete system roles');
      return;
    }

    deleteMutation.mutate(role.id);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading roles...</div>
      </div>
    );
  }

  const roles = data || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Roles & Permissions</h1>
          <p className={styles.subtitle}>Manage user roles and their permissions</p>
        </div>
        {isSuperAdmin && (
          <Button
            icon={<Plus size={18} />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Role
          </Button>
        )}
      </div>

      <div className={styles.rolesGrid}>
        {roles.map((role: Role) => (
          <Card key={role.id} className={styles.roleCard}>
            <div className={styles.roleHeader}>
              <div className={styles.roleIcon}>
                {role.is_system_role ? (
                  <Shield size={24} />
                ) : (
                  <Building2 size={24} />
                )}
              </div>
              <div className={styles.roleInfo}>
                <h3 className={styles.roleName}>{role.name}</h3>
                {role.school && (
                  <p className={styles.roleSchool}>{role.school.name}</p>
                )}
                {role.is_system_role && (
                  <span className={styles.systemBadge}>System Role</span>
                )}
              </div>
            </div>
            {role.description && (
              <p className={styles.roleDescription}>{role.description}</p>
            )}
            <div className={styles.roleActions}>
              <Link to={`/rbac/roles/${role.id}`} className={styles.viewLink}>
                View Details
              </Link>
              {isSuperAdmin && !role.is_system_role && (
                <>
                  <button
                    className={styles.editBtn}
                    onClick={() => setEditingRole(role)}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(role)}
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {roles.length === 0 && (
        <Card className={styles.emptyState}>
          <Shield size={48} />
          <p>No roles found</p>
          {isSuperAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              Create First Role
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default Roles;

