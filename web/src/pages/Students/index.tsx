import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgChartsReact } from 'ag-charts-react';
import { Search, Plus, Edit, Eye, Trash2, Download, Users, PieChart, BarChart3 } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { exportToCSV } from '../../utils/export';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import TableSkeleton from '../../components/TableSkeleton/TableSkeleton';
import { formatEnumValue, createSetFilterParams, isEnumField } from '../../utils/enumFilters';
import styles from './Students.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const Students: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showSuccess, showError, showInfo, confirm } = useToast();
  const schoolId = user?.school_id;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const { data, isLoading } = useQuery(
    ['students', schoolId, page, search],
    async () => {
      if (!schoolId) return { data: [], pagination: { total: 0 } };
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        school_id: schoolId,
      });
      if (search) params.append('search', search);
      const response = await api.get(`/student?${params}`);
      return response.data;
    },
    { enabled: !!schoolId }
  );

  // Analytics query
  const { data: analytics } = useQuery(['students-analytics', schoolId], async () => {
    if (!schoolId) return { total: 0, classDistribution: [], genderDistribution: [] };
    const response = await api.get(`/student?school_id=${schoolId}&limit=1000`).catch(() => ({ data: { data: [] } }));
    const students = response.data.data || [];

    // Class distribution
    const classDist: Record<string, number> = {};
    const genderDist: Record<string, number> = {};
    students.forEach((student: any) => {
      const className = student.class?.name || 'Unassigned';
      classDist[className] = (classDist[className] || 0) + 1;
      const gender = student.gender || 'Unknown';
      genderDist[gender] = (genderDist[gender] || 0) + 1;
    });

    return {
      total: students.length,
      classDistribution: Object.entries(classDist).map(([name, count]) => ({ name, count })),
      genderDistribution: Object.entries(genderDist).map(([gender, count]) => ({ gender, count })),
    };
  }, { enabled: !!schoolId });

  const classChartOptions = useMemo(() => ({
    data: analytics?.classDistribution || [],
    series: [{
      type: 'pie' as const,
      angleKey: 'count',
      labelKey: 'name',
      outerRadiusRatio: 0.8,
      innerRadiusRatio: 0.5,
    }],
    legend: {
      enabled: true,
      position: 'right' as const,
    },
  }), [analytics?.classDistribution]);

  const handleExport = () => {
    try {
      const columns = [
        { key: 'admission_number', label: 'Admission Number' },
        { key: 'name', label: 'Name' },
        { key: 'class.name', label: 'Class' },
        { key: 'section', label: 'Section' },
        { key: 'gender', label: 'Gender' },
        { key: 'father_phone', label: 'Father Phone' },
        { key: 'academic_year', label: 'Academic Year' },
      ];

      const exportData = (data?.data || []).map((student: any) => ({
        ...student,
        name: `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim(),
      }));

      exportToCSV(exportData, columns, {
        filename: `students-export-${new Date().toISOString().split('T')[0]}.csv`,
      });

      showSuccess('Students data exported successfully!');
    } catch (error) {
      showError('Failed to export students data');
    }
  };

  const deleteMutation = useMutation(
    async (id: string) => {
      await api.delete(`/student/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('students');
      },
    }
  );

  const handleDelete = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Admission No.',
      field: 'admission_number',
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
        const student = params.data;
        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {student.first_name} {student.middle_name || ''} {student.last_name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {student.roll_number}
            </div>
          </div>
        );
      },
    },
    {
      headerName: 'Class',
      field: 'class.name',
      width: 120,
      valueGetter: (params) => params.data?.class?.name || 'N/A',
    },
    {
      headerName: 'Section',
      field: 'section',
      width: 100,
    },
    {
      headerName: 'Gender',
      field: 'gender',
      width: 100,
      filter: 'agSetColumnFilter',
      filterParams: createSetFilterParams('gender'),
      cellRenderer: (params: ICellRendererParams) => (
        <span style={{ textTransform: 'capitalize' }}>{formatEnumValue(params.value)}</span>
      ),
      valueFormatter: (params: any) => formatEnumValue(params.value),
    },
    {
      headerName: 'Father\'s Phone',
      field: 'father_phone',
      width: 150,
    },
    {
      headerName: 'Academic Year',
      field: 'academic_year',
      width: 120,
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 100,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams) => (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => navigate(`/students/${params.data.id}`)}
            style={{
              padding: '0.375rem',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.color = 'var(--color-primary)';
              e.currentTarget.style.backgroundColor = 'var(--color-primary)10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="View Details"
          >
            <Eye size={16} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => handleDelete(params.data.id)}
            style={{
              padding: '0.375rem',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-error)';
              e.currentTarget.style.color = 'var(--color-error)';
              e.currentTarget.style.backgroundColor = 'var(--color-error)10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Delete"
          >
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        </div>
      ),
    },
  ], [navigate, handleDelete]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const onSelectionChanged = useCallback((event: any) => {
    setSelectedRows(event.api.getSelectedRows());
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Student Management</h1>
          <p className={styles.subtitle}>Comprehensive student records and analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button icon={<Download size={18} />} variant="outline" onClick={handleExport} style={{ display: 'none' }}>
            Export
          </Button>
          {selectedRows.length > 0 && (
            <Button variant="outline" onClick={() => setSelectedRows([])}>
              Clear Selection ({selectedRows.length})
            </Button>
          )}
          <Button 
            icon={<Plus size={18} />} 
            onClick={() => showInfo('Add Student feature coming soon!')}
          >
            Add Student
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className={styles.analyticsGrid}>
          <Card className={styles.analyticsCard}>
            <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
              <Users size={24} />
            </div>
            <div className={styles.analyticsContent}>
              <div className={styles.analyticsLabel}>Total Students</div>
              <div className={styles.analyticsValue}>{analytics.total.toLocaleString()}</div>
            </div>
          </Card>
        </div>
      )}

      {/* Chart Section */}
      {analytics && analytics.classDistribution.length > 0 && (
        <Card className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Student Distribution by Class</h3>
              <p className={styles.chartSubtitle}>Breakdown of students across classes</p>
            </div>
            <PieChart size={20} className={styles.chartIcon} />
          </div>
          <div style={{ height: '300px', marginTop: '1rem' }}>
            <AgChartsReact options={classChartOptions as any} />
          </div>
        </Card>
      )}

      <div className={styles.searchBar}>
        <Input
          placeholder="Search students by name or admission number..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          icon={<Search size={18} />}
          fullWidth
        />
      </div>

      <Card className={styles.tableCard}>
        {isLoading ? (
          <TableSkeleton rows={10} columns={7} />
        ) : (
          <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
            <AgGridReact
              rowData={data?.data || []}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              pagination={false}
              rowSelection="multiple"
              onSelectionChanged={onSelectionChanged}
              animateRows={true}
              enableCellTextSelection={true}
              suppressCellFocus={true}
              getRowId={(params) => params.data.id}
              noRowsOverlayComponent={() => (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No students found
                </div>
              )}
            />
          </div>
        )}
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

export default Students;
