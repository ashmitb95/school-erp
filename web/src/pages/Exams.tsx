import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgChartsReact } from 'ag-charts-react';
import { Search, Plus, BookOpen, TrendingUp, Eye, Download, BarChart3 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../contexts/ToastContext';
import { exportToCSV } from '../utils/export';
import Input from '../components/Input/Input';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import TableSkeleton from '../components/TableSkeleton/TableSkeleton';
import { formatEnumValue, createSetFilterParams } from '../utils/enumFilters';
import styles from './Exams.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const Exams: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showSuccess, showError, showInfo } = useToast();
  const schoolId = user?.school_id;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [examTypeFilter, setExamTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed' | 'ongoing'>('all');

  const { data, isLoading } = useQuery(
    ['exams', schoolId, page, search, examTypeFilter, statusFilter],
    async () => {
      if (!schoolId) return { data: [], pagination: { total: 0 } };
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        school_id: schoolId,
      });
      if (search) params.append('search', search);
      if (examTypeFilter !== 'all') params.append('exam_type', examTypeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await api.get(`/exam?${params}`);
      return response.data;
    },
    { enabled: !!schoolId }
  );

  // Analytics query
  const { data: analytics } = useQuery(['exams-analytics', schoolId], async () => {
    if (!schoolId) return { total: 0, upcoming: 0, ongoing: 0, completed: 0, typeDistribution: [] };
    const response = await api.get(`/exam?school_id=${schoolId}&limit=1000`).catch(() => ({ data: { data: [] } }));
    const exams = response.data.data || [];

    const today = new Date();
    const upcoming = exams.filter((exam: any) => new Date(exam.start_date) > today).length;
    const ongoing = exams.filter((exam: any) => {
      const start = new Date(exam.start_date);
      const end = new Date(exam.end_date);
      return today >= start && today <= end;
    }).length;
    const completed = exams.filter((exam: any) => new Date(exam.end_date) < today).length;

    // Exam type distribution
    const typeDist: Record<string, number> = {};
    exams.forEach((exam: any) => {
      const type = exam.exam_type || 'unknown';
      typeDist[type] = (typeDist[type] || 0) + 1;
    });

    return {
      total: exams.length,
      upcoming,
      ongoing,
      completed,
      typeDistribution: Object.entries(typeDist).map(([type, count]) => ({ type, count })),
    };
  });

  const typeChartOptions = useMemo(() => ({
    data: analytics?.typeDistribution || [],
    series: [{
      type: 'bar' as const,
      xKey: 'type',
      yKey: 'count',
      fill: 'var(--color-primary)',
      stroke: 'var(--color-primary)',
    }],
    axes: [
      {
        type: 'category' as const,
        position: 'bottom' as const,
        title: { text: 'Exam Type' },
      },
      {
        type: 'number' as const,
        position: 'left' as const,
        title: { text: 'Count' },
      },
    ],
  }), [analytics?.typeDistribution]);

  const handleExport = () => {
    try {
      const columns = [
        { key: 'name', label: 'Exam Name' },
        { key: 'exam_type', label: 'Type' },
        { key: 'academic_year', label: 'Academic Year' },
        { key: 'start_date', label: 'Start Date' },
        { key: 'end_date', label: 'End Date' },
        { key: 'max_marks', label: 'Max Marks' },
        { key: 'passing_marks', label: 'Passing Marks' },
        { key: 'status', label: 'Status' },
      ];

      const exportData = (data?.data || []).map((exam: any) => {
        const today = new Date();
        const startDate = new Date(exam.start_date);
        const endDate = new Date(exam.end_date);
        let status = 'upcoming';
        if (today >= startDate && today <= endDate) status = 'ongoing';
        else if (today > endDate) status = 'completed';

        return {
          ...exam,
          status,
        };
      });

      exportToCSV(exportData, columns, {
        filename: `exams-export-${new Date().toISOString().split('T')[0]}.csv`,
      });

      showSuccess('Exams data exported successfully!');
    } catch (error) {
      showError('Failed to export exams data');
    }
  };

  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Exam Name',
      field: 'name',
      width: 200,
      cellRenderer: (params: ICellRendererParams) => (
        <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
          {params.value}
        </div>
      ),
    },
    {
      headerName: 'Type',
      field: 'exam_type',
      width: 120,
      filter: 'agSetColumnFilter',
      filterParams: createSetFilterParams('exam_type'),
      cellRenderer: (params: ICellRendererParams) => (
        <span style={{ textTransform: 'capitalize' }}>{formatEnumValue(params.value)}</span>
      ),
      valueFormatter: (params: any) => formatEnumValue(params.value),
    },
    {
      headerName: 'Academic Year',
      field: 'academic_year',
      width: 120,
    },
    {
      headerName: 'Start Date',
      field: 'start_date',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        <div>{new Date(params.value).toLocaleDateString()}</div>
      ),
    },
    {
      headerName: 'End Date',
      field: 'end_date',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        <div>{new Date(params.value).toLocaleDateString()}</div>
      ),
    },
    {
      headerName: 'Max Marks',
      field: 'max_marks',
      width: 100,
      cellRenderer: (params: ICellRendererParams) => (
        <div style={{ fontWeight: 600 }}>{params.value}</div>
      ),
    },
    {
      headerName: 'Passing Marks',
      field: 'passing_marks',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        <div style={{ fontWeight: 600, color: 'var(--color-warning)' }}>{params.value}</div>
      ),
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      filter: 'agSetColumnFilter',
      filterParams: createSetFilterParams('exam_status'),
      valueGetter: (params: any) => {
        const exam = params.data;
        if (!exam) return '';
        const today = new Date();
        const startDate = new Date(exam.start_date);
        const endDate = new Date(exam.end_date);
        
        if (today >= startDate && today <= endDate) {
          return 'ongoing';
        } else if (today > endDate) {
          return 'completed';
        }
        return 'upcoming';
      },
      cellRenderer: (params: ICellRendererParams) => {
        const status = params.value;
        const colors: Record<string, string> = {
          upcoming: 'var(--color-info)',
          ongoing: 'var(--color-warning)',
          completed: 'var(--color-success)',
        };
        const color = colors[status] || 'var(--color-info)';
        
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: `${color}20`,
            color: color,
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'capitalize',
          }}>
            {formatEnumValue(status)}
          </div>
        );
      },
      valueFormatter: (params: any) => formatEnumValue(params.value),
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 60,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams) => (
        <button
          onClick={() => navigate(`/exams/${params.data.id}`)}
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Exam Management</h1>
          <p className={styles.subtitle}>Comprehensive exam tracking and analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button icon={<Download size={18} />} variant="outline" onClick={handleExport} style={{ display: 'none' }}>
            Export
          </Button>
          <Button 
            icon={<Plus size={18} />} 
            onClick={() => showInfo('Create Exam feature coming soon!')}
          >
            Create Exam
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className={styles.analyticsGrid}>
          <Card className={styles.analyticsCard}>
            <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
              <BookOpen size={24} />
            </div>
            <div className={styles.analyticsContent}>
              <div className={styles.analyticsLabel}>Total Exams</div>
              <div className={styles.analyticsValue}>{analytics.total}</div>
            </div>
          </Card>
          <Card className={styles.analyticsCard}>
            <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-info)20', color: 'var(--color-info)' }}>
              <TrendingUp size={24} />
            </div>
            <div className={styles.analyticsContent}>
              <div className={styles.analyticsLabel}>Upcoming</div>
              <div className={styles.analyticsValue}>{analytics.upcoming}</div>
            </div>
          </Card>
          <Card className={styles.analyticsCard}>
            <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-warning)20', color: 'var(--color-warning)' }}>
              <BookOpen size={24} />
            </div>
            <div className={styles.analyticsContent}>
              <div className={styles.analyticsLabel}>Ongoing</div>
              <div className={styles.analyticsValue}>{analytics.ongoing}</div>
            </div>
          </Card>
          <Card className={styles.analyticsCard}>
            <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-success)20', color: 'var(--color-success)' }}>
              <BookOpen size={24} />
            </div>
            <div className={styles.analyticsContent}>
              <div className={styles.analyticsLabel}>Completed</div>
              <div className={styles.analyticsValue}>{analytics.completed}</div>
            </div>
          </Card>
        </div>
      )}

      {/* Chart Section */}
      {analytics && analytics.typeDistribution.length > 0 && (
        <Card className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Exam Type Distribution</h3>
              <p className={styles.chartSubtitle}>Breakdown of exams by type</p>
            </div>
            <BarChart3 size={20} className={styles.chartIcon} />
          </div>
          <div style={{ height: '300px', marginTop: '1rem' }}>
            <AgChartsReact options={typeChartOptions as any} />
          </div>
        </Card>
      )}

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Search exams by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={<Search size={18} />}
            fullWidth
          />
        </div>
        <div className={styles.statusFilters}>
          <label className={styles.filterLabel}>Status:</label>
          {['all', 'upcoming', 'ongoing', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status as 'all' | 'upcoming' | 'completed' | 'ongoing');
                setPage(1);
              }}
              className={`${styles.statusFilter} ${statusFilter === status ? styles.active : ''}`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <div className={styles.typeFilters}>
          <label className={styles.filterLabel}>Type:</label>
          {['all', 'unit_test', 'mid_term', 'final', 'assignment'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setExamTypeFilter(type);
                setPage(1);
              }}
              className={`${styles.typeFilter} ${examTypeFilter === type ? styles.active : ''}`}
            >
              {type === 'all' ? 'All' : type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <Card className={styles.tableCard}>
        {isLoading ? (
          <TableSkeleton rows={10} columns={8} />
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
                  No exams found
                </div>
              )}
            />
          </div>
        )}
      </Card>

      {data?.pagination && !isLoading && (
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

export default Exams;
