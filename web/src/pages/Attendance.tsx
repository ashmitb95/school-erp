import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgChartsReact } from 'ag-charts-react';
import { Search, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Input from '../components/Input/Input';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import TableSkeleton from '../components/TableSkeleton/TableSkeleton';
import { formatEnumValue, createSetFilterParams } from '../utils/enumFilters';
import styles from './Attendance.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const Attendance: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const schoolId = user?.school_id;
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read filters from URL params (for deep linking from Dashboard)
  const urlDate = searchParams.get('date');
  const urlStatus = searchParams.get('status');
  const urlLeaveType = searchParams.get('leave_type');
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(urlDate || new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState(urlStatus || 'all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState(urlLeaveType || 'all');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Sync URL params to state on mount
  useEffect(() => {
    if (urlDate) setSelectedDate(urlDate);
    if (urlStatus) setStatusFilter(urlStatus);
    if (urlLeaveType) setLeaveTypeFilter(urlLeaveType);
  }, [urlDate, urlStatus, urlLeaveType]);

  const { data, isLoading } = useQuery(
    ['attendance', schoolId, page, search, selectedDate, statusFilter, leaveTypeFilter],
    async () => {
      if (!schoolId) return { data: [], pagination: { total: 0 } };
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        date: selectedDate,
        school_id: schoolId,
      });
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (leaveTypeFilter !== 'all') params.append('leave_type', leaveTypeFilter);
      const response = await api.get(`/attendance?${params}`);
      return response.data;
    },
    { enabled: !!schoolId }
  );

  const { data: stats } = useQuery(
    ['attendance-stats', schoolId, startDate, endDate],
    async () => {
      if (!schoolId) return { stats: [] };
      const response = await api.get(`/attendance/stats?school_id=${schoolId}&start_date=${startDate}&end_date=${endDate}`);
      return response.data;
    },
    { enabled: !!schoolId }
  );

  const chartOptions = useMemo(() => {
    if (!stats?.stats) return null;
    // Map status to colors: present uses palette, absent/late use alert colors
    const statusColorMap: Record<string, string> = {
      present: '#474448', // gunmetal
      absent: '#EF4444', // red for alert
      late: '#F59E0B', // orange for warning
      excused: '#534b52', // taupe-grey
    };
    
    const data = stats.stats.map((stat: any) => ({
      status: stat.status.charAt(0).toUpperCase() + stat.status.slice(1),
      count: parseInt(stat.count || 0),
      color: statusColorMap[stat.status.toLowerCase()] || '#474448',
    }));
    
    return {
      data,
      series: [
        {
          type: 'pie',
          angleKey: 'count',
          labelKey: 'status',
          fills: data.map((d: any) => d.color),
          strokes: data.map((d: any) => d.color),
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
      filter: 'agSetColumnFilter',
      filterParams: createSetFilterParams('status'),
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
            {formatEnumValue(status)}
          </div>
        );
      },
      valueFormatter: (params: any) => formatEnumValue(params.value),
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
          <div className={styles.dateInput}>
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', width: '100%' }}
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </div>
          <div className={styles.dateInput}>
            <label>Leave Type:</label>
            <select
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', width: '100%' }}
            >
              <option value="all">All Leave Types</option>
              <option value="planned">Planned</option>
              <option value="unplanned">Unplanned</option>
            </select>
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
        {isLoading ? (
          <TableSkeleton rows={10} columns={5} />
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
                  No attendance records found
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

export default Attendance;
