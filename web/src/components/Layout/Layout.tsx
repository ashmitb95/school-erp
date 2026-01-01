import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useHasPermission, useHasRole } from '../../hooks/usePermissions';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Calendar,
  BookOpen,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut,
  Briefcase,
  GraduationCap,
  BookMarked,
  Clock,
  Bus,
  Calendar as CalendarIcon,
  Shield,
} from 'lucide-react';
import styles from './Layout.module.css';
import Button from '../Button/Button';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Permission checks
  const canViewStudents = useHasPermission('students', 'read');
  const canViewStaff = useHasPermission('staff', 'read');
  const canViewTimetable = useHasPermission('timetable', 'read');
  const canViewTransport = useHasPermission('transport_routes', 'read');
  const canViewCalendar = useHasPermission('calendar', 'read');
  const canViewFees = useHasPermission('fees', 'read');
  const canViewAttendance = useHasPermission('attendance', 'read');
  const canViewExams = useHasPermission('exams', 'read');
  const canViewRBAC = useHasPermission('rbac', 'read') || useHasRole('super-admin');

  // Permission-based navigation items
  const allNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ...(canViewStudents ? [{ path: '/students', icon: Users, label: 'Students' }] : []),
    ...(canViewStaff ? [{ path: '/staff', icon: Briefcase, label: 'Staff' }] : []),
    { path: '/classes', icon: GraduationCap, label: 'Classes' },
    { path: '/subjects', icon: BookMarked, label: 'Subjects' },
    ...(canViewTimetable ? [{ path: '/timetables', icon: Clock, label: 'Timetables' }] : []),
    ...(canViewTransport ? [{ path: '/transport', icon: Bus, label: 'Transport' }] : []),
    ...(canViewCalendar ? [{ path: '/calendar', icon: CalendarIcon, label: 'Calendar' }] : []),
    ...(canViewFees ? [{ path: '/fees', icon: DollarSign, label: 'Fees' }] : []),
    ...(canViewAttendance ? [{ path: '/attendance', icon: Calendar, label: 'Attendance' }] : []),
    ...(canViewExams ? [{ path: '/exams', icon: BookOpen, label: 'Exams' }] : []),
    { path: '/ai', icon: MessageSquare, label: 'AI Assistant' },
    ...(canViewRBAC ? [{ path: '/rbac', icon: Shield, label: 'Roles & Permissions' }] : []),
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const navItems = allNavItems;

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={styles.layout}>
      {/* Mobile Header */}
      <header className={styles.mobileHeader}>
        <button
          className={styles.menuButton}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
          type="button"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <h1 className={styles.mobileTitle}>Praxis ERP</h1>
        <div className={styles.mobileUser}>{user?.name?.split(' ')[0] || 'User'}</div>
      </header>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.logo}>Praxis ERP</h2>
          <button
            className={styles.closeButton}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name}</div>
            <div className={styles.userRole}>
              {(user as any)?.roles?.join(', ') || user?.role || user?.designation}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} icon={<LogOut size={16} />}>
            Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
};

export default Layout;


