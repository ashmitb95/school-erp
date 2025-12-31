import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Search, Plus, Edit, Trash2, Users, Briefcase, Mail, Phone, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import TableWrapper from '../../components/TableWrapper/TableWrapper';
import TableSkeleton from '../../components/TableSkeleton/TableSkeleton';
import { formatEnumValue, createSetFilterParams } from '../../utils/enumFilters';
import styles from './Staff.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const Staff: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [designationFilter, setDesignationFilter] = useState('all');

  const { data, isLoading } = useQuery(
    ['staff', page, search, designationFilter],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (search) params.append('search', search);
      if (designationFilter !== 'all') params.append('designation', designationFilter);
      const response = await api.get(`/management/staff?${params}`);
      return response.data;
    }
  );

  const { data: staffSummary } = useQuery(
    'staffSummary',
    async () => {
      const [totalStaff, designationDistribution] = await Promise.all([
        api.get('/management/staff?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
        api.get('/management/staff?limit=1000').catch(() => ({ data: { data: [] } })),
      ]);

      const designations: Record<string, number> = {};
      (designationDistribution?.data?.data || []).forEach((staff: any) => {
        const designation = staff.designation || 'Unknown';
        designations[designation] = (designations[designation] || 0) + 1;
      });

      return {
        totalStaff: totalStaff.data.pagination?.total || 0,
        designationDistribution: Object.entries(designations).map(([name, count]) => ({ name, count })),
      };
    }
  );

  const deleteMutation = useMutation(
    async (id: string) => {
      await api.delete(`/management/staff/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('staff');
        queryClient.invalidateQueries('staffSummary');
      },
    }
  );

  const handleDelete = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to deactivate this staff member?')) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  // Get unique designations for filter
  const uniqueDesignations = useMemo(() => {
    const designations = new Set<string>();
    data?.data?.forEach((staff: any) => {
      if (staff.designation) designations.add(staff.designation);
    });
    return Array.from(designations).sort();
  }, [data]);

  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Employee ID',
      field: 'employee_id',
      width: 150,
      pinned: 'left',
      cellRenderer: (params: ICellRendererParams) => (
        <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
          {params.value}
        </div>
      ),
    },
    {
      headerName: 'Name',
      field: 'first_name',
      width: 200,
      cellRenderer: (params: ICellRendererParams) => {
        const staff = params.data;
        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {staff.first_name} {staff.middle_name || ''} {staff.last_name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {staff.email}
            </div>
          </div>
        );
      },
    },
    {
      headerName: 'Designation',
      field: 'designation',
      width: 150,
      filter: 'agSetColumnFilter',
      filterParams: {
        values: uniqueDesignations,
      },
      cellRenderer: (params: ICellRendererParams) => (
        <span style={{ textTransform: 'capitalize' }}>{params.value}</span>
      ),
    },
    {
      headerName: 'Department',
      field: 'department',
      width: 150,
      cellRenderer: (params: ICellRendererParams) => (
        <span>{params.value || '-'}</span>
      ),
    },
    {
      headerName: 'Phone',
      field: 'phone',
      width: 130,
    },
    {
      headerName: 'Qualification',
      field: 'qualification',
      width: 180,
    },
    {
      headerName: 'Experience',
      field: 'experience_years',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        <span>{params.value} years</span>
      ),
    },
    {
      headerName: 'Status',
      field: 'is_active',
      width: 100,
      cellRenderer: (params: ICellRendererParams) => {
        const isActive = params.value;
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: isActive ? 'var(--color-success)20' : 'var(--color-error)20',
            color: isActive ? 'var(--color-success)' : 'var(--color-error)',
            fontWeight: 600,
            fontSize: '0.75rem',
          }}>
            {isActive ? 'Active' : 'Inactive'}
          </div>
        );
      },
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 120,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams) => (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => {/* Edit functionality */}}
            style={{
              padding: '0.25rem 0.5rem',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'white',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Edit"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => handleDelete(params.data.id)}
            style={{
              padding: '0.25rem 0.5rem',
              border: 'none',
              background: 'var(--color-error)',
              color: 'white',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Deactivate"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [handleDelete, uniqueDesignations]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Staff Management</h1>
          <p className={styles.subtitle}>Manage all staff members and teachers</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary">Export CSV</Button>
          <Button icon={<Plus size={18} />}>Add Staff</Button>
        </div>
      </div>

      <div className={styles.analyticsGrid}>
        <Card className={styles.analyticsCard}>
          <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
            <Users size={24} />
          </div>
          <div className={styles.analyticsContent}>
            <div className={styles.analyticsValue}>
              {staffSummary?.totalStaff.toLocaleString() || '0'}
            </div>
            <div className={styles.analyticsTitle}>Total Staff</div>
          </div>
          <TrendingUp size={16} className={styles.analyticsTrend} />
        </Card>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Search by name, employee ID, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={<Search size={18} />}
            fullWidth
          />
        </div>
        <div className={styles.designationFilters}>
          <button
            onClick={() => {
              setDesignationFilter('all');
              setPage(1);
            }}
            className={`${styles.designationFilter} ${designationFilter === 'all' ? styles.active : ''}`}
          >
            All
          </button>
          {uniqueDesignations.map((designation) => (
            <button
              key={designation}
              onClick={() => {
                setDesignationFilter(designation);
                setPage(1);
              }}
              className={`${styles.designationFilter} ${designationFilter === designation ? styles.active : ''}`}
            >
              {designation}
            </button>
          ))}
        </div>
      </div>

      <Card className={styles.tableCard}>
        <TableWrapper>
          {isLoading ? (
            <TableSkeleton rows={10} columns={8} />
          ) : (
            <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
              <AgGridReact
                rowData={data?.data || []}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={false}
                loading={false}
                animateRows={true}
                enableCellTextSelection={true}
                suppressCellFocus={true}
                getRowId={(params) => params.data.id}
                noRowsOverlayComponent={() => (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    No staff members found
                  </div>
                )}
              />
            </div>
          )}
        </TableWrapper>
      </Card>

      {data?.pagination && (
        <div className={styles.pagination}>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <span>
            Page {page} of {data.pagination.totalPages} ({data.pagination.total.toLocaleString()} total)
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.pagination.totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default Staff;

