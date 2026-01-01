import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, DollarSign, Calendar, BookOpen, BarChart3,
  Briefcase, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Bus,
  Search, Plus, Eye, CheckCircle, XCircle, Clock, TrendingUp
} from 'lucide-react';
import { AgChartsReact } from 'ag-charts-react';
import AIChatDemo from './AIChatDemo';
import TransportDemo from './TransportDemo';
import DashboardDemo from './DashboardDemo';
import styles from './FeaturesCarousel.module.css';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlights: string[];
  mockup: React.ReactNode;
}

// Mockup Components - Enriched versions matching actual UI
const StudentManagementMockup: React.FC = () => {
  const classChartData = [
    { name: 'Class 10', count: 45 },
    { name: 'Class 9', count: 52 },
    { name: 'Class 8', count: 48 },
    { name: 'Class 7', count: 50 },
  ];

  const classChartOptions = {
    data: classChartData,
    series: [{
      type: 'pie' as const,
      angleKey: 'count',
      labelKey: 'name',
      outerRadiusRatio: 0.8,
      innerRadiusRatio: 0.5,
    }],
    legend: { enabled: true, position: 'right' as const },
  };

  return (
    <div className={styles.mockupContainer}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupHeaderLeft}>
          <div className={styles.mockupDot} style={{ background: '#EF4444' }}></div>
          <div className={styles.mockupDot} style={{ background: '#F59E0B' }}></div>
          <div className={styles.mockupDot} style={{ background: '#10B981' }}></div>
        </div>
        <div className={styles.mockupTitle}>Students</div>
        <div className={styles.mockupActions}>
          <div className={styles.mockupButton}></div>
        </div>
      </div>
      <div className={styles.mockupContent}>
        <div className={styles.mockupSearch}>
          <Search size={16} />
          <span>Search students...</span>
        </div>
        
        <div className={styles.mockupStatsRow}>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: 'var(--color-primary)20' }}>
              <Users size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>1,245</div>
              <div className={styles.mockupStatLabel}>Total Students</div>
            </div>
          </div>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: 'var(--color-info)20' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>+12</div>
              <div className={styles.mockupStatLabel}>This Month</div>
            </div>
          </div>
        </div>

        <div className={styles.mockupChartSection}>
          <div className={styles.mockupChartTitle}>Class Distribution</div>
          <div className={styles.mockupChart}>
            <AgChartsReact options={classChartOptions as any} />
          </div>
        </div>

        <div className={styles.mockupTable}>
          <div className={styles.mockupTableHeader}>
            <div className={styles.mockupTableCol} style={{ flex: 2 }}>Name</div>
            <div className={styles.mockupTableCol}>Class</div>
            <div className={styles.mockupTableCol}>Status</div>
            <div className={styles.mockupTableCol}>Actions</div>
          </div>
          {[
            { name: 'Rahul Sharma', class: '10-A', status: 'Active' },
            { name: 'Priya Patel', class: '9-B', status: 'Active' },
            { name: 'Amit Kumar', class: '8-A', status: 'Active' },
            { name: 'Sneha Verma', class: '7-C', status: 'Active' },
          ].map((row, i) => (
            <div key={i} className={styles.mockupTableRow}>
              <div className={styles.mockupTableCol} style={{ flex: 2 }}>
                <div className={styles.mockupAvatar}></div>
                <div className={styles.mockupText} style={{ width: '100px' }}></div>
              </div>
              <div className={styles.mockupTableCol}>
                <div className={styles.mockupText} style={{ width: '50px' }}></div>
              </div>
              <div className={styles.mockupTableCol}>
                <div className={styles.mockupBadge} style={{ background: '#10B98120', borderColor: '#10B981' }}></div>
              </div>
              <div className={styles.mockupTableCol}>
                <Eye size={14} style={{ color: 'var(--color-text-secondary)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FeeManagementMockup: React.FC = () => {
  const feeTypeData = [
    { type: 'Tuition', count: 450 },
    { type: 'Library', count: 120 },
    { type: 'Sports', count: 80 },
  ];

  const feeChartOptions = {
    data: feeTypeData,
    series: [{
      type: 'bar' as const,
      xKey: 'type',
      yKey: 'count',
      fill: 'var(--color-primary)',
      stroke: 'var(--color-primary)',
    }],
    axes: [
      { type: 'category' as const, position: 'bottom' as const },
      { type: 'number' as const, position: 'left' as const },
    ],
  };

  return (
    <div className={styles.mockupContainer}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupHeaderLeft}>
          <div className={styles.mockupDot} style={{ background: '#EF4444' }}></div>
          <div className={styles.mockupDot} style={{ background: '#F59E0B' }}></div>
          <div className={styles.mockupDot} style={{ background: '#10B981' }}></div>
        </div>
        <div className={styles.mockupTitle}>Fee Management</div>
        <div className={styles.mockupActions}>
          <div className={styles.mockupButton}></div>
        </div>
      </div>
      <div className={styles.mockupContent}>
        <div className={styles.mockupSearch}>
          <Search size={16} />
          <span>Search fees...</span>
        </div>

        <div className={styles.mockupStatsRow}>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: '#10B98120' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>₹2.4L</div>
              <div className={styles.mockupStatLabel}>Collected</div>
            </div>
          </div>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: '#F59E0B20' }}>
              <Clock size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>₹45K</div>
              <div className={styles.mockupStatLabel}>Pending</div>
            </div>
          </div>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: 'var(--color-primary)20' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>92%</div>
              <div className={styles.mockupStatLabel}>Collection Rate</div>
            </div>
          </div>
        </div>

        <div className={styles.mockupChartSection}>
          <div className={styles.mockupChartTitle}>Fee Type Distribution</div>
          <div className={styles.mockupChart}>
            <AgChartsReact options={feeChartOptions as any} />
          </div>
        </div>

        <div className={styles.mockupTable}>
          <div className={styles.mockupTableHeader}>
            <div className={styles.mockupTableCol} style={{ flex: 2 }}>Student</div>
            <div className={styles.mockupTableCol}>Amount</div>
            <div className={styles.mockupTableCol}>Status</div>
            <div className={styles.mockupTableCol}>Actions</div>
          </div>
          {[
            { amount: '₹5,000', status: 'Pending' },
            { amount: '₹7,500', status: 'Pending' },
            { amount: '₹6,000', status: 'Paid' },
          ].map((row, i) => (
            <div key={i} className={styles.mockupTableRow}>
              <div className={styles.mockupTableCol} style={{ flex: 2 }}>
                <div className={styles.mockupText} style={{ width: '120px' }}></div>
              </div>
              <div className={styles.mockupTableCol}>
                <div className={styles.mockupText} style={{ width: '70px', fontWeight: 600 }}></div>
              </div>
              <div className={styles.mockupTableCol}>
                {row.status === 'Paid' ? (
                  <div className={styles.mockupBadge} style={{ background: '#10B98120', borderColor: '#10B981' }}>
                    <CheckCircle size={12} />
                    <span>Paid</span>
                  </div>
                ) : (
                  <div className={styles.mockupBadge} style={{ background: '#F59E0B20', borderColor: '#F59E0B' }}>
                    <Clock size={12} />
                    <span>Pending</span>
                  </div>
                )}
              </div>
              <div className={styles.mockupTableCol}>
                <div className={styles.mockupActionButton}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AttendanceMockup: React.FC = () => {
  const attendanceData = [
    { status: 'Present', count: 1145, color: '#474448' },
    { status: 'Absent', count: 85, color: '#EF4444' },
    { status: 'Late', count: 15, color: '#F59E0B' },
  ];

  const chartOptions = {
    data: attendanceData,
    series: [{
      type: 'pie' as const,
      angleKey: 'count',
      labelKey: 'status',
      fills: attendanceData.map(d => d.color),
      strokes: attendanceData.map(d => d.color),
    }],
    legend: { enabled: true, position: 'bottom' as const },
  };

  return (
    <div className={styles.mockupContainer}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupHeaderLeft}>
          <div className={styles.mockupDot} style={{ background: '#EF4444' }}></div>
          <div className={styles.mockupDot} style={{ background: '#F59E0B' }}></div>
          <div className={styles.mockupDot} style={{ background: '#10B981' }}></div>
        </div>
        <div className={styles.mockupTitle}>Attendance</div>
        <div className={styles.mockupActions}>
          <div className={styles.mockupDatePicker}></div>
        </div>
      </div>
      <div className={styles.mockupContent}>
        <div className={styles.mockupSearch}>
          <Search size={16} />
          <span>Search attendance...</span>
        </div>

        <div className={styles.mockupStatsRow}>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: '#47444820' }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>1,145</div>
              <div className={styles.mockupStatLabel}>Present</div>
            </div>
          </div>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: '#EF444420' }}>
              <XCircle size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>85</div>
              <div className={styles.mockupStatLabel}>Absent</div>
            </div>
          </div>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: '#F59E0B20' }}>
              <Clock size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>15</div>
              <div className={styles.mockupStatLabel}>Late</div>
            </div>
          </div>
        </div>

        <div className={styles.mockupChartSection}>
          <div className={styles.mockupChartTitle}>Today's Attendance</div>
          <div className={styles.mockupChart}>
            <AgChartsReact options={chartOptions as any} />
          </div>
        </div>

        <div className={styles.mockupTable}>
          <div className={styles.mockupTableHeader}>
            <div className={styles.mockupTableCol} style={{ flex: 2 }}>Student</div>
            <div className={styles.mockupTableCol}>Status</div>
            <div className={styles.mockupTableCol}>Time</div>
          </div>
          {[
            { status: 'Present', time: '8:30 AM' },
            { status: 'Present', time: '8:25 AM' },
            { status: 'Absent', time: '-' },
            { status: 'Late', time: '9:15 AM' },
          ].map((row, i) => (
            <div key={i} className={styles.mockupTableRow}>
              <div className={styles.mockupTableCol} style={{ flex: 2 }}>
                <div className={styles.mockupAvatar}></div>
                <div className={styles.mockupText} style={{ width: '120px' }}></div>
              </div>
              <div className={styles.mockupTableCol}>
                {row.status === 'Present' ? (
                  <div className={styles.mockupBadge} style={{ background: '#47444820', borderColor: '#474448' }}>
                    <CheckCircle size={12} />
                    <span>Present</span>
                  </div>
                ) : row.status === 'Absent' ? (
                  <div className={styles.mockupBadge} style={{ background: '#EF444420', borderColor: '#EF4444' }}>
                    <XCircle size={12} />
                    <span>Absent</span>
                  </div>
                ) : (
                  <div className={styles.mockupBadge} style={{ background: '#F59E0B20', borderColor: '#F59E0B' }}>
                    <Clock size={12} />
                    <span>Late</span>
                  </div>
                )}
              </div>
              <div className={styles.mockupTableCol}>
                <div className={styles.mockupText} style={{ width: '70px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ExamManagementMockup: React.FC = () => {
  const examTypeData = [
    { type: 'Unit Test', count: 12 },
    { type: 'Mid Term', count: 8 },
    { type: 'Final', count: 4 },
  ];

  const examChartOptions = {
    data: examTypeData,
    series: [{
      type: 'bar' as const,
      xKey: 'type',
      yKey: 'count',
      fill: 'var(--color-primary)',
      stroke: 'var(--color-primary)',
    }],
    axes: [
      { type: 'category' as const, position: 'bottom' as const },
      { type: 'number' as const, position: 'left' as const },
    ],
  };

  return (
    <div className={styles.mockupContainer}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupHeaderLeft}>
          <div className={styles.mockupDot} style={{ background: '#EF4444' }}></div>
          <div className={styles.mockupDot} style={{ background: '#F59E0B' }}></div>
          <div className={styles.mockupDot} style={{ background: '#10B981' }}></div>
        </div>
        <div className={styles.mockupTitle}>Exams & Assessments</div>
        <div className={styles.mockupActions}>
          <div className={styles.mockupButton}></div>
        </div>
      </div>
      <div className={styles.mockupContent}>
        <div className={styles.mockupSearch}>
          <Search size={16} />
          <span>Search exams...</span>
        </div>

        <div className={styles.mockupStatsRow}>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: 'var(--color-primary)20' }}>
              <BookOpen size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>24</div>
              <div className={styles.mockupStatLabel}>Total Exams</div>
            </div>
          </div>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: '#F59E0B20' }}>
              <Clock size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>5</div>
              <div className={styles.mockupStatLabel}>Upcoming</div>
            </div>
          </div>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: '#10B98120' }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>18</div>
              <div className={styles.mockupStatLabel}>Completed</div>
            </div>
          </div>
        </div>

        <div className={styles.mockupChartSection}>
          <div className={styles.mockupChartTitle}>Exam Type Distribution</div>
          <div className={styles.mockupChart}>
            <AgChartsReact options={examChartOptions as any} />
          </div>
        </div>

        <div className={styles.mockupTable}>
          <div className={styles.mockupTableHeader}>
            <div className={styles.mockupTableCol} style={{ flex: 2 }}>Exam</div>
            <div className={styles.mockupTableCol}>Date</div>
            <div className={styles.mockupTableCol}>Status</div>
            <div className={styles.mockupTableCol}>Actions</div>
          </div>
          {[
            { date: '2024-01-15', status: 'Upcoming' },
            { date: '2024-01-20', status: 'Upcoming' },
            { date: '2024-01-10', status: 'Completed' },
          ].map((row, i) => (
            <div key={i} className={styles.mockupTableRow}>
              <div className={styles.mockupTableCol} style={{ flex: 2 }}>
                <div className={styles.mockupText} style={{ width: '150px' }}></div>
              </div>
              <div className={styles.mockupTableCol}>
                <div className={styles.mockupText} style={{ width: '90px' }}></div>
              </div>
              <div className={styles.mockupTableCol}>
                {row.status === 'Completed' ? (
                  <div className={styles.mockupBadge} style={{ background: '#10B98120', borderColor: '#10B981' }}>
                    <CheckCircle size={12} />
                    <span>Completed</span>
                  </div>
                ) : (
                  <div className={styles.mockupBadge} style={{ background: '#F59E0B20', borderColor: '#F59E0B' }}>
                    <Clock size={12} />
                    <span>Upcoming</span>
                  </div>
                )}
              </div>
              <div className={styles.mockupTableCol}>
                <Eye size={14} style={{ color: 'var(--color-text-secondary)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HRPayrollMockup: React.FC = () => {
  return (
    <div className={styles.mockupContainer}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupHeaderLeft}>
          <div className={styles.mockupDot} style={{ background: '#EF4444' }}></div>
          <div className={styles.mockupDot} style={{ background: '#F59E0B' }}></div>
          <div className={styles.mockupDot} style={{ background: '#10B981' }}></div>
        </div>
        <div className={styles.mockupTitle}>HR & Payroll</div>
        <div className={styles.mockupActions}>
          <div className={styles.mockupButton}></div>
        </div>
      </div>
      <div className={styles.mockupContent}>
        <div className={styles.mockupSearch}>
          <Search size={16} />
          <span>Search staff...</span>
        </div>

        <div className={styles.mockupStatsRow}>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: 'var(--color-primary)20' }}>
              <Users size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>125</div>
              <div className={styles.mockupStatLabel}>Total Staff</div>
            </div>
          </div>
          <div className={styles.mockupStatCard}>
            <div className={styles.mockupStatIcon} style={{ background: '#10B98120' }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <div className={styles.mockupStatValue}>118</div>
              <div className={styles.mockupStatLabel}>Active</div>
            </div>
          </div>
        </div>

        <div className={styles.mockupTable}>
          <div className={styles.mockupTableHeader}>
            <div className={styles.mockupTableCol} style={{ flex: 2 }}>Staff</div>
            <div className={styles.mockupTableCol}>Department</div>
            <div className={styles.mockupTableCol}>Salary</div>
            <div className={styles.mockupTableCol}>Status</div>
          </div>
          {[
            { dept: 'Teaching', salary: '₹45,000', status: 'Active' },
            { dept: 'Admin', salary: '₹35,000', status: 'Active' },
            { dept: 'Support', salary: '₹25,000', status: 'Active' },
            { dept: 'Teaching', salary: '₹50,000', status: 'Active' },
          ].map((row, i) => (
            <div key={i} className={styles.mockupTableRow}>
              <div className={styles.mockupTableCol} style={{ flex: 2 }}>
                <div className={styles.mockupAvatar}></div>
                <div className={styles.mockupText} style={{ width: '120px' }}></div>
              </div>
              <div className={styles.mockupTableCol}>
                <div className={styles.mockupText} style={{ width: '80px' }}></div>
              </div>
              <div className={styles.mockupTableCol}>
                <div className={styles.mockupText} style={{ width: '80px', fontWeight: 600 }}></div>
              </div>
              <div className={styles.mockupTableCol}>
                <div className={styles.mockupBadge} style={{ background: '#10B98120', borderColor: '#10B981' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const features: Feature[] = [
  {
    id: 'ai-chat',
    title: 'AI-Powered Natural Language Queries',
    description: 'Ask questions in plain English and get instant insights from your data. No technical knowledge required.',
    icon: <Sparkles size={32} />,
    highlights: [
      'Natural language to SQL conversion',
      'Real-time data insights',
      'Interactive charts and tables',
      'Context-aware responses'
    ],
    mockup: <AIChatDemo />,
  },
  {
    id: 'student-management',
    title: 'Complete Student Information System',
    description: 'Manage student records, admissions, enrollment, and academic history all in one place.',
    icon: <Users size={32} />,
    highlights: [
      'Comprehensive student profiles',
      'Admission management',
      'Academic history tracking',
      'Document management'
    ],
    mockup: <StudentManagementMockup />,
  },
  {
    id: 'fee-management',
    title: 'Smart Fee Management & Online Payments',
    description: 'Automated fee collection with online payment integration, reminders, and comprehensive financial tracking.',
    icon: <DollarSign size={32} />,
    highlights: [
      'Online payment gateway integration',
      'Automated fee reminders',
      'Payment tracking & receipts',
      'Financial reports & analytics'
    ],
    mockup: <FeeManagementMockup />,
  },
  {
    id: 'attendance',
    title: 'Real-Time Attendance Tracking',
    description: 'Track student and staff attendance with automated notifications and detailed reporting.',
    icon: <Calendar size={32} />,
    highlights: [
      'Daily attendance marking',
      'Automated absence alerts',
      'Attendance analytics',
      'Parent notifications'
    ],
    mockup: <AttendanceMockup />,
  },
  {
    id: 'exams',
    title: 'Exam & Assessment Management',
    description: 'Schedule exams, manage results, generate report cards, and track student performance over time.',
    icon: <BookOpen size={32} />,
    highlights: [
      'Exam scheduling & management',
      'Result processing',
      'Automated report cards',
      'Performance analytics'
    ],
    mockup: <ExamManagementMockup />,
  },
  {
    id: 'transport',
    title: 'Interactive Transport Route Management',
    description: 'Visualize bus routes on maps, optimize routes, track vehicles, and manage student pickups efficiently.',
    icon: <Bus size={32} />,
    highlights: [
      'Interactive route mapping',
      'Student pickup management',
      'Route optimization',
      'Vehicle & driver tracking'
    ],
    mockup: <TransportDemo />,
  },
  {
    id: 'analytics',
    title: 'Real-Time Analytics & Dashboards',
    description: 'Get instant insights into attendance, fees, exams, and student performance with beautiful visualizations.',
    icon: <BarChart3 size={32} />,
    highlights: [
      'Interactive dashboards',
      'Real-time metrics',
      'Customizable reports',
      'Data visualization'
    ],
    mockup: <DashboardDemo />,
  },
  {
    id: 'hr-payroll',
    title: 'HR & Payroll Management',
    description: 'Manage staff records, attendance, salary processing, leave management, and performance tracking.',
    icon: <Briefcase size={32} />,
    highlights: [
      'Staff management',
      'Payroll processing',
      'Leave management',
      'Performance tracking'
    ],
    mockup: <HRPayrollMockup />,
  },
];

const FeaturesCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const currentFeature = features[currentIndex];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const nextFeature = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % features.length);
  };

  const prevFeature = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + features.length) % features.length);
  };

  const goToFeature = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % features.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.carousel}>
      <div className={styles.carouselHeader}>
        <h3 className={styles.carouselTitle}>Our Core Features</h3>
        <p className={styles.carouselSubtitle}>
          Powerful tools to manage every aspect of your school
        </p>
      </div>

      <div className={styles.carouselContainer}>
        <button
          className={styles.carouselButton}
          onClick={prevFeature}
          aria-label="Previous feature"
        >
          <ChevronLeft size={20} />
        </button>

        <div className={styles.carouselContent}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className={styles.featureCard}
            >
              <div className={styles.featureLeft}>
                <div className={styles.featureIconContainer}>
                  <div className={styles.featureIcon}>
                    {currentFeature.icon}
                  </div>
                </div>

                <h4 className={styles.featureTitle}>{currentFeature.title}</h4>
                <p className={styles.featureDescription}>{currentFeature.description}</p>

                <ul className={styles.featureHighlights}>
                  {currentFeature.highlights.map((highlight, index) => (
                    <li key={index}>
                      <CheckCircle2 size={16} />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.featureRight}>
                <div className={styles.mockupWrapper}>
                  {currentFeature.mockup}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          className={styles.carouselButton}
          onClick={nextFeature}
          aria-label="Next feature"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className={styles.carouselIndicators}>
        {features.map((_, index) => (
          <button
            key={index}
            className={`${styles.indicator} ${index === currentIndex ? styles.active : ''}`}
            onClick={() => goToFeature(index)}
            aria-label={`Go to feature ${index + 1}`}
          />
        ))}
      </div>

      <div className={styles.carouselProgress}>
        <div
          className={styles.progressBar}
          style={{
            width: `${((currentIndex + 1) / features.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};

export default FeaturesCarousel;
