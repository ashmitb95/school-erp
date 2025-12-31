import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface ClassAttributes {
  id: string;
  school_id: string;
  name: string;
  code: string;
  level: number; // 1-12 for standard classes
  academic_year: string;
  class_teacher_id?: string;
  capacity: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface ClassCreationAttributes extends Optional<ClassAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Class extends Model<ClassAttributes, ClassCreationAttributes> implements ClassAttributes {
  public id!: string;
  public school_id!: string;
  public name!: string;
  public code!: string;
  public level!: number;
  public academic_year!: string;
  public class_teacher_id?: string;
  public capacity!: number;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    Class.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
    Class.belongsTo(models.Staff, { foreignKey: 'class_teacher_id', as: 'class_teacher' });
    Class.hasMany(models.Student, { foreignKey: 'class_id', as: 'students' });
    Class.hasMany(models.Timetable, { foreignKey: 'class_id', as: 'timetables' });
  }
}

Class.init(
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
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    class_teacher_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'staff',
        key: 'id',
      },
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 40,
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
    tableName: 'classes',
    indexes: [
      { fields: ['school_id', 'code', 'academic_year'], unique: true },
      { fields: ['academic_year'] },
      { fields: ['is_active'] },
    ],
  }
);

export default Class;


