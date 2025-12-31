import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgChartsReact } from 'ag-charts-react';
import { Search, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';
import Input from '../components/Input/Input';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import styles from './Attendance.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const Attendance: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery(
    ['attendance', page, search, selectedDate],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        date: selectedDate,
      });
      if (search) params.append('search', search);
      const response = await api.get(`/attendance?${params}`);
      return response.data;
    }
  );

  const { data: stats } = useQuery(
    ['attendance-stats', startDate, endDate],
    async () => {
      const response = await api.get(`/attendance/stats?start_date=${startDate}&end_date=${endDate}`);
      return response.data;
    }
  );

  const chartOptions = useMemo(() => {
    if (!stats?.stats) return null;
    return {
      data: stats.stats.map((stat: any) => ({
        status: stat.status.charAt(0).toUpperCase() + stat.status.slice(1),
        count: parseInt(stat.count || 0),
      })),
      series: [
        {
          type: 'pie',
          angleKey: 'count',
          labelKey: 'status',
          fills: ['var(--color-success)', 'var(--color-error)', 'var(--color-warning)', 'var(--color-info)'],
          strokes: ['var(--color-success)', 'var(--color-error)', 'var(--color-warning)', 'var(--color-info)'],
        },
      ],
      legend: {
        enabled: true,
        position: 'bottom',
      },
    };
  }, [stats]);

  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Student',
      field: 'student',
      width: 200,
      cellRenderer: (params: ICellRendererParams) => {
        const student = params.value;
        if (!student) return 'N/A';
        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {student.first_name} {student.last_name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {student.admission_number}
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
      headerName: 'Date',
      field: 'date',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        <div>{new Date(params.value).toLocaleDateString()}</div>
      ),
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => {
        const status = params.value;
        const colors: Record<string, { bg: string; color: string; icon: any }> = {
          present: { bg: 'var(--color-success)20', color: 'var(--color-success)', icon: CheckCircle },
          absent: { bg: 'var(--color-error)20', color: 'var(--color-error)', icon: XCircle },
          late: { bg: 'var(--color-warning)20', color: 'var(--color-warning)', icon: Clock },
          excused: { bg: 'var(--color-info)20', color: 'var(--color-info)', icon: AlertCircle },
        };
        const style = colors[status] || colors.present;
        const Icon = style.icon;
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: style.bg,
            color: style.color,
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'capitalize',
          }}>
            <Icon size={12} />
            {status}
          </div>
        );
      },
    },
    {
      headerName: 'Remarks',
      field: 'remarks',
      width: 200,
      cellRenderer: (params: ICellRendererParams) => (
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          {params.value || '-'}
        </div>
      ),
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Attendance Management</h1>
          <p className={styles.subtitle}>Track and manage student attendance</p>
        </div>
        <Button icon={<Calendar size={18} />}>Mark Attendance</Button>
      </div>

      <div className={styles.statsGrid}>
        {stats?.stats?.map((stat: any) => {
          const statusColors: Record<string, string> = {
            present: 'var(--color-success)',
            absent: 'var(--color-error)',
            late: 'var(--color-warning)',
            excused: 'var(--color-info)',
          };
          return (
            <Card key={stat.status} className={styles.statCard}>
              <div className={styles.statValue} style={{ color: statusColors[stat.status] || 'var(--color-text)' }}>
                {stat.count}
              </div>
              <div className={styles.statLabel} style={{ textTransform: 'capitalize' }}>
                {stat.status}
              </div>
            </Card>
          );
        })}
      </div>

      {chartOptions && (
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Attendance Distribution</h3>
          <div style={{ height: '300px' }}>
            <AgChartsReact options={chartOptions} />
          </div>
        </Card>
      )}

      <div className={styles.filters}>
        <div className={styles.dateFilters}>
          <div className={styles.dateInput}>
            <label>View Date:</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className={styles.dateRange}>
            <div className={styles.dateInput}>
              <label>Start Date:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className={styles.dateInput}>
              <label>End Date:</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className={styles.searchBar}>
          <Input
            placeholder="Search by student name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={<Search size={18} />}
            fullWidth
          />
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

export default Attendance;
