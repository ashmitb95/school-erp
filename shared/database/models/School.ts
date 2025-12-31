import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface SchoolAttributes {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  principal_name: string;
  principal_email: string;
  board: string; // CBSE, ICSE, IB, State Board
  established_year: number;
  is_active: boolean;
  settings: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

interface SchoolCreationAttributes extends Optional<SchoolAttributes, 'id' | 'created_at' | 'updated_at'> {}

class School extends Model<SchoolAttributes, SchoolCreationAttributes> implements SchoolAttributes {
  public id!: string;
  public name!: string;
  public code!: string;
  public address!: string;
  public city!: string;
  public state!: string;
  public pincode!: string;
  public phone!: string;
  public email!: string;
  public principal_name!: string;
  public principal_email!: string;
  public board!: string;
  public established_year!: number;
  public is_active!: boolean;
  public settings!: Record<string, any>;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    School.hasMany(models.Student, { foreignKey: 'school_id', as: 'students' });
    School.hasMany(models.Staff, { foreignKey: 'school_id', as: 'staff' });
    School.hasMany(models.Class, { foreignKey: 'school_id', as: 'classes' });
  }
}

School.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    pincode: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    principal_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    principal_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    board: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    established_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
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
    tableName: 'schools',
    indexes: [
      { fields: ['code'], unique: true },
      { fields: ['city', 'state'] },
      { fields: ['is_active'] },
      { fields: ['board'] },
    ],
  }
);

export default School;


