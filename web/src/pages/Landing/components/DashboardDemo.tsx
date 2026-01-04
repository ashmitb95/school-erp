import React from 'react';
import { Users, DollarSign, UserCheck, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react';
import { AgChartsReact } from 'ag-charts-react';
import styles from './DashboardDemo.module.css';

interface DashboardDemoProps {
  isPreview?: boolean;
}

const DashboardDemo: React.FC<DashboardDemoProps> = ({ isPreview = false }) => {
  const stats = {
    students: 1245,
    pendingFees: 23,
    attendancePercent: 92,
    upcomingExams: 5,
  };

  const attendanceData = [
    { status: 'Present', count: 1145, color: '#474448' },
    { status: 'Absent', count: 85, color: '#EF4444' },
    { status: 'Late', count: 15, color: '#F59E0B' },
  ];

  const chartOptions = {
    data: attendanceData,
    series: [
      {
        type: 'donut' as const,
        angleKey: 'count',
        labelKey: 'status',
        innerRadiusRatio: 0.6,
        fills: attendanceData.map(d => d.color),
        strokes: attendanceData.map(d => d.color),
        calloutLabel: { enabled: false },
        sectorLabel: {
          color: 'white',
          fontWeight: 'bold' as const,
          formatter: ({ datum }: any) => datum.count > 0 ? datum.count : '',
        },
      },
    ],
    legend: {
      enabled: true,
      position: 'bottom' as const,
    },
  };

  return (
    <div className={`${styles.dashboardDemo} ${isPreview ? styles.preview : ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>Dashboard Overview</h3>
        <p className={styles.subtitle}>Real-time insights at a glance</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
            <Users size={20} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.students.toLocaleString()}</div>
            <div className={styles.statTitle}>Total Students</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}>
            <DollarSign size={20} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.pendingFees}</div>
            <div className={styles.statTitle}>Pending Fees</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
            <UserCheck size={20} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.attendancePercent}%</div>
            <div className={styles.statTitle}>Attendance Rate</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
            <BookOpen size={20} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.upcomingExams}</div>
            <div className={styles.statTitle}>Upcoming Exams</div>
          </div>
        </div>
      </div>

      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h4 className={styles.chartTitle}>Today's Attendance</h4>
        </div>
        <div className={styles.chartContainer}>
          <AgChartsReact options={chartOptions as any} />
        </div>
        <div className={styles.attendanceStats}>
          <div className={styles.attendanceStat}>
            <span className={styles.dot} style={{ backgroundColor: '#474448' }}></span>
            <span>Present: {attendanceData[0].count}</span>
          </div>
          <div className={styles.attendanceStat}>
            <span className={styles.dot} style={{ backgroundColor: '#EF4444' }}></span>
            <span>Absent: {attendanceData[1].count}</span>
          </div>
          <div className={styles.attendanceStat}>
            <span className={styles.dot} style={{ backgroundColor: '#F59E0B' }}></span>
            <span>Late: {attendanceData[2].count}</span>
          </div>
        </div>
      </div>

      {!isPreview && (
        <div className={styles.alertsSection}>
          <div className={styles.alertCard}>
            <AlertTriangle size={16} style={{ color: '#EF4444' }} />
            <div className={styles.alertContent}>
              <div className={styles.alertTitle}>Unplanned Absences</div>
              <div className={styles.alertDescription}>12 students absent without notice - requires follow-up</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardDemo;





