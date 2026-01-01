import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface StaffAttributes {
  id: string;
  school_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth: Date;
  gender: 'male' | 'female' | 'other';
  designation: string; // Teacher, Principal, Admin, etc.
  department?: string;
  qualification: string;
  experience_years: number;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadhaar_number?: string;
  pan_number?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  salary?: number;
  joining_date: Date;
  is_active: boolean;
  photo_url?: string;
  password?: string; // Bcrypt hashed password
  created_at?: Date;
  updated_at?: Date;
}

interface StaffCreationAttributes extends Optional<StaffAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Staff extends Model<StaffAttributes, StaffCreationAttributes> implements StaffAttributes {
  public id!: string;
  public school_id!: string;
  public employee_id!: string;
  public first_name!: string;
  public last_name!: string;
  public middle_name?: string;
  public date_of_birth!: Date;
  public gender!: 'male' | 'female' | 'other';
  public designation!: string;
  public department?: string;
  public qualification!: string;
  public experience_years!: number;
  public phone!: string;
  public email!: string;
  public address!: string;
  public city!: string;
  public state!: string;
  public pincode!: string;
  public aadhaar_number?: string;
  public pan_number?: string;
  public bank_account_number?: string;
  public bank_ifsc?: string;
  public salary?: number;
  public   joining_date!: Date;
  public is_active!: boolean;
  public photo_url?: string;
  public password?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    Staff.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
    Staff.hasMany(models.Class, { foreignKey: 'class_teacher_id', as: 'classes' });
    Staff.hasMany(models.StaffRole, { foreignKey: 'staff_id', as: 'staff_roles' });
  }
}

Staff.init(
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
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    middle_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: false,
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    qualification: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    experience_years: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    aadhaar_number: {
      type: DataTypes.STRING(12),
      allowNull: true,
    },
    pan_number: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    bank_account_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    bank_ifsc: {
      type: DataTypes.STRING(11),
      allowNull: true,
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    joining_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Bcrypt hashed password',
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
    tableName: 'staff',
    indexes: [
      { fields: ['school_id', 'employee_id'], unique: true },
      { fields: ['designation'] },
      { fields: ['is_active'] },
      { fields: ['email'], unique: true },
    ],
  }
);

export default Staff;

