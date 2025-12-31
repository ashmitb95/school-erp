import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface TimetableAttributes {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  period_number: number;
  start_time: string;
  end_time: string;
  room?: string;
  academic_year: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface TimetableCreationAttributes extends Optional<TimetableAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Timetable extends Model<TimetableAttributes, TimetableCreationAttributes> implements TimetableAttributes {
  public id!: string;
  public school_id!: string;
  public class_id!: string;
  public subject_id!: string;
  public teacher_id!: string;
  public day_of_week!: number;
  public period_number!: number;
  public start_time!: string;
  public end_time!: string;
  public room?: string;
  public academic_year!: string;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    Timetable.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
    Timetable.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
    Timetable.belongsTo(models.Staff, { foreignKey: 'teacher_id', as: 'teacher' });
  }
}

Timetable.init(
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
    class_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'classes',
        key: 'id',
      },
    },
    subject_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id',
      },
    },
    teacher_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'staff',
        key: 'id',
      },
    },
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 6,
      },
    },
    period_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    end_time: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    room: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: false,
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
    tableName: 'timetables',
    indexes: [
      { fields: ['class_id', 'day_of_week', 'period_number', 'academic_year'], unique: true },
      { fields: ['teacher_id', 'day_of_week'] },
      { fields: ['academic_year'] },
    ],
  }
);

export default Timetable;


