import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Search, Calendar, Clock, BookOpen, User, X, Eye } from 'lucide-react';
import api from '../../services/api';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import styles from './Timetables.module.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Timetables: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2024-2025');
  const [search, setSearch] = useState('');
  const [viewingClassId, setViewingClassId] = useState<string | null>(null);

  // Fetch classes for dropdown
  const { data: classesData } = useQuery(
    'classes',
    async () => {
      const response = await api.get('/management/classes?limit=1000');
      return response.data.data || [];
    }
  );

  // Fetch timetables - now fetches all by default, ordered by class descending
  const { data: timetablesData, isLoading } = useQuery(
    ['timetables', selectedClass, academicYear],
    async () => {
      const params = new URLSearchParams({
        academic_year: academicYear,
      });
      if (selectedClass) {
        params.append('class_id', selectedClass);
      }
      const response = await api.get(`/management/timetables?${params}`);
      return response.data;
    }
  );

  // Group timetables by class
  const timetablesByClass = useMemo(() => {
    if (!timetablesData?.data) return {};

    const grouped: Record<string, any[]> = {};
    
    timetablesData.data.forEach((timetable: any) => {
      const classId = timetable.class_id;
      if (!grouped[classId]) {
        grouped[classId] = [];
      }
      grouped[classId].push(timetable);
    });

    return grouped;
  }, [timetablesData]);

  // Get classes with timetables, ordered by level descending
  const classesWithTimetables = useMemo(() => {
    if (!classesData || !timetablesByClass) return [];
    
    return classesData
      .filter((cls: any) => timetablesByClass[cls.id])
      .sort((a: any, b: any) => {
        // Sort by level descending, then name descending
        if (b.level !== a.level) return (b.level || 0) - (a.level || 0);
        return (b.name || '').localeCompare(a.name || '');
      });
  }, [classesData, timetablesByClass]);

  // Organize timetables by day (rows) and period (columns) for a specific class
  const getScheduleGrid = useMemo(() => {
    return (classId: string) => {
      if (!timetablesByClass[classId]) return {};

      const grid: Record<number, Record<number, any>> = {};
      
      // Initialize grid
      for (let day = 0; day < 7; day++) {
        grid[day] = {};
      }

      // Populate grid
      timetablesByClass[classId].forEach((timetable: any) => {
        const day = timetable.day_of_week;
        const period = timetable.period_number;
        if (!grid[day]) grid[day] = {};
        grid[day][period] = timetable;
      });

      return grid;
    };
  }, [timetablesByClass]);

  // Get max period number for a specific class
  const getMaxPeriod = (classId: string) => {
    if (!timetablesByClass[classId]) return 0;
    return Math.max(...timetablesByClass[classId].map((t: any) => t.period_number), 0);
  };

  const viewingClassData = useMemo(() => {
    return classesData?.find((c: any) => c.id === viewingClassId);
  }, [classesData, viewingClassId]);

  const viewingScheduleGrid = useMemo(() => {
    if (!viewingClassId) return {};
    return getScheduleGrid(viewingClassId);
  }, [viewingClassId, getScheduleGrid]);

  const viewingMaxPeriod = useMemo(() => {
    if (!viewingClassId) return 0;
    return getMaxPeriod(viewingClassId);
  }, [viewingClassId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Timetables</h1>
          <p className={styles.subtitle}>View and manage class schedules</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary">Export PDF</Button>
          <Button icon={<Calendar size={18} />}>Add Period</Button>
        </div>
      </div>

      <Card className={styles.filtersCard}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Filter by Class (Optional)</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={styles.select}
            >
              <option value="">All Classes</option>
              {classesData?.map((cls: any) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.code})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Academic Year</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className={styles.input}
              placeholder="e.g., 2024-2025"
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Search</label>
            <Input
              icon={<Search size={18} />}
              placeholder="Search classes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
      </Card>

      {isLoading && (
        <Card className={styles.scheduleCard}>
          <div className={styles.loading}>Loading timetables...</div>
        </Card>
      )}

      {!isLoading && classesWithTimetables.length > 0 && (
        <Card className={styles.listCard}>
          <h2 className={styles.listTitle}>All Timetables</h2>
          <div className={styles.timetableList}>
            {classesWithTimetables
              .filter((cls: any) => {
                if (selectedClass) return cls.id === selectedClass;
                if (search) {
                  const searchLower = search.toLowerCase();
                  return (
                    cls.name.toLowerCase().includes(searchLower) ||
                    cls.code.toLowerCase().includes(searchLower)
                  );
                }
                return true;
              })
              .map((classData: any) => (
                <div
                  key={classData.id}
                  className={styles.timetableListItem}
                  onClick={() => setViewingClassId(classData.id)}
                >
                  <div className={styles.listItemContent}>
                    <div>
                      <h3 className={styles.listItemName}>{classData.name}</h3>
                      <p className={styles.listItemDetails}>
                        {classData.code} • Level {classData.level} • {academicYear}
                      </p>
                    </div>
                    {classData.class_teacher && (
                      <div className={styles.listItemTeacher}>
                        <User size={16} />
                        <span>
                          {classData.class_teacher.first_name} {classData.class_teacher.last_name}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" icon={<Eye size={16} />}>
                    View
                  </Button>
                </div>
              ))}
          </div>
        </Card>
      )}

      {!isLoading && (!timetablesData?.data || timetablesData.data.length === 0) && (
        <Card className={styles.scheduleCard}>
          <div className={styles.emptyState}>
            <Calendar size={48} />
            <h3>No timetables found</h3>
            <p>Create timetables for classes to get started.</p>
            <Button>Add Period</Button>
          </div>
        </Card>
      )}

      {/* Timetable Modal/Popup */}
      {viewingClassId && viewingClassData && (
        <div className={styles.modalOverlay} onClick={() => setViewingClassId(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{viewingClassData.name}</h2>
                <p className={styles.modalSubtitle}>
                  {viewingClassData.code} • Level {viewingClassData.level} • {academicYear}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingClassId(null)}
                icon={<X size={20} />}
              >
                Close
              </Button>
            </div>

            {viewingClassData.class_teacher && (
              <div className={styles.modalTeacherInfo}>
                <User size={16} />
                <span>
                  Class Teacher: {viewingClassData.class_teacher.first_name}{' '}
                  {viewingClassData.class_teacher.last_name}
                </span>
              </div>
            )}

            <div className={styles.modalScheduleGrid}>
              {/* Header row - Days as rows, Periods as columns */}
              <div className={styles.modalGridHeader}>
                <div className={styles.modalDayHeader}>Day</div>
                {Array.from({ length: Math.max(viewingMaxPeriod, 8) }, (_, periodIndex) => (
                  <div key={periodIndex + 1} className={styles.modalPeriodHeader}>
                    P{periodIndex + 1}
                  </div>
                ))}
              </div>

              {/* Day rows */}
              {DAYS.map((day, dayIndex) => (
                <div key={dayIndex} className={styles.modalGridRow}>
                  <div className={styles.modalDayCell}>{day.substring(0, 3)}</div>
                  {Array.from({ length: Math.max(viewingMaxPeriod, 8) }, (_, periodIndex) => {
                    const period = periodIndex + 1;
                    const timetable = viewingScheduleGrid[dayIndex]?.[period];
                    return (
                      <div key={period} className={styles.modalScheduleCell}>
                        {timetable ? (
                          <div className={styles.modalPeriodCard}>
                            <div className={styles.modalPeriodSubject}>
                              {timetable.subject?.name || 'N/A'}
                            </div>
                            <div className={styles.modalPeriodTeacher}>
                              {timetable.teacher?.first_name} {timetable.teacher?.last_name}
                            </div>
                            <div className={styles.modalPeriodTime}>
                              <Clock size={12} />
                              {timetable.start_time} - {timetable.end_time}
                            </div>
                            {timetable.room && (
                              <div className={styles.modalPeriodRoom}>Room: {timetable.room}</div>
                            )}
                          </div>
                        ) : (
                          <div className={styles.modalEmptyCell}>-</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetables;

