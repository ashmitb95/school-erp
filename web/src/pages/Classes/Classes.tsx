import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Search, Plus, Eye, Users, BookOpen, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import TableWrapper from '../../components/TableWrapper/TableWrapper';
import TableSkeleton from '../../components/TableSkeleton/TableSkeleton';
import styles from './Classes.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const Classes: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const schoolId = user?.school_id;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [academicYearFilter, setAcademicYearFilter] = useState('all');

  const { data, isLoading } = useQuery(
    ['classes', schoolId, page, search, academicYearFilter],
    async () => {
      if (!schoolId) return { data: [], pagination: { total: 0 } };
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        school_id: schoolId,
      });
      if (search) params.append('search', search);
      if (academicYearFilter !== 'all') params.append('academic_year', academicYearFilter);
      const response = await api.get(`/management/classes?${params}`);
      return response.data;
    },
    { enabled: !!schoolId }
  );

  const { data: classSummary } = useQuery(
    ['classSummary', schoolId],
    async () => {
      if (!schoolId) return { totalClasses: 0 };
      const [totalClasses] = await Promise.all([
        api.get(`/management/classes?school_id=${schoolId}&limit=1`).catch(() => ({ data: { pagination: { total: 0 } } })),
      ]);

      return {
        totalClasses: totalClasses.data.pagination?.total || 0,
      };
    },
    { enabled: !!schoolId }
  );

  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Class Name',
      field: 'name',
      width: 150,
      pinned: 'left',
      cellRenderer: (params: ICellRendererParams) => (
        <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
          {params.value}
        </div>
      ),
    },
    {
      headerName: 'Code',
      field: 'code',
      width: 100,
    },
    {
      headerName: 'Level',
      field: 'level',
      width: 100,
      cellRenderer: (params: ICellRendererParams) => (
        <span>Grade {params.value}</span>
      ),
    },
    {
      headerName: 'Academic Year',
      field: 'academic_year',
      width: 150,
    },
    {
      headerName: 'Class Teacher',
      field: 'class_teacher',
      width: 200,
      cellRenderer: (params: ICellRendererParams) => {
        const teacher = params.value;
        if (!teacher) return <span style={{ color: 'var(--color-text-secondary)' }}>Not Assigned</span>;
        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {teacher.first_name} {teacher.last_name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {teacher.employee_id}
            </div>
          </div>
        );
      },
    },
    {
      headerName: 'Students',
      field: 'student_count',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        <div style={{ fontWeight: 600, color: 'var(--color-info)' }}>
          {params.value || 0}
        </div>
      ),
    },
    {
      headerName: 'Capacity',
      field: 'capacity',
      width: 100,
      cellRenderer: (params: ICellRendererParams) => {
        const capacity = params.value;
        const studentCount = params.data.student_count || 0;
        const percentage = capacity > 0 ? (studentCount / capacity) * 100 : 0;
        const color = percentage >= 90 ? 'var(--color-error)' : percentage >= 75 ? 'var(--color-warning)' : 'var(--color-success)';
        return (
          <div>
            <span style={{ fontWeight: 600, color }}>{studentCount}/{capacity}</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {percentage.toFixed(0)}%
            </div>
          </div>
        );
      },
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
      width: 60,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams) => (
        <button
          onClick={() => navigate(`/classes/${params.data.id}`)}
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
      ),
    },
  ], [navigate]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // Get unique academic years for filter
  const uniqueAcademicYears = useMemo(() => {
    const years = new Set<string>();
    data?.data?.forEach((cls: any) => {
      if (cls.academic_year) years.add(cls.academic_year);
    });
    return Array.from(years).sort().reverse();
  }, [data]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Classes</h1>
          <p className={styles.subtitle}>Manage all classes and sections</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" style={{ display: 'none' }}>Export CSV</Button>
          <Button icon={<Plus size={18} />}>Add Class</Button>
        </div>
      </div>

      <div className={styles.analyticsGrid}>
        <Card className={styles.analyticsCard}>
          <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
            <BookOpen size={24} />
          </div>
          <div className={styles.analyticsContent}>
            <div className={styles.analyticsValue}>
              {classSummary?.totalClasses.toLocaleString() || '0'}
            </div>
            <div className={styles.analyticsTitle}>Total Classes</div>
          </div>
          <TrendingUp size={16} className={styles.analyticsTrend} />
        </Card>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Search classes by name or code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={<Search size={18} />}
            fullWidth
          />
        </div>
        <div className={styles.yearFilters}>
          <button
            onClick={() => {
              setAcademicYearFilter('all');
              setPage(1);
            }}
            className={`${styles.yearFilter} ${academicYearFilter === 'all' ? styles.active : ''}`}
          >
            All Years
          </button>
          {uniqueAcademicYears.map((year) => (
            <button
              key={year}
              onClick={() => {
                setAcademicYearFilter(year);
                setPage(1);
              }}
              className={`${styles.yearFilter} ${academicYearFilter === year ? styles.active : ''}`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <Card className={styles.tableCard}>
        <TableWrapper>
          {isLoading ? (
            <TableSkeleton rows={10} columns={6} />
          ) : (
            <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
              <AgGridReact
                rowData={data?.data || []}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={false}
                animateRows={true}
                enableCellTextSelection={true}
                suppressCellFocus={true}
                getRowId={(params) => params.data.id}
                noRowsOverlayComponent={() => (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    No classes found
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

export default Classes;

