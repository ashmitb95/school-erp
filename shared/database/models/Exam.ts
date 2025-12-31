import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface ExamAttributes {
  id: string;
  school_id: string;
  name: string;
  exam_type: string; // unit test, mid-term, final, etc.
  academic_year: string;
  start_date: Date;
  end_date: Date;
  class_id?: string;
  subject_id?: string;
  max_marks: number;
  passing_marks: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface ExamCreationAttributes extends Optional<ExamAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Exam extends Model<ExamAttributes, ExamCreationAttributes> implements ExamAttributes {
  public id!: string;
  public school_id!: string;
  public name!: string;
  public exam_type!: string;
  public academic_year!: string;
  public start_date!: Date;
  public end_date!: Date;
  public class_id?: string;
  public subject_id?: string;
  public max_marks!: number;
  public passing_marks!: number;
  public status!: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    Exam.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
    Exam.hasMany(models.ExamResult, { foreignKey: 'exam_id', as: 'results' });
  }
}

Exam.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    exam_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    class_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'classes',
        key: 'id',
      },
    },
    subject_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subjects',
        key: 'id',
      },
    },
    max_marks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    passing_marks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'scheduled',
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
    tableName: 'exams',
    indexes: [
      { fields: ['school_id', 'academic_year'] },
      { fields: ['class_id'] },
      { fields: ['exam_type'] },
      { fields: ['start_date', 'end_date'] },
      { fields: ['status'] },
    ],
  }
);

export default Exam;


