import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface SubjectAttributes {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface SubjectCreationAttributes extends Optional<SubjectAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Subject extends Model<SubjectAttributes, SubjectCreationAttributes> implements SubjectAttributes {
  public id!: string;
  public school_id!: string;
  public name!: string;
  public code!: string;
  public description?: string;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    Subject.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
  }
}

Subject.init(
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
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
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
    tableName: 'subjects',
    indexes: [
      { fields: ['school_id', 'code'], unique: true },
      { fields: ['is_active'] },
    ],
  }
);

export default Subject;


