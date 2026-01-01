import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, Link } from 'react-router-dom';
import { Plus, X, User } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { useHasRole } from '../../hooks/usePermissions';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import styles from './RBAC.module.css';

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  designation: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface StaffRole {
  id: string;
  staff: Staff;
  role: Role;
  assigned_by: string;
  assigned_at: string;
}

const StaffRoles: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = useHasRole('super-admin');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const { data: staffRoles, isLoading } = useQuery(
    ['rbac-staff-roles', id],
    async () => {
      const response = await api.get(`/rbac/staff/${id}`);
      return response.data.data as StaffRole[];
    },
    {
      enabled: !!id,
    }
  );

  const { data: availableRoles } = useQuery(
    ['rbac-roles'],
    async () => {
      const response = await api.get('/rbac/roles');
      return response.data.data as Role[];
    }
  );

  const assignRoleMutation = useMutation(
    async (roleId: string) => {
      await api.post(`/rbac/staff/${id}/roles`, { role_id: roleId });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['rbac-staff-roles', id]);
        showSuccess('Role assigned successfully');
        setShowAssignModal(false);
        setSelectedRoleId('');
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Failed to assign role');
      },
    }
  );

  const removeRoleMutation = useMutation(
    async (roleId: string) => {
      await api.delete(`/rbac/staff/${id}/roles/${roleId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['rbac-staff-roles', id]);
        showSuccess('Role removed successfully');
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Failed to remove role');
      },
    }
  );

  const handleAssignRole = () => {
    if (!selectedRoleId) {
      showError('Please select a role');
      return;
    }
    assignRoleMutation.mutate(selectedRoleId);
  };

  const handleRemoveRole = (roleId: string) => {
    if (!window.confirm('Are you sure you want to remove this role?')) {
      return;
    }
    removeRoleMutation.mutate(roleId);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading staff roles...</div>
      </div>
    );
  }

  const assignedRoleIds = new Set((staffRoles || []).map((sr) => sr.role.id));
  const unassignedRoles = (availableRoles || []).filter(
    (role) => !assignedRoleIds.has(role.id)
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Staff Roles</h1>
          <p className={styles.subtitle}>Manage roles assigned to staff members</p>
        </div>
        {isSuperAdmin && unassignedRoles.length > 0 && (
          <Button
            icon={<Plus size={18} />}
            onClick={() => setShowAssignModal(true)}
          >
            Assign Role
          </Button>
        )}
      </div>

      {staffRoles && staffRoles.length > 0 ? (
        <div className={styles.staffList}>
          {staffRoles.map((staffRole) => (
            <Card key={staffRole.id} className={styles.staffCard}>
              <div className={styles.staffInfo}>
                <div className={styles.staffName}>
                  {staffRole.staff.first_name} {staffRole.staff.last_name}
                </div>
                <div className={styles.staffEmail}>{staffRole.staff.email}</div>
                <div className={styles.staffRoles}>
                  <span className={styles.roleBadge}>{staffRole.role.name}</span>
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--taupe-grey)',
                  marginTop: '0.5rem'
                }}>
                  Assigned on {new Date(staffRole.assigned_at).toLocaleDateString()}
                </div>
              </div>
              {isSuperAdmin && (
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleRemoveRole(staffRole.role.id)}
                  title="Remove role"
                >
                  <X size={16} />
                </button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className={styles.emptyState}>
          <User size={48} />
          <p>No roles assigned to this staff member</p>
          {isSuperAdmin && unassignedRoles.length > 0 && (
            <Button onClick={() => setShowAssignModal(true)}>
              Assign First Role
            </Button>
          )}
        </Card>
      )}

      {showAssignModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)}>
          <div className={styles.modal} onClick={(e: React.MouseEvent) => { e.stopPropagation(); }}>
            <h2>Assign Role</h2>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className={styles.select}
            >
              <option value="">Select a role...</option>
              {unassignedRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} {role.description && `- ${role.description}`}
                </option>
              ))}
            </select>
            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignRole} disabled={!selectedRoleId}>
                Assign
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffRoles;

