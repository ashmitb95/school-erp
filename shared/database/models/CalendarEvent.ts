import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface CalendarEventAttributes {
  id: string;
  school_id: string;
  title: string;
  description?: string;
  event_type: 'org' | 'class' | 'admin' | 'teacher_global';
  start_date: Date;
  end_date?: Date;
  start_time?: string;
  end_time?: string;
  all_day: boolean;
  class_id?: string; // For class-specific events
  created_by: string; // Staff ID who created the event
  target_audience?: 'all_teachers' | 'all_staff' | 'all_students' | 'specific_class' | 'admins_only';
  reminder_days_before?: number; // Days before event to send reminder
  is_recurring: boolean;
  recurrence_pattern?: string; // 'daily', 'weekly', 'monthly', 'yearly'
  recurrence_end_date?: Date;
  color?: string; // Hex color for calendar display
  location?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface CalendarEventCreationAttributes
  extends Optional<CalendarEventAttributes, 'id' | 'created_at' | 'updated_at'> {}

class CalendarEvent
  extends Model<CalendarEventAttributes, CalendarEventCreationAttributes>
  implements CalendarEventAttributes
{
  public id!: string;
  public school_id!: string;
  public title!: string;
  public description?: string;
  public event_type!: 'org' | 'class' | 'admin' | 'teacher_global';
  public start_date!: Date;
  public end_date?: Date;
  public start_time?: string;
  public end_time?: string;
  public all_day!: boolean;
  public class_id?: string;
  public created_by!: string;
  public target_audience?: 'all_teachers' | 'all_staff' | 'all_students' | 'specific_class' | 'admins_only';
  public reminder_days_before?: number;
  public is_recurring!: boolean;
  public recurrence_pattern?: string;
  public recurrence_end_date?: Date;
  public color?: string;
  public location?: string;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    CalendarEvent.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
    CalendarEvent.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
    CalendarEvent.belongsTo(models.Staff, { foreignKey: 'created_by', as: 'creator' });
  }
}

CalendarEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    school_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'schools',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    event_type: {
      type: DataTypes.ENUM('org', 'class', 'admin', 'teacher_global'),
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    start_time: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    end_time: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    all_day: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    class_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'classes',
        key: 'id',
      },
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'staff',
        key: 'id',
      },
    },
    target_audience: {
      type: DataTypes.ENUM(
        'all_teachers',
        'all_staff',
        'all_students',
        'specific_class',
        'admins_only'
      ),
      allowNull: true,
    },
    reminder_days_before: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    recurrence_pattern: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    recurrence_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(7), // Hex color
      allowNull: true,
      defaultValue: '#6366f1',
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'calendar_events',
    indexes: [
      { fields: ['school_id', 'start_date'] },
      { fields: ['event_type'] },
      { fields: ['class_id'] },
      { fields: ['created_by'] },
      { fields: ['target_audience'] },
      { fields: ['is_active'] },
      { fields: ['start_date', 'end_date'] },
    ],
  }
);

export default CalendarEvent;







