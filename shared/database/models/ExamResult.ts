import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface ExamResultAttributes {
  id: string;
  school_id: string;
  exam_id: string;
  student_id: string;
  subject_id: string;
  marks_obtained: number;
  max_marks: number;
  grade?: string;
  remarks?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface ExamResultCreationAttributes extends Optional<ExamResultAttributes, 'id' | 'created_at' | 'updated_at'> {}

class ExamResult extends Model<ExamResultAttributes, ExamResultCreationAttributes> implements ExamResultAttributes {
  public id!: string;
  public school_id!: string;
  public exam_id!: string;
  public student_id!: string;
  public subject_id!: string;
  public marks_obtained!: number;
  public max_marks!: number;
  public grade?: string;
  public remarks?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    ExamResult.belongsTo(models.Exam, { foreignKey: 'exam_id', as: 'exam' });
    ExamResult.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
    ExamResult.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
  }
}

ExamResult.init(
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
    exam_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'exams',
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
    subject_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id',
      },
    },
    marks_obtained: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    max_marks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    grade: {
      type: DataTypes.STRING(5),
      allowNull: true,
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
    tableName: 'exam_results',
    indexes: [
      { fields: ['exam_id', 'student_id', 'subject_id'], unique: true },
      { fields: ['student_id'] },
      { fields: ['exam_id'] },
    ],
  }
);

export default ExamResult;


