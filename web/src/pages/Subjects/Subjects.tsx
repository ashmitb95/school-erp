import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Search, Plus, Edit, Trash2, BookOpen, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import TableWrapper from '../../components/TableWrapper/TableWrapper';
import TableSkeleton from '../../components/TableSkeleton/TableSkeleton';
import styles from './Subjects.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const Subjects: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(
    ['subjects', page, search],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (search) params.append('search', search);
      const response = await api.get(`/management/subjects?${params}`);
      return response.data;
    }
  );

  const { data: subjectSummary } = useQuery(
    'subjectSummary',
    async () => {
      const [totalSubjects] = await Promise.all([
        api.get('/management/subjects?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
      ]);

      return {
        totalSubjects: totalSubjects.data.pagination?.total || 0,
      };
    }
  );

  const deleteMutation = useMutation(
    async (id: string) => {
      await api.delete(`/management/subjects/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subjects');
        queryClient.invalidateQueries('subjectSummary');
      },
    }
  );

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this subject?')) {
      deleteMutation.mutate(id);
    }
  };

  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Subject Name',
      field: 'name',
      width: 250,
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
      width: 120,
    },
    {
      headerName: 'Description',
      field: 'description',
      width: 300,
      cellRenderer: (params: ICellRendererParams) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {params.value || '-'}
        </span>
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
  ], [handleDelete]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Subjects</h1>
          <p className={styles.subtitle}>Manage all subjects taught in the school</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary">Export CSV</Button>
          <Button icon={<Plus size={18} />}>Add Subject</Button>
        </div>
      </div>

      <div className={styles.analyticsGrid}>
        <Card className={styles.analyticsCard}>
          <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
            <BookOpen size={24} />
          </div>
          <div className={styles.analyticsContent}>
            <div className={styles.analyticsValue}>
              {subjectSummary?.totalSubjects.toLocaleString() || '0'}
            </div>
            <div className={styles.analyticsTitle}>Total Subjects</div>
          </div>
          <TrendingUp size={16} className={styles.analyticsTrend} />
        </Card>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Search subjects by name or code..."
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
        <TableWrapper>
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
                    No subjects found
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

export default Subjects;

