import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Search, Calendar, Clock, BookOpen, User } from 'lucide-react';
import api from '../../services/api';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import styles from './Timetables.module.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Timetables: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>(new Date().getFullYear().toString());
  const [search, setSearch] = useState('');

  // Fetch classes for dropdown
  const { data: classesData } = useQuery(
    'classes',
    async () => {
      const response = await api.get('/management/classes?limit=1000');
      return response.data.data || [];
    }
  );

  // Fetch timetables
  const { data: timetablesData, isLoading } = useQuery(
    ['timetables', selectedClass, academicYear],
    async () => {
      if (!selectedClass) return { data: [] };
      const params = new URLSearchParams({
        class_id: selectedClass,
        academic_year: academicYear,
      });
      const response = await api.get(`/management/timetables?${params}`);
      return response.data;
    },
    { enabled: !!selectedClass }
  );

  // Organize timetables by day and period
  const scheduleGrid = useMemo(() => {
    if (!timetablesData?.data) return {};

    const grid: Record<number, Record<number, any>> = {};
    
    // Initialize grid
    for (let day = 0; day < 7; day++) {
      grid[day] = {};
    }

    // Populate grid
    timetablesData.data.forEach((timetable: any) => {
      const day = timetable.day_of_week;
      const period = timetable.period_number;
      if (!grid[day]) grid[day] = {};
      grid[day][period] = timetable;
    });

    return grid;
  }, [timetablesData]);

  // Get max period number
  const maxPeriod = useMemo(() => {
    if (!timetablesData?.data) return 0;
    return Math.max(...timetablesData.data.map((t: any) => t.period_number), 0);
  }, [timetablesData]);

  const selectedClassData = useMemo(() => {
    return classesData?.find((c: any) => c.id === selectedClass);
  }, [classesData, selectedClass]);

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
            <label className={styles.filterLabel}>Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={styles.select}
            >
              <option value="">-- Select Class --</option>
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
        </div>
      </Card>

      {selectedClass && selectedClassData && (
        <Card className={styles.classInfoCard}>
          <div className={styles.classInfo}>
            <div>
              <h3 className={styles.className}>{selectedClassData.name}</h3>
              <p className={styles.classCode}>{selectedClassData.code} • {academicYear}</p>
            </div>
            {selectedClassData.class_teacher && (
              <div className={styles.teacherInfo}>
                <User size={16} />
                <span>
                  {selectedClassData.class_teacher.first_name} {selectedClassData.class_teacher.last_name}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {selectedClass && isLoading && (
        <Card className={styles.scheduleCard}>
          <div className={styles.loading}>Loading timetable...</div>
        </Card>
      )}

      {selectedClass && !isLoading && timetablesData?.data && (
        <Card className={styles.scheduleCard}>
          <h2 className={styles.scheduleTitle}>Weekly Schedule</h2>
          <div className={styles.scheduleGrid}>
            {/* Header row */}
            <div className={styles.gridHeader}>
              <div className={styles.periodHeader}>Period</div>
              {DAYS_SHORT.map((day, index) => (
                <div key={index} className={styles.dayHeader}>
                  {day}
                </div>
              ))}
            </div>

            {/* Period rows */}
            {Array.from({ length: maxPeriod }, (_, periodIndex) => {
              const period = periodIndex + 1;
              return (
                <div key={period} className={styles.gridRow}>
                  <div className={styles.periodCell}>{period}</div>
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const timetable = scheduleGrid[dayIndex]?.[period];
                    return (
                      <div key={dayIndex} className={styles.scheduleCell}>
                        {timetable ? (
                          <div className={styles.periodCard}>
                            <div className={styles.periodSubject}>
                              {timetable.subject?.name || 'N/A'}
                            </div>
                            <div className={styles.periodTeacher}>
                              {timetable.teacher?.first_name} {timetable.teacher?.last_name}
                            </div>
                            <div className={styles.periodTime}>
                              <Clock size={12} />
                              {timetable.start_time} - {timetable.end_time}
                            </div>
                            {timetable.room && (
                              <div className={styles.periodRoom}>
                                Room: {timetable.room}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={styles.emptyCell}>-</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {selectedClass && !isLoading && (!timetablesData?.data || timetablesData.data.length === 0) && (
        <Card className={styles.scheduleCard}>
          <div className={styles.emptyState}>
            <Calendar size={48} />
            <h3>No timetable found</h3>
            <p>Create a timetable for this class to get started.</p>
            <Button>Add Period</Button>
          </div>
        </Card>
      )}

      {!selectedClass && (
        <Card className={styles.scheduleCard}>
          <div className={styles.emptyState}>
            <Calendar size={48} />
            <h3>Select a class</h3>
            <p>Choose a class from the dropdown above to view its timetable.</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Timetables;

