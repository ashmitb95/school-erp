import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgChartsReact } from 'ag-charts-react';
import { Search, Plus, DollarSign, CheckCircle, XCircle, Clock, Link as LinkIcon, Calendar, Send, Copy, Download, TrendingUp, BarChart3 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../contexts/ToastContext';
import Input from '../components/Input/Input';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import TableSkeleton from '../components/TableSkeleton/TableSkeleton';
import { formatEnumValue, createSetFilterParams } from '../utils/enumFilters';
import styles from './Fees.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const Fees: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showSuccess, showError, showWarning, confirm } = useToast();
  const schoolId = user?.school_id;
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentLink, setPaymentLink] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [postponeReason, setPostponeReason] = useState('');

  const { data, isLoading } = useQuery(
    ['fees', schoolId, page, search, statusFilter],
    async () => {
      if (!schoolId) return { data: [], pagination: { total: 0 } };
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        school_id: schoolId,
      });
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await api.get(`/fees?${params}`);
      return response.data;
    },
    { enabled: !!schoolId }
  );

  // Analytics query
  const { data: analytics } = useQuery(['fees-analytics', schoolId], async () => {
    if (!schoolId) return { totalRevenue: 0, totalPending: 0, totalPaid: 0, statusDistribution: [], feeTypeDistribution: [] };
    const [allFees, pendingFees, paidFees] = await Promise.all([
      api.get(`/fees?school_id=${schoolId}&limit=1000`).catch(() => ({ data: { data: [] } })),
      api.get(`/fees?school_id=${schoolId}&status=pending&limit=1000`).catch(() => ({ data: { data: [] } })),
      api.get(`/fees?school_id=${schoolId}&status=paid&limit=1000`).catch(() => ({ data: { data: [] } })),
    ]);

    const all = allFees.data.data || [];
    const pending = pendingFees.data.data || [];
    const paid = paidFees.data.data || [];

    const totalRevenue = all.reduce((sum: number, fee: any) => sum + parseFloat(fee.amount || 0), 0);
    const pendingAmount = pending.reduce((sum: number, fee: any) => sum + parseFloat(fee.amount || 0), 0);
    const collectedAmount = paid.reduce((sum: number, fee: any) => sum + parseFloat(fee.amount || 0), 0);
    const collectionRate = totalRevenue > 0 ? ((collectedAmount / totalRevenue) * 100).toFixed(1) : '0';

    // Fee type distribution
    const feeTypeDist: Record<string, number> = {};
    all.forEach((fee: any) => {
      const type = fee.fee_type || 'unknown';
      feeTypeDist[type] = (feeTypeDist[type] || 0) + 1;
    });

    return {
      totalRevenue,
      pendingAmount,
      collectedAmount,
      collectionRate,
      totalFees: all.length,
      pendingCount: pending.length,
      paidCount: paid.length,
      feeTypeDistribution: Object.entries(feeTypeDist).map(([type, count]) => ({ type, count })),
    };
  });

  const payFeeMutation = useMutation(
    async ({ id, paid_amount, payment_method, transaction_id }: any) => {
      const response = await api.post(`/fees/${id}/pay`, {
        paid_amount: parseFloat(paid_amount),
        payment_method,
        transaction_id,
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('fees');
        setShowPaymentModal(false);
        setSelectedFee(null);
        setPaymentAmount('');
      },
    }
  );

  const handlePayFee = useCallback((fee: any) => {
    setSelectedFee(fee);
    setPaymentAmount(fee.amount);
    setShowPaymentModal(true);
  }, []);

  const generatePaymentLinkMutation = useMutation(
    async (id: string) => {
      const response = await api.post(`/fees/${id}/payment-link`);
      return response.data;
    },
    {
      onSuccess: (data) => {
        setPaymentLink(data.payment_link);
        setShowPaymentLinkModal(true);
      },
    }
  );

  const postponePaymentMutation = useMutation(
    async ({ id, new_due_date, reason }: any) => {
      const response = await api.patch(`/fees/${id}/postpone`, {
        new_due_date,
        reason,
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('fees');
        setShowPostponeModal(false);
        setSelectedFee(null);
        setNewDueDate('');
        setPostponeReason('');
      },
    }
  );

  const sendReminderMutation = useMutation(
    async ({ id, method }: { id: string; method: string }) => {
      const response = await api.post(`/fees/${id}/reminder`, { method });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('fees');
      },
    }
  );

  const handleGenerateLink = useCallback((fee: any) => {
    generatePaymentLinkMutation.mutate(fee.id);
  }, [generatePaymentLinkMutation]);

  const handlePostpone = useCallback((fee: any) => {
    setSelectedFee(fee);
    setNewDueDate(new Date(fee.due_date).toISOString().split('T')[0]);
    setShowPostponeModal(true);
  }, []);

  const handleSendReminder = useCallback((fee: any) => {
    confirm(
      `Send reminder for fee of ₹${parseFloat(fee.amount).toLocaleString()} to ${fee.student?.first_name} ${fee.student?.last_name}?`,
      () => {
        sendReminderMutation.mutate(
          { id: fee.id, method: 'email' },
          {
            onSuccess: () => showSuccess('Reminder sent successfully'),
            onError: () => showError('Failed to send reminder'),
          }
        );
      }
    );
  }, [sendReminderMutation, confirm, showSuccess, showError]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('Payment link copied to clipboard!');
  }, [showSuccess]);

  const handleSubmitPayment = useCallback(() => {
    if (!selectedFee || !paymentAmount) return;
    payFeeMutation.mutate({
      id: selectedFee.id,
      paid_amount: paymentAmount,
      payment_method: paymentMethod,
      transaction_id: `TXN${Date.now()}`,
    });
  }, [selectedFee, paymentAmount, paymentMethod, payFeeMutation]);

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
      headerName: 'Fee Type',
      field: 'fee_type',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        <span style={{ textTransform: 'capitalize' }}>{params.value}</span>
      ),
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        <div style={{ fontWeight: 600 }}>
          ₹{parseFloat(params.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      headerName: 'Due Date',
      field: 'due_date',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        <div>
          {new Date(params.value).toLocaleDateString()}
        </div>
      ),
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      filter: 'agSetColumnFilter',
      filterParams: createSetFilterParams('fee_status'),
      cellRenderer: (params: ICellRendererParams) => {
        const status = params.value;
        const colors: Record<string, { bg: string; color: string; icon: any }> = {
          paid: { bg: 'var(--color-success)20', color: 'var(--color-success)', icon: CheckCircle },
          pending: { bg: 'var(--color-warning)20', color: 'var(--color-warning)', icon: Clock },
          partial: { bg: 'var(--color-info)20', color: 'var(--color-info)', icon: Clock },
          waived: { bg: 'var(--color-text-secondary)20', color: 'var(--color-text-secondary)', icon: CheckCircle },
        };
        const style = colors[status] || colors.pending;
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
      headerName: 'Paid Date',
      field: 'paid_date',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        <div>
          {params.value ? new Date(params.value).toLocaleDateString() : '-'}
        </div>
      ),
    },
    {
      headerName: 'Payment Method',
      field: 'payment_method',
      width: 140,
      cellRenderer: (params: ICellRendererParams) => (
        <span style={{ textTransform: 'capitalize' }}>{params.value || '-'}</span>
      ),
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 200,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams) => {
        const fee = params.data;
        if (fee.status === 'paid') {
          return <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Paid</span>;
        }
        return (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => handlePayFee(fee)}
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
              title="Pay Fee"
            >
              <DollarSign size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => handleGenerateLink(fee)}
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
                e.currentTarget.style.borderColor = 'var(--color-info)';
                e.currentTarget.style.color = 'var(--color-info)';
                e.currentTarget.style.backgroundColor = 'var(--color-info)10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Generate Payment Link"
            >
              <LinkIcon size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => handlePostpone(fee)}
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
                e.currentTarget.style.borderColor = 'var(--color-warning)';
                e.currentTarget.style.color = 'var(--color-warning)';
                e.currentTarget.style.backgroundColor = 'var(--color-warning)10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Postpone Payment"
            >
              <Calendar size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => handleSendReminder(fee)}
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
                e.currentTarget.style.borderColor = 'var(--color-secondary)';
                e.currentTarget.style.color = 'var(--color-secondary)';
                e.currentTarget.style.backgroundColor = 'var(--color-secondary)10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Send Reminder"
            >
              <Send size={16} strokeWidth={1.5} />
            </button>
          </div>
        );
      },
    },
  ], [handlePayFee, handleGenerateLink, handlePostpone, handleSendReminder]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const feeTypeChartOptions = useMemo(() => ({
    data: analytics?.feeTypeDistribution || [],
    series: [{
      type: 'pie' as const,
      angleKey: 'count',
      labelKey: 'type',
      outerRadiusRatio: 0.8,
      innerRadiusRatio: 0.5,
    }],
    legend: {
      enabled: true,
      position: 'right' as const,
    },
  }), [analytics?.feeTypeDistribution]);

  const handleExport = () => {
    // Export functionality
    const csv = [
      ['Student Name', 'Admission Number', 'Fee Type', 'Amount', 'Due Date', 'Status', 'Paid Date'].join(','),
      ...(data?.data || []).map((fee: any) => [
        `${fee.student?.first_name} ${fee.student?.last_name}`,
        fee.student?.admission_number || '',
        fee.fee_type,
        fee.amount,
        fee.due_date,
        fee.status,
        fee.paid_date || '',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fees-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fee Management</h1>
          <p className={styles.subtitle}>Track and collect student fees with advanced analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button icon={<Download size={18} />} variant="outline" onClick={handleExport} style={{ display: 'none' }}>
            Export
          </Button>
          <Button icon={<Plus size={18} />}>Add Fee</Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className={styles.analyticsGrid}>
          <Card className={styles.analyticsCard}>
            <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
              <DollarSign size={24} />
            </div>
            <div className={styles.analyticsContent}>
              <div className={styles.analyticsLabel}>Total Revenue</div>
              <div className={styles.analyticsValue}>₹{analytics.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
          </Card>
          <Card className={styles.analyticsCard}>
            <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-warning)20', color: 'var(--color-warning)' }}>
              <Clock size={24} />
            </div>
            <div className={styles.analyticsContent}>
              <div className={styles.analyticsLabel}>Pending Amount</div>
              <div className={styles.analyticsValue}>₹{analytics.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className={styles.analyticsSubtext}>{analytics.pendingCount} fees</div>
            </div>
          </Card>
          <Card className={styles.analyticsCard}>
            <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-success)20', color: 'var(--color-success)' }}>
              <CheckCircle size={24} />
            </div>
            <div className={styles.analyticsContent}>
              <div className={styles.analyticsLabel}>Collected</div>
              <div className={styles.analyticsValue}>₹{analytics.collectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className={styles.analyticsSubtext}>{analytics.paidCount} fees</div>
            </div>
          </Card>
          <Card className={styles.analyticsCard}>
            <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-info)20', color: 'var(--color-info)' }}>
              <TrendingUp size={24} />
            </div>
            <div className={styles.analyticsContent}>
              <div className={styles.analyticsLabel}>Collection Rate</div>
              <div className={styles.analyticsValue}>{analytics.collectionRate}%</div>
              <div className={styles.analyticsSubtext}>of total revenue</div>
            </div>
          </Card>
        </div>
      )}

      {/* Chart Section */}
      {analytics && analytics.feeTypeDistribution.length > 0 && (
        <Card className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Fee Type Distribution</h3>
              <p className={styles.chartSubtitle}>Breakdown of fees by type</p>
            </div>
            <BarChart3 size={20} className={styles.chartIcon} />
          </div>
          <div style={{ height: '300px', marginTop: '1rem' }}>
            <AgChartsReact options={feeTypeChartOptions as any} />
          </div>
        </Card>
      )}

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Search by student name or admission number..."
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
          {['all', 'pending', 'paid', 'partial'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
                setSearchParams({ status });
              }}
              className={`${styles.statusFilter} ${statusFilter === status ? styles.active : ''}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
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
                  No fees found
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

      {showPaymentModal && selectedFee && (
        <div className={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Collect Payment</h2>
            <div className={styles.modalContent}>
              <div className={styles.modalRow}>
                <label>Student:</label>
                <span>{selectedFee.student?.first_name} {selectedFee.student?.last_name}</span>
              </div>
              <div className={styles.modalRow}>
                <label>Fee Type:</label>
                <span style={{ textTransform: 'capitalize' }}>{selectedFee.fee_type}</span>
              </div>
              <div className={styles.modalRow}>
                <label>Due Amount:</label>
                <span>₹{parseFloat(selectedFee.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={styles.modalInput}>
                <label>Payment Amount:</label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div className={styles.modalInput}>
                <label>Payment Method:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={styles.select}
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitPayment}
                disabled={!paymentAmount || payFeeMutation.isLoading}
              >
                {payFeeMutation.isLoading ? 'Processing...' : 'Collect Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPaymentLinkModal && paymentLink && (
        <div className={styles.modalOverlay} onClick={() => setShowPaymentLinkModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Payment Link Generated</h2>
            <div className={styles.modalContent}>
              <div className={styles.modalRow}>
                <label>Payment Link:</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                  <input
                    type="text"
                    value={paymentLink}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '2px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(paymentLink)}
                    style={{
                      padding: '0.5rem',
                      border: 'none',
                      background: 'var(--color-primary)',
                      color: 'white',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
                Share this link with the student/parent to collect payment online.
              </p>
            </div>
            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setShowPaymentLinkModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPostponeModal && selectedFee && (
        <div className={styles.modalOverlay} onClick={() => setShowPostponeModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Postpone Payment</h2>
            <div className={styles.modalContent}>
              <div className={styles.modalRow}>
                <label>Student:</label>
                <span>{selectedFee.student?.first_name} {selectedFee.student?.last_name}</span>
              </div>
              <div className={styles.modalRow}>
                <label>Current Due Date:</label>
                <span>{new Date(selectedFee.due_date).toLocaleDateString()}</span>
              </div>
              <div className={styles.modalInput}>
                <label>New Due Date:</label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className={styles.modalInput}>
                <label>Reason (Optional):</label>
                <Input
                  type="text"
                  value={postponeReason}
                  onChange={(e) => setPostponeReason(e.target.value)}
                  placeholder="Enter reason for postponement"
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setShowPostponeModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!newDueDate) {
                    showWarning('Please select a new due date');
                    return;
                  }
                  postponePaymentMutation.mutate({
                    id: selectedFee.id,
                    new_due_date: newDueDate,
                    reason: postponeReason,
                  });
                }}
                disabled={!newDueDate || postponePaymentMutation.isLoading}
              >
                {postponePaymentMutation.isLoading ? 'Processing...' : 'Postpone Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fees;
