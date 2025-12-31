import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgChartsReact } from 'ag-charts-react';
import { Search, Plus, BookOpen, TrendingUp, Eye, Download, BarChart3 } from 'lucide-react';
import api from '../services/api';
import Input from '../components/Input/Input';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import styles from './Exams.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const Exams: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [examTypeFilter, setExamTypeFilter] = useState('all');

  const { data, isLoading } = useQuery(
    ['exams', page, search, examTypeFilter],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (search) params.append('search', search);
      if (examTypeFilter !== 'all') params.append('exam_type', examTypeFilter);
      const response = await api.get(`/exam?${params}`);
      return response.data;
    }
  );

  // Analytics query
  const { data: analytics } = useQuery('exams-analytics', async () => {
    const response = await api.get('/exam?limit=1000').catch(() => ({ data: { data: [] } }));
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
    const csv = [
      ['Exam Name', 'Type', 'Academic Year', 'Start Date', 'End Date', 'Max Marks', 'Passing Marks', 'Status'].join(','),
      ...(data?.data || []).map((exam: any) => {
        const today = new Date();
        const startDate = new Date(exam.start_date);
        const endDate = new Date(exam.end_date);
        let status = 'upcoming';
        if (today >= startDate && today <= endDate) status = 'ongoing';
        else if (today > endDate) status = 'completed';

        return [
          exam.name,
          exam.exam_type,
          exam.academic_year,
          exam.start_date,
          exam.end_date,
          exam.max_marks,
          exam.passing_marks,
          status,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exams-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      cellRenderer: (params: ICellRendererParams) => (
        <span style={{ textTransform: 'capitalize' }}>{params.value}</span>
      ),
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
      cellRenderer: (params: ICellRendererParams) => {
        const exam = params.data;
        const today = new Date();
        const startDate = new Date(exam.start_date);
        const endDate = new Date(exam.end_date);
        
        let status = 'upcoming';
        let color = 'var(--color-info)';
        if (today >= startDate && today <= endDate) {
          status = 'ongoing';
          color = 'var(--color-warning)';
        } else if (today > endDate) {
          status = 'completed';
          color = 'var(--color-success)';
        }
        
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
            {status}
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
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/exams/${params.data.id}`)}
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
        >
          <Eye size={14} style={{ marginRight: '0.25rem' }} />
          View
        </Button>
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
          <Button icon={<Download size={18} />} variant="outline" onClick={handleExport}>
            Export
          </Button>
          <Button icon={<Plus size={18} />}>Create Exam</Button>
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
        <div className={styles.typeFilters}>
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
        <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
          <AgGridReact
            rowData={data?.data || []}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination={false}
            loading={isLoading}
            animateRows={true}
            enableCellTextSelection={true}
            suppressCellFocus={true}
            getRowId={(params) => params.data.id}
          />
        </div>
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

export default Exams;
