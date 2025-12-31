import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface StudentAttributes {
  id: string;
  school_id: string;
  admission_number: string;
  roll_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth: Date;
  gender: 'male' | 'female' | 'other';
  blood_group?: string;
  aadhaar_number?: string;
  class_id: string;
  section?: string;
  academic_year: string;
  father_name: string;
  mother_name: string;
  father_occupation?: string;
  mother_occupation?: string;
  father_phone: string;
  mother_phone?: string;
  father_email?: string;
  mother_email?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  transport_route_id?: string;
  hostel_room?: string;
  medical_conditions?: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  photo_url?: string;
  is_active: boolean;
  admission_date: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface StudentCreationAttributes extends Optional<StudentAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Student extends Model<StudentAttributes, StudentCreationAttributes> implements StudentAttributes {
  public id!: string;
  public school_id!: string;
  public admission_number!: string;
  public roll_number!: string;
  public first_name!: string;
  public last_name!: string;
  public middle_name?: string;
  public date_of_birth!: Date;
  public gender!: 'male' | 'female' | 'other';
  public blood_group?: string;
  public aadhaar_number?: string;
  public class_id!: string;
  public section?: string;
  public academic_year!: string;
  public father_name!: string;
  public mother_name!: string;
  public father_occupation?: string;
  public mother_occupation?: string;
  public father_phone!: string;
  public mother_phone?: string;
  public father_email?: string;
  public mother_email?: string;
  public guardian_name?: string;
  public guardian_phone?: string;
  public guardian_email?: string;
  public address!: string;
  public city!: string;
  public state!: string;
  public pincode!: string;
  public latitude?: number;
  public longitude?: number;
  public transport_route_id?: string;
  public hostel_room?: string;
  public medical_conditions?: string;
  public emergency_contact_name!: string;
  public emergency_contact_phone!: string;
  public photo_url?: string;
  public is_active!: boolean;
  public admission_date!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    Student.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
    Student.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
    Student.hasMany(models.Attendance, { foreignKey: 'student_id', as: 'attendances' });
    Student.hasMany(models.Fee, { foreignKey: 'student_id', as: 'fees' });
    Student.hasMany(models.ExamResult, { foreignKey: 'student_id', as: 'exam_results' });
  }
}

Student.init(
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
    admission_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    roll_number: {
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
    blood_group: {
      type: DataTypes.STRING(5),
      allowNull: true,
    },
    aadhaar_number: {
      type: DataTypes.STRING(12),
      allowNull: true,
    },
    class_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'classes',
        key: 'id',
      },
    },
    section: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    father_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mother_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    father_occupation: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    mother_occupation: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    father_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    mother_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    father_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    mother_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    guardian_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    guardian_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    guardian_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      comment: 'Geographic latitude for transport route mapping',
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Geographic longitude for transport route mapping',
    },
    transport_route_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'transport_routes',
        key: 'id',
      },
    },
    hostel_room: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    medical_conditions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    emergency_contact_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    emergency_contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    admission_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
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
    tableName: 'students',
    indexes: [
      { fields: ['school_id', 'admission_number'], unique: true },
      { fields: ['school_id', 'roll_number', 'academic_year'] },
      { fields: ['class_id'] },
      { fields: ['academic_year'] },
      { fields: ['is_active'] },
      { fields: ['father_phone'] },
      { fields: ['mother_phone'] },
      { fields: ['latitude', 'longitude'] }, // Index for geospatial queries
      // Full-text search index (created separately via SQL if needed)
      // { name: 'student_name_search', fields: ['first_name', 'last_name'], using: 'gin', opClass: 'gin_trgm_ops' },
    ],
  }
);

export default Student;

