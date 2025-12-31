import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config';

interface FeeAttributes {
  id: string;
  school_id: string;
  student_id: string;
  fee_type: string; // tuition, library, transport, hostel, etc.
  amount: number;
  due_date: Date;
  paid_date?: Date;
  status: 'pending' | 'paid' | 'partial' | 'waived';
  payment_method?: string;
  transaction_id?: string;
  receipt_number?: string;
  academic_year: string;
  remarks?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface FeeCreationAttributes extends Optional<FeeAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Fee extends Model<FeeAttributes, FeeCreationAttributes> implements FeeAttributes {
  public id!: string;
  public school_id!: string;
  public student_id!: string;
  public fee_type!: string;
  public amount!: number;
  public due_date!: Date;
  public paid_date?: Date;
  public status!: 'pending' | 'paid' | 'partial' | 'waived';
  public payment_method?: string;
  public transaction_id?: string;
  public receipt_number?: string;
  public academic_year!: string;
  public remarks?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    Fee.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  }
}

Fee.init(
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
    fee_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    paid_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'partial', 'waived'),
      allowNull: false,
      defaultValue: 'pending',
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    transaction_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    receipt_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: false,
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
    tableName: 'fees',
    indexes: [
      { fields: ['student_id', 'fee_type', 'academic_year'] },
      { fields: ['status'] },
      { fields: ['due_date'] },
      { fields: ['school_id', 'academic_year'] },
      // Unique index for receipt_number (non-null values only)
      // Note: Partial unique index needs to be created via raw SQL if needed
      { fields: ['receipt_number'] },
    ],
  }
);

export default Fee;

