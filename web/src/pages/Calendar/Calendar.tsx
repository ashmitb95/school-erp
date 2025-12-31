import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Calendar as CalendarIcon, Plus, Edit, Trash2, Clock, MapPin, Users, BookOpen, Briefcase, Settings, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import Input from '../../components/Input/Input';
import styles from './Calendar.module.css';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'org' | 'class' | 'admin' | 'teacher_global';
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  all_day: boolean;
  class_id?: string;
  class?: { id: string; name: string; code: string };
  created_by: string;
  creator?: { id: string; first_name: string; last_name: string };
  target_audience?: 'all_teachers' | 'all_staff' | 'all_students' | 'specific_class' | 'admins_only';
  color?: string;
  location?: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  org: '#6366f1',
  class: '#10b981',
  admin: '#f59e0b',
  teacher_global: '#8b5cf6',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  org: 'Organization',
  class: 'Class',
  admin: 'Admin',
  teacher_global: 'Teachers',
};

const Calendar: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const schoolId = user?.school_id;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [showEventModal, setShowEventModal] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const { data: eventsData, isLoading } = useQuery(
    ['calendar-events', schoolId, format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd'), eventTypeFilter],
    async () => {
      if (!schoolId) return { data: [] };
      const params = new URLSearchParams({
        school_id: schoolId,
        start_date: format(monthStart, 'yyyy-MM-dd'),
        end_date: format(monthEnd, 'yyyy-MM-dd'),
      });
      if (eventTypeFilter !== 'all') {
        params.append('event_type', eventTypeFilter);
      }
      const response = await api.get(`/management/calendar-events?${params}`);
      return response.data.data || [];
    }
  );

  const events: CalendarEvent[] = eventsData || [];

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const dateKey = event.start_date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>School Calendar</h1>
          <p className={styles.subtitle}>Track events, exams, and important dates</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" style={{ display: 'none' }}>Export</Button>
          <Button icon={<Plus size={18} />} onClick={() => setShowEventModal(true)}>
            Add Event
          </Button>
        </div>
      </div>

      <Card className={styles.filtersCard}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Event Type</label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className={styles.select}
            >
              <option value="all">All Events</option>
              <option value="org">Organization</option>
              <option value="class">Class Events</option>
              <option value="admin">Admin Only</option>
              <option value="teacher_global">Teacher Events</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <Button variant="outline" onClick={handlePreviousMonth}>Previous</Button>
            <Button variant="outline" onClick={handleToday}>Today</Button>
            <Button variant="outline" onClick={handleNextMonth}>Next</Button>
          </div>
        </div>
      </Card>

      <Card className={styles.calendarCard}>
        <div className={styles.calendarHeader}>
          <h2 className={styles.monthTitle}>{format(currentDate, 'MMMM yyyy')}</h2>
        </div>
        <div className={styles.calendarGrid}>
          {/* Day headers */}
          <div className={styles.dayHeaders}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className={styles.dayHeader}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className={styles.daysGrid}>
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const dayEvents = getEventsForDate(day);

              return (
                <div
                  key={index}
                  className={`${styles.dayCell} ${!isCurrentMonth ? styles.otherMonth : ''} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
                  onClick={() => {
                    setSelectedDate(day);
                    if (dayEvents.length > 0) {
                      setSelectedEvent(dayEvents[0]);
                    }
                  }}
                >
                  <div className={styles.dayNumber}>{format(day, 'd')}</div>
                  <div className={styles.dayEvents}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={styles.eventDot}
                        style={{ backgroundColor: event.color || EVENT_TYPE_COLORS[event.event_type] }}
                        title={event.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className={styles.moreEvents}>+{dayEvents.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Selected Date Events */}
      {selectedDate && (
        <Card className={styles.eventsCard}>
          <h3 className={styles.eventsTitle}>
            Events for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <div className={styles.eventsList}>
            {getEventsForDate(selectedDate).length === 0 ? (
              <div className={styles.noEvents}>No events scheduled for this date</div>
            ) : (
              getEventsForDate(selectedDate).map((event) => (
                <div
                  key={event.id}
                  className={styles.eventItem}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div
                    className={styles.eventColorBar}
                    style={{ backgroundColor: event.color || EVENT_TYPE_COLORS[event.event_type] }}
                  />
                  <div className={styles.eventContent}>
                    <div className={styles.eventHeader}>
                      <h4 className={styles.eventTitle}>{event.title}</h4>
                      <span className={styles.eventType}>
                        {EVENT_TYPE_LABELS[event.event_type]}
                      </span>
                    </div>
                    {event.description && (
                      <p className={styles.eventDescription}>{event.description}</p>
                    )}
                    <div className={styles.eventDetails}>
                      {event.all_day ? (
                        <span className={styles.eventDetail}>All Day</span>
                      ) : (
                        event.start_time && (
                          <span className={styles.eventDetail}>
                            <Clock size={14} />
                            {event.start_time} {event.end_time && `- ${event.end_time}`}
                          </span>
                        )
                      )}
                      {event.location && (
                        <span className={styles.eventDetail}>
                          <MapPin size={14} />
                          {event.location}
                        </span>
                      )}
                      {event.class && (
                        <span className={styles.eventDetail}>
                          <BookOpen size={14} />
                          {event.class.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className={styles.modalOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{selectedEvent.title}</h2>
                <p className={styles.modalSubtitle}>
                  {EVENT_TYPE_LABELS[selectedEvent.event_type]} Event
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEvent(null)}
                icon={<X size={20} />}
              >
                Close
              </Button>
            </div>
            <div className={styles.modalBody}>
              {selectedEvent.description && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Description</h3>
                  <p>{selectedEvent.description}</p>
                </div>
              )}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Date & Time</h3>
                <p>
                  {format(new Date(selectedEvent.start_date), 'EEEE, MMMM d, yyyy')}
                  {selectedEvent.end_date && ` - ${format(new Date(selectedEvent.end_date), 'EEEE, MMMM d, yyyy')}`}
                </p>
                {!selectedEvent.all_day && selectedEvent.start_time && (
                  <p>
                    <Clock size={14} />
                    {selectedEvent.start_time} {selectedEvent.end_time && `- ${selectedEvent.end_time}`}
                  </p>
                )}
              </div>
              {selectedEvent.location && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Location</h3>
                  <p>
                    <MapPin size={14} />
                    {selectedEvent.location}
                  </p>
                </div>
              )}
              {selectedEvent.class && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Class</h3>
                  <p>
                    <BookOpen size={14} />
                    {selectedEvent.class.name} ({selectedEvent.class.code})
                  </p>
                </div>
              )}
              {selectedEvent.creator && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Created By</h3>
                  <p>
                    {selectedEvent.creator.first_name} {selectedEvent.creator.last_name}
                  </p>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <Button variant="outline" icon={<Edit size={16} />}>
                Edit
              </Button>
              <Button variant="danger" icon={<Trash2 size={16} />}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;

