import React, { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  Users, DollarSign, Calendar, BookOpen, TrendingUp, TrendingDown,
  Clock, Download, AlertTriangle, UserX, CreditCard,
  Activity, Phone, ChevronRight, GraduationCap, UserCheck,
  CalendarDays, Cake
} from 'lucide-react';
import { AgChartsReact } from 'ag-charts-react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../contexts/ToastContext';
import { exportDashboardData } from '../utils/export';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import AIChatWidget from '../components/AIChatWidget/AIChatWidget';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const schoolId = user?.school_id;

  const today = new Date().toISOString().split('T')[0];

  // Main stats query - filtered by school_id (using efficient stats endpoints)
  const { data: stats, isLoading } = useQuery(['dashboard-stats', schoolId], async () => {
    if (!schoolId) return null;

    const [
      students,
      pendingFees,
      todayAttendanceStats,
      upcomingExams,
    ] = await Promise.all([
      api.get(`/student?school_id=${schoolId}&limit=1`).catch(() => ({ data: { pagination: { total: 0 } } })),
      api.get(`/fees?school_id=${schoolId}&status=pending&limit=1`).catch(() => ({ data: { pagination: { total: 0 } } })),
      // Use stats endpoint for efficient counting - MUST include school_id
      api.get(`/attendance/stats?school_id=${schoolId}&start_date=${today}&end_date=${today}`).catch(() => ({ data: { stats: [] } })),
      api.get(`/exam?school_id=${schoolId}&status=scheduled&limit=10`).catch(() => ({ data: { data: [] } })),
    ]);

    // Parse today's attendance stats from the stats endpoint
    const statsData = todayAttendanceStats.data.stats || [];
    const presentToday = parseInt(statsData.find((s: any) => s.status === 'present')?.count || '0');
    const absentToday = parseInt(statsData.find((s: any) => s.status === 'absent')?.count || '0');
    const lateToday = parseInt(statsData.find((s: any) => s.status === 'late')?.count || '0');
    const excusedToday = parseInt(statsData.find((s: any) => s.status === 'excused')?.count || '0');
    const totalToday = presentToday + absentToday + lateToday + excusedToday;
    const attendancePercent = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 0;

    return {
      students: students.data.pagination?.total || 0,
      pendingFees: pendingFees.data.pagination?.total || 0,
      attendancePercent,
      presentToday,
      absentToday,
      lateToday,
      totalMarked: totalToday,
      upcomingExams: upcomingExams.data.data?.length || 0,
      chronicAbsentees: [], // Computed separately below
    };
  }, {
    refetchInterval: 30000,
  });

  // Today's UNPLANNED absentees (needs immediate attention)
  const { data: todaysAbsentees } = useQuery(['todays-unplanned-absentees', schoolId], async () => {
    if (!schoolId) return [];
    // Filter for unplanned absences - these need immediate attention
    const response = await api.get(`/attendance?school_id=${schoolId}&date=${today}&status=absent&leave_type=unplanned&limit=20`);
    return response.data.data || [];
  });

  // Pending fees with student details
  const { data: pendingFeesList } = useQuery(['pending-fees-list', schoolId], async () => {
    if (!schoolId) return [];
    const response = await api.get(`/fees?school_id=${schoolId}&status=pending&limit=15`);
    const fees = response.data.data || [];
    // Sort by due date (oldest first - most overdue)
    return fees.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  });

  // Low exam scores (students who failed or scored below 40%)
  const { data: lowScorers } = useQuery(['low-scorers', schoolId], async () => {
    if (!schoolId) return [];
    const response = await api.get(`/exam?school_id=${schoolId}&limit=5&status=completed`);
    const exams = response.data.data || [];

    // Get results for recent exams
    const lowScoringStudents: any[] = [];

    for (const exam of exams.slice(0, 3)) {
      try {
        const resultsRes = await api.get(`/exam/${exam.id}/results?limit=100`);
        const results = resultsRes.data.data || [];

        results.forEach((result: any) => {
          const percentage = (result.marks_obtained / result.max_marks) * 100;
          if (percentage < 40) {
            lowScoringStudents.push({
              ...result,
              exam,
              percentage,
            });
          }
        });
      } catch (e) {
        // Skip if exam results not available
      }
    }

    return lowScoringStudents.sort((a, b) => a.percentage - b.percentage).slice(0, 10);
  });

  // Students with multiple issues (at-risk) - based on pending fees
  const { data: atRiskStudents } = useQuery(['at-risk-students', schoolId], async () => {
    if (!schoolId) return [];
    // Get students with pending fees (more efficient than fetching all attendance)
    const [pendingFeesRes] = await Promise.all([
      api.get(`/fees?school_id=${schoolId}&status=pending&limit=500`).catch(() => ({ data: { data: [] } })),
    ]);

    const pendingFees = pendingFeesRes.data.data || [];

    // Count pending fees per student
    const studentIssues: Record<string, {
      student: any;
      pendingFees: number;
      pendingAmount: number;
    }> = {};

    pendingFees.forEach((fee: any) => {
      if (fee.student) {
        const id = fee.student_id;
        if (!studentIssues[id]) {
          studentIssues[id] = { student: fee.student, pendingFees: 0, pendingAmount: 0 };
        }
        studentIssues[id].pendingFees++;
        studentIssues[id].pendingAmount += parseFloat(fee.amount) || 0;
      }
    });

    // Return students with 2+ pending fees
    return Object.values(studentIssues)
      .filter(s => s.pendingFees >= 2)
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 8);
  });

  // Upcoming birthdays this week
  // Note: We fetch up to 1000 students for birthday checking, but use total count from pagination for accuracy
  const { data: upcomingBirthdays } = useQuery(['upcoming-birthdays', schoolId], async () => {
    if (!schoolId) return [];
    // Fetch first page to get total count, then fetch enough pages to cover all students
    const firstPage = await api.get(`/student?school_id=${schoolId}&limit=1000&page=1`);
    const totalStudents = firstPage.data.pagination?.total || 0;
    const totalPages = Math.ceil(totalStudents / 1000);

    // Fetch all pages if needed (but cap at reasonable limit for performance)
    const maxPages = Math.min(totalPages, 10); // Cap at 10k students for birthday check
    const allPages = await Promise.all(
      Array.from({ length: maxPages }, (_, i) =>
        api.get(`/student?school_id=${schoolId}&limit=1000&page=${i + 1}`)
      )
    );
    const students = allPages.flatMap((page: any) => page.data.data || []);

    const todayDate = new Date();
    const weekLater = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const birthdays = students.filter((student: any) => {
      if (!student.date_of_birth) return false;
      const dob = new Date(student.date_of_birth);
      const thisYearBirthday = new Date(todayDate.getFullYear(), dob.getMonth(), dob.getDate());
      return thisYearBirthday >= todayDate && thisYearBirthday <= weekLater;
    }).map((student: any) => {
      const dob = new Date(student.date_of_birth);
      const thisYearBirthday = new Date(todayDate.getFullYear(), dob.getMonth(), dob.getDate());
      const daysUntil = Math.ceil((thisYearBirthday.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000));
      return { ...student, daysUntil };
    }).sort((a: any, b: any) => a.daysUntil - b.daysUntil);

    return birthdays.slice(0, 5);
  });

  // Attendance trend chart
  const attendanceChartOptions = useMemo(() => {
    const data = [
      { status: 'Present', count: stats?.presentToday || 0, color: '#474448' }, // gunmetal
      { status: 'Absent', count: stats?.absentToday || 0, color: '#EF4444' }, // red for alert
      { status: 'Late', count: stats?.lateToday || 0, color: '#F59E0B' }, // orange for warning
    ].filter(d => d.count > 0);

    if (data.length === 0) {
      return null;
    }

    return {
      data,
      series: [{
        type: 'donut' as const,
        angleKey: 'count',
        labelKey: 'status',
        innerRadiusRatio: 0.6,
        fills: data.map(d => d.color),
        strokes: data.map(d => d.color),
        calloutLabel: {
          enabled: false,
        },
        sectorLabel: {
          color: 'white',
          fontWeight: 'bold' as const,
          formatter: ({ datum }: any) => datum.count > 0 ? datum.count : '',
        },
      }],
      legend: {
        enabled: true,
        position: 'bottom' as const,
      },
    };
  }, [stats]);

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleExport = () => {
    try {
      exportDashboardData(stats, {
        unplannedAbsentees: todaysAbsentees || [],
        pendingFees: pendingFeesList || [],
        atRiskStudents: atRiskStudents || [],
      });
      showSuccess('Dashboard data exported successfully!');
    } catch (error) {
      showError('Failed to export dashboard data');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>Loading student dashboard...</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Student Dashboard</h1>
          <p className={styles.subtitle}>Monitor student performance, attendance, and wellbeing</p>
        </div>
        <Button icon={<Download size={18} />} variant="outline" onClick={handleExport} style={{ display: 'none' }}>
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className={styles.statsGrid}>
        <Link to="/students" className={styles.statLink}>
          <Card hover className={styles.statCard} style={{ borderLeft: '4px solid var(--gunmetal)' }}>
            <div className={styles.statIcon} style={{ backgroundColor: 'var(--gunmetal)20', color: 'var(--gunmetal)' }}>
              <Users size={24} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats?.students.toLocaleString() || '0'}</div>
              <div className={styles.statTitle}>Total Students</div>
              <div className={styles.statTrend} style={{ visibility: 'hidden' }}>
                <span></span>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/attendance" className={styles.statLink}>
          <Card hover className={styles.statCard} style={{ borderLeft: (stats?.absentToday || 0) > 0 ? '4px solid #EF4444' : '4px solid var(--taupe-grey)' }}>
            <div className={styles.statIcon} style={{ backgroundColor: (stats?.absentToday || 0) > 0 ? '#EF444420' : 'var(--taupe-grey)20', color: (stats?.absentToday || 0) > 0 ? '#EF4444' : 'var(--taupe-grey)' }}>
              <UserX size={24} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats?.absentToday || '0'}</div>
              <div className={styles.statTitle}>Absent Today</div>
              {(stats?.absentToday || 0) > 0 && (
                <div className={styles.statTrend} style={{ color: '#EF4444' }}>
                  <AlertTriangle size={12} />
                  <span>Needs attention</span>
                </div>
              )}
            </div>
          </Card>
        </Link>

        <Link to="/fees?status=pending" className={styles.statLink}>
          <Card hover className={styles.statCard} style={{ borderLeft: (stats?.pendingFees || 0) > 0 ? '4px solid #F59E0B' : '4px solid var(--taupe-grey)' }}>
            <div className={styles.statIcon} style={{ backgroundColor: (stats?.pendingFees || 0) > 0 ? '#F59E0B20' : 'var(--taupe-grey)20', color: (stats?.pendingFees || 0) > 0 ? '#F59E0B' : 'var(--taupe-grey)' }}>
              <CreditCard size={24} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats?.pendingFees.toLocaleString() || '0'}</div>
              <div className={styles.statTitle}>Pending Fees</div>
              {(stats?.pendingFees || 0) > 0 && (
                <div className={styles.statTrend} style={{ color: '#F59E0B' }}>
                  <Clock size={12} />
                  <span>Awaiting payment</span>
                </div>
              )}
            </div>
          </Card>
        </Link>

        <Link to="/attendance" className={styles.statLink}>
          <Card hover className={styles.statCard} style={{ borderLeft: '4px solid var(--gunmetal)' }}>
            <div className={styles.statIcon} style={{ backgroundColor: 'var(--gunmetal)20', color: 'var(--gunmetal)' }}>
              <UserCheck size={24} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats?.attendancePercent || 0}%</div>
              <div className={styles.statTitle}>Attendance Rate</div>
              <div className={styles.statTrend} style={{ color: 'var(--taupe-grey)' }}>
                <TrendingUp size={12} />
                <span>Today</span>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/exams?status=upcoming" className={styles.statLink}>
          <Card hover className={styles.statCard} style={{ borderLeft: '4px solid var(--taupe-grey)' }}>
            <div className={styles.statIcon} style={{ backgroundColor: 'var(--taupe-grey)20', color: 'var(--taupe-grey)' }}>
              <BookOpen size={24} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats?.upcomingExams || 0}</div>
              <div className={styles.statTitle}>Upcoming Exams</div>
              <div className={styles.statTrend} style={{ color: 'var(--taupe-grey)' }}>
                <CalendarDays size={12} />
                <span>This week</span>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        {/* Left Column - Priority Issues */}
        <div className={styles.leftColumn}>
          {/* Today's Unplanned Absentees - Needs Attention */}
          <Card className={`${styles.section} ${styles.alertSection}`}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleWithIcon}>
                <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
                <h2 className={styles.sectionTitle}>Unplanned Absences</h2>
              </div>
              <Link to={`/attendance?date=${today}&status=absent&leave_type=unplanned`} className={styles.viewAll}>View All</Link>
            </div>
            <p className={styles.sectionDesc}>Students absent without prior notice - requires follow-up</p>
            {todaysAbsentees && todaysAbsentees.length > 0 ? (
              <div className={styles.studentList}>
                {todaysAbsentees.slice(0, 8).map((record: any) => (
                  <Link key={record.id} to={`/students/${record.student?.id}`} className={styles.studentItem}>
                    <div className={styles.studentAvatar} style={{ backgroundColor: 'var(--color-error)20', color: 'var(--color-error)' }}>
                      {record.student?.first_name?.charAt(0)}{record.student?.last_name?.charAt(0)}
                    </div>
                    <div className={styles.studentInfo}>
                      <div className={styles.studentName}>
                        {record.student?.first_name} {record.student?.last_name}
                      </div>
                      <div className={styles.studentMeta}>
                        {record.student?.admission_number} • {record.class?.name || 'N/A'}
                      </div>
                    </div>
                    <div className={styles.contactActions}>
                      <button className={styles.contactBtn} title="Call Parent" onClick={(e) => { e.preventDefault(); window.location.href = `tel:${record.student?.father_phone}`; }}>
                        <Phone size={14} />
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <UserCheck size={32} />
                <p>All students present today!</p>
              </div>
            )}
          </Card>

          {/* At-Risk Students */}
          {atRiskStudents && atRiskStudents.length > 0 && (
            <Card className={styles.alertSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleWithIcon}>
                  <AlertTriangle size={20} className={styles.alertIcon} />
                  <h2 className={styles.sectionTitle}>At-Risk Students</h2>
                </div>
                <span className={styles.badge}>{atRiskStudents.length}</span>
              </div>
              <p className={styles.sectionDesc}>Students with multiple issues requiring attention</p>
              <div className={styles.studentList}>
                {atRiskStudents.map((item: any) => (
                  <Link key={item.student.id} to={`/students/${item.student.id}`} className={styles.studentItem}>
                    <div className={styles.studentAvatar}>
                      {item.student.first_name?.charAt(0)}{item.student.last_name?.charAt(0)}
                    </div>
                    <div className={styles.studentInfo}>
                      <div className={styles.studentName}>
                        {item.student.first_name} {item.student.last_name}
                      </div>
                      <div className={styles.studentMeta}>
                        {item.student.admission_number} • {item.student.class?.name || 'N/A'}
                      </div>
                    </div>
                    <div className={styles.issuesBadges}>
                      <span className={styles.issueBadge} style={{ backgroundColor: 'var(--color-warning)20', color: 'var(--color-warning)' }}>
                        <DollarSign size={12} /> {item.pendingFees} fees
                      </span>
                      <span className={styles.issueBadge} style={{ backgroundColor: 'var(--color-error)20', color: 'var(--color-error)' }}>
                        <CreditCard size={12} /> ₹{item.pendingAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <ChevronRight size={16} className={styles.chevron} />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Low Exam Scores */}
          <Card className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleWithIcon}>
                <TrendingDown size={20} style={{ color: 'var(--color-warning)' }} />
                <h2 className={styles.sectionTitle}>Low Exam Scores</h2>
              </div>
              <Link to="/exams" className={styles.viewAll}>View All</Link>
            </div>
            {lowScorers && lowScorers.length > 0 ? (
              <div className={styles.studentList}>
                {lowScorers.slice(0, 6).map((result: any, idx: number) => (
                  <Link key={idx} to={`/students/${result.student?.id}`} className={styles.studentItem}>
                    <div className={styles.studentAvatar} style={{ backgroundColor: 'var(--color-warning)20', color: 'var(--color-warning)' }}>
                      {result.student?.first_name?.charAt(0)}{result.student?.last_name?.charAt(0)}
                    </div>
                    <div className={styles.studentInfo}>
                      <div className={styles.studentName}>
                        {result.student?.first_name} {result.student?.last_name}
                      </div>
                      <div className={styles.studentMeta}>
                        {result.exam?.name} • {result.subject?.name || 'N/A'}
                      </div>
                    </div>
                    <div className={styles.scoreBadge} style={{
                      backgroundColor: result.percentage < 33 ? 'var(--color-error)20' : 'var(--color-warning)20',
                      color: result.percentage < 33 ? 'var(--color-error)' : 'var(--color-warning)'
                    }}>
                      {result.marks_obtained}/{result.max_marks} ({result.percentage.toFixed(0)}%)
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <GraduationCap size={32} />
                <p>No low scores to report</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Quick Info */}
        <div className={styles.rightColumn}>
          {/* Today's Attendance Chart */}
          <Card className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Today's Attendance</h2>
            </div>
            {attendanceChartOptions ? (
              <div style={{ height: '200px' }}>
                <AgChartsReact options={attendanceChartOptions as any} />
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Calendar size={32} />
                <p>No attendance data yet</p>
              </div>
            )}
            <div className={styles.attendanceStats}>
              <div className={styles.attendanceStat}>
                <span className={styles.dot} style={{ backgroundColor: '#474448' }}></span>
                <span>Present: {stats?.presentToday || 0}</span>
              </div>
              <div className={styles.attendanceStat}>
                <span className={styles.dot} style={{ backgroundColor: '#EF4444' }}></span>
                <span>Absent: {stats?.absentToday || 0}</span>
              </div>
              <div className={styles.attendanceStat}>
                <span className={styles.dot} style={{ backgroundColor: '#F59E0B' }}></span>
                <span>Late: {stats?.lateToday || 0}</span>
              </div>
            </div>
          </Card>

          {/* Pending Fees */}
          <Card className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleWithIcon}>
                <CreditCard size={20} style={{ color: 'var(--color-warning)' }} />
                <h2 className={styles.sectionTitle}>Overdue Fees</h2>
              </div>
              <Link to="/fees?status=pending" className={styles.viewAll}>View All</Link>
            </div>
            {pendingFeesList && pendingFeesList.length > 0 ? (
              <div className={styles.feesList}>
                {pendingFeesList.slice(0, 5).map((fee: any) => {
                  const daysOverdue = getDaysOverdue(fee.due_date);
                  return (
                    <Link key={fee.id} to="/fees?status=pending" className={styles.feeItem}>
                      <div className={styles.feeInfo}>
                        <div className={styles.feeName}>
                          {fee.student?.first_name} {fee.student?.last_name}
                        </div>
                        <div className={styles.feeMeta}>
                          {fee.fee_type} • {fee.student?.class?.name || 'N/A'}
                        </div>
                      </div>
                      <div className={styles.feeAmount}>
                        <div className={styles.amount}>₹{parseFloat(fee.amount).toLocaleString('en-IN')}</div>
                        {daysOverdue > 0 && (
                          <div className={styles.overdue}>{daysOverdue}d overdue</div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <DollarSign size={32} />
                <p>No pending fees</p>
              </div>
            )}
          </Card>

          {/* Upcoming Birthdays */}
          <Card className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleWithIcon}>
                <Cake size={20} style={{ color: 'var(--color-info)' }} />
                <h2 className={styles.sectionTitle}>Upcoming Birthdays</h2>
              </div>
            </div>
            {upcomingBirthdays && upcomingBirthdays.length > 0 ? (
              <div className={styles.birthdayList}>
                {upcomingBirthdays.map((student: any) => (
                  <Link key={student.id} to={`/students/${student.id}`} className={styles.birthdayItem}>
                    <div className={styles.birthdayAvatar}>
                      {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                    </div>
                    <div className={styles.birthdayInfo}>
                      <div className={styles.birthdayName}>
                        {student.first_name} {student.last_name}
                      </div>
                      <div className={styles.birthdayClass}>
                        {student.class?.name || 'N/A'}
                      </div>
                    </div>
                    <div className={styles.birthdayDate}>
                      {student.daysUntil === 0 ? (
                        <span className={styles.todayBadge}>Today! 🎂</span>
                      ) : (
                        <span>{student.daysUntil} day{student.daysUntil > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Cake size={32} />
                <p>No birthdays this week</p>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className={styles.section}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.actionsGrid}>
              <Link to="/students" className={styles.actionCard}>
                <Users size={20} />
                <span>Students</span>
              </Link>
              <Link to="/attendance" className={styles.actionCard}>
                <Calendar size={20} />
                <span>Attendance</span>
              </Link>
              <Link to="/fees" className={styles.actionCard}>
                <DollarSign size={20} />
                <span>Fees</span>
              </Link>
              <Link to="/exams" className={styles.actionCard}>
                <BookOpen size={20} />
                <span>Exams</span>
              </Link>
              <Link to="/calendar" className={styles.actionCard}>
                <CalendarDays size={20} />
                <span>Calendar</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* AI Chat Widget - Floating */}
      <AIChatWidget />
    </div>
  );
};

export default Dashboard;
