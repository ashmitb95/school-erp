import React, { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Users, DollarSign, Calendar, BookOpen, TrendingUp, AlertCircle, Clock, Download, BarChart3, PieChart, Activity } from 'lucide-react';
import { AgChartsReact } from 'ag-charts-react';
import api from '../services/api';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

  const { data: stats, isLoading } = useQuery('dashboard-stats', async () => {
    const [students, fees, pendingFees, todayAttendance, exams, upcomingExams, monthlyFees, classDistribution, feeStatus] = await Promise.all([
      api.get('/student?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
      api.get('/fees?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
      api.get('/fees?status=pending&limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
      api.get(`/attendance/stats?start_date=${startOfMonth}&end_date=${endOfMonth}`).catch(() => ({ data: { stats: [] } })),
      api.get(`/attendance/stats?start_date=${today}&end_date=${today}`).catch(() => ({ data: { stats: [] } })),
      api.get('/exam?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
      api.get(`/exam?start_date=${today}&limit=10`).catch(() => ({ data: { data: [] } })),
      api.get(`/fees?start_date=${startOfMonth}&end_date=${endOfMonth}&status=paid&limit=1000`).catch(() => ({ data: { data: [] } })),
      api.get('/student/summary/class-distribution').catch(() => ({ data: [] })),
      api.get('/fees/summary/status-distribution').catch(() => ({ data: [] })),
    ]);

    // Calculate attendance percentage
    const todayStats = todayAttendance.data.stats || [];
    const totalToday = todayStats.reduce((sum: number, stat: any) => sum + parseInt(stat.count || 0), 0);
    const presentToday = todayStats.find((s: any) => s.status === 'present')?.count || 0;
    const attendancePercent = totalToday > 0 ? Math.round((parseInt(presentToday) / totalToday) * 100) : 0;

    // Calculate monthly revenue
    const monthlyRevenue = (monthlyFees.data.data || []).reduce((sum: number, fee: any) => sum + parseFloat(fee.amount || 0), 0);

    return {
      students: students.data.pagination?.total || 0,
      totalFees: fees.data.pagination?.total || 0,
      pendingFees: pendingFees.data.pagination?.total || 0,
      attendancePercent,
      exams: exams.data.pagination?.total || 0,
      upcomingExams: upcomingExams.data.data?.length || 0,
      monthlyRevenue,
      classDistribution: classDistribution.data || [],
      feeStatusDistribution: feeStatus.data || [],
    };
  }, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const statCards = useMemo(() => [
    {
      title: 'Total Students',
      value: stats?.students.toLocaleString() || '0',
      icon: Users,
      color: 'var(--color-primary)',
      link: '/students',
      trend: '+5.2%',
    },
    {
      title: 'Pending Fees',
      value: stats?.pendingFees.toLocaleString() || '0',
      icon: DollarSign,
      color: 'var(--color-warning)',
      link: '/fees?status=pending',
      trend: '-2.1%',
    },
    {
      title: 'Today\'s Attendance',
      value: `${stats?.attendancePercent || 0}%`,
      icon: Calendar,
      color: 'var(--color-success)',
      link: '/attendance',
      trend: '+1.5%',
    },
    {
      title: 'Monthly Revenue',
      value: `₹${(stats?.monthlyRevenue || 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'var(--color-info)',
      link: '/fees',
      trend: '+12.3%',
    },
    {
      title: 'Total Exams',
      value: stats?.exams || 0,
      icon: BookOpen,
      color: 'var(--color-secondary)',
      link: '/exams',
      trend: '+3',
    },
    {
      title: 'Upcoming Exams',
      value: stats?.upcomingExams || 0,
      icon: AlertCircle,
      color: 'var(--color-warning)',
      link: '/exams',
      trend: 'This week',
    },
  ], [stats]);

  const classChartOptions = useMemo(() => {
    const data = Array.isArray(stats?.classDistribution) ? stats.classDistribution : [];
    if (data.length === 0) {
      return {
        data: [{ name: 'No Data', count: 0 }],
        series: [{
          type: 'pie' as const,
          angleKey: 'count',
          labelKey: 'name',
        }],
        legend: { enabled: false },
      };
    }

    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'];

    return {
      data: Array.isArray(data) ? data.slice(0, 10) : [], // Limit to top 10 classes
      series: [{
        type: 'pie' as const,
        angleKey: 'count',
        labelKey: 'name',
        outerRadiusRatio: 0.8,
        innerRadiusRatio: 0.5,
        fills: colors,
        strokes: colors,
        sectorLabel: {
          formatter: ({ datum, angleKey }: any) => `${datum[angleKey].toLocaleString()}`,
        },
        calloutLabel: {
          formatter: ({ datum, labelKey }: any) => datum[labelKey],
        },
      }],
      legend: {
        enabled: true,
        position: 'right' as const,
      },
      tooltip: {
        renderer: ({ datum, angleKey, labelKey }: any) => ({
          content: `<strong>${datum[labelKey]}</strong>: ${datum[angleKey].toLocaleString()} students`,
        }),
      },
    };
  }, [stats?.classDistribution]);

  const feeStatusChartOptions = useMemo(() => {
    const data = Array.isArray(stats?.feeStatusDistribution) ? stats.feeStatusDistribution : [];
    if (data.length === 0) {
      return {
        data: [{ status: 'No Data', count: 0 }],
        series: [{
          type: 'bar' as const,
          xKey: 'status',
          yKey: 'count',
        }],
        axes: [
          { type: 'category' as const, position: 'bottom' as const, title: { text: 'Fee Status' } },
          { type: 'number' as const, position: 'left' as const, title: { text: 'Count' } },
        ],
      };
    }

    const statusColors: Record<string, string> = {
      paid: '#10B981',
      pending: '#F59E0B',
      partial: '#3B82F6',
    };

    return {
      data: Array.isArray(data) ? data.map((item: any) => ({
        ...item,
        status: item.status && typeof item.status === 'string'
          ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
          : 'Unknown',
      })) : [],
      series: [{
        type: 'bar' as const,
        xKey: 'status',
        yKey: 'count',
        fill: (params: any) => statusColors[params.datum.status.toLowerCase()] || '#6B7280',
        stroke: (params: any) => statusColors[params.datum.status.toLowerCase()] || '#6B7280',
        label: {
          formatter: ({ value }: any) => value.toLocaleString(),
        },
      }],
      axes: [
        {
          type: 'category' as const,
          position: 'bottom' as const,
          title: { text: 'Fee Status' },
        },
        {
          type: 'number' as const,
          position: 'left' as const,
          title: { text: 'Count' },
          label: {
            formatter: (params: any) => params.value.toLocaleString(),
          },
        },
      ],
      tooltip: {
        renderer: ({ datum, xKey, yKey }: any) => ({
          content: `<strong>${datum[xKey]}</strong>: ${datum[yKey].toLocaleString()} fees`,
        }),
      },
    };
  }, [stats?.feeStatusDistribution]);

  const { data: recentStudents } = useQuery('recent-students', async () => {
    const response = await api.get('/student?limit=5');
    return response.data.data || [];
  });

  const { data: recentFees } = useQuery('recent-fees', async () => {
    const response = await api.get('/fees?limit=5&status=pending');
    return response.data.data || [];
  });

  const handleExport = () => {
    // Export functionality
    alert('Export feature coming soon!');
  };

  if (isLoading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Executive Dashboard</h1>
          <p className={styles.subtitle}>Real-time insights and analytics for your school</p>
        </div>
        <Button icon={<Download size={18} />} variant="outline" onClick={handleExport}>
          Export Report
        </Button>
      </div>

      <div className={styles.statsGrid}>
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} to={stat.link} className={styles.statLink}>
              <Card hover className={styles.statCard}>
                <div className={styles.statIcon} style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                  <Icon size={24} />
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{stat.value}</div>
                  <div className={styles.statTitle}>{stat.title}</div>
                  <div className={styles.statTrend}>
                    <TrendingUp size={12} />
                    <span>{stat.trend}</span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className={styles.contentGrid}>
        {/* <div className={styles.chartSection}>
          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>Student Distribution by Class</h3>
                <p className={styles.chartSubtitle}>Total students across all classes</p>
              </div>
              <PieChart size={20} className={styles.chartIcon} />
            </div>
            <div style={{ height: '300px', marginTop: '1rem' }}>
              <AgChartsReact options={classChartOptions as any} />
            </div>
          </Card>

          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>Fee Status Distribution</h3>
                <p className={styles.chartSubtitle}>
                  {stats && stats.feeStatusDistribution && stats.feeStatusDistribution.length > 0
                    ? `${stats.feeStatusDistribution.reduce((sum: number, item: any) => sum + item.count, 0).toLocaleString()} total fees`
                    : 'No fee data available'}
                </p>
              </div>
              <BarChart3 size={20} className={styles.chartIcon} />
            </div>
            {stats && stats.feeStatusDistribution && stats.feeStatusDistribution.length > 0 ? (
              <div style={{ height: '300px', marginTop: '1rem' }}>
                <AgChartsReact options={feeStatusChartOptions as any} />
              </div>
            ) : (
              <div style={{ height: '300px', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                <div style={{ textAlign: 'center' }}>
                  <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p>No fee status data available</p>
                </div>
              </div>
            )}
          </Card>
        </div> */}

        <div className={styles.sidebar}>
          <div className={styles.quickActions}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.actionsGrid}>
              <Link to="/students" className={styles.actionCard}>
                <Users size={24} />
                <span>Add Student</span>
              </Link>
              <Link to="/attendance" className={styles.actionCard}>
                <Calendar size={24} />
                <span>Mark Attendance</span>
              </Link>
              <Link to="/fees" className={styles.actionCard}>
                <DollarSign size={24} />
                <span>Collect Fee</span>
              </Link>
              <Link to="/exams" className={styles.actionCard}>
                <BookOpen size={24} />
                <span>Create Exam</span>
              </Link>
              <Link to="/ai" className={styles.actionCard}>
                <Activity size={24} />
                <span>AI Assistant</span>
              </Link>
            </div>
          </div>

          <div className={styles.recentActivity}>
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            <Card>
              <div className={styles.activityList}>
                {recentStudents?.slice(0, 3).map((student: any) => (
                  <Link key={student.id} to={`/students/${student.id}`} className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      <Users size={16} />
                    </div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle}>
                        {student.first_name} {student.last_name}
                      </div>
                      <div className={styles.activitySubtitle}>
                        {student.admission_number} • {student.class?.name}
                      </div>
                    </div>
                    <Clock size={14} className={styles.activityTime} />
                  </Link>
                ))}
                {recentFees?.slice(0, 2).map((fee: any) => (
                  <Link key={fee.id} to={`/fees`} className={styles.activityItem}>
                    <div className={styles.activityIcon} style={{ backgroundColor: 'var(--color-warning)20', color: 'var(--color-warning)' }}>
                      <DollarSign size={16} />
                    </div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle}>
                        {fee.student?.first_name} {fee.student?.last_name}
                      </div>
                      <div className={styles.activitySubtitle}>
                        ₹{parseFloat(fee.amount).toLocaleString()} • {fee.fee_type}
                      </div>
                    </div>
                    <Clock size={14} className={styles.activityTime} />
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
