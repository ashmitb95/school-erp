import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface AttendanceAttributes {
  id: string;
  school_id: string;
  student_id: string;
  class_id: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  leave_type?: 'planned' | 'unplanned' | null; // For absent/excused: planned (prior notice) or unplanned
  marked_by: string; // staff_id
  remarks?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface AttendanceCreationAttributes extends Optional<AttendanceAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Attendance extends Model<AttendanceAttributes, AttendanceCreationAttributes> implements AttendanceAttributes {
  public id!: string;
  public school_id!: string;
  public student_id!: string;
  public class_id!: string;
  public date!: Date;
  public status!: 'present' | 'absent' | 'late' | 'excused';
  public leave_type?: 'planned' | 'unplanned' | null;
  public marked_by!: string;
  public remarks?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    Attendance.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
    Attendance.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
  }
}

Attendance.init(
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
    student_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'students',
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('present', 'absent', 'late', 'excused'),
      allowNull: false,
    },
    leave_type: {
      type: DataTypes.ENUM('planned', 'unplanned'),
      allowNull: true, // Only applicable for absent/excused
    },
    marked_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'staff',
        key: 'id',
      },
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'attendances',
    indexes: [
      { fields: ['student_id', 'date'], unique: true },
      { fields: ['class_id', 'date'] },
      { fields: ['school_id', 'date'] },
      { fields: ['date'] },
      { fields: ['status'] },
      { fields: ['leave_type'] },
      { fields: ['school_id', 'date', 'leave_type'] },
    ],
  }
);

export default Attendance;


