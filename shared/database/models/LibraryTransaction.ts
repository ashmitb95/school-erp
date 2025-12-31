import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface LibraryTransactionAttributes {
  id: string;
  school_id: string;
  book_id: string;
  student_id?: string;
  staff_id?: string;
  transaction_type: 'issue' | 'return' | 'renew';
  issue_date: Date;
  due_date: Date;
  return_date?: Date;
  fine_amount?: number;
  status: 'active' | 'returned' | 'overdue';
  remarks?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface LibraryTransactionCreationAttributes extends Optional<LibraryTransactionAttributes, 'id' | 'created_at' | 'updated_at'> {}

class LibraryTransaction extends Model<LibraryTransactionAttributes, LibraryTransactionCreationAttributes> implements LibraryTransactionAttributes {
  public id!: string;
  public school_id!: string;
  public book_id!: string;
  public student_id?: string;
  public staff_id?: string;
  public transaction_type!: 'issue' | 'return' | 'renew';
  public issue_date!: Date;
  public due_date!: Date;
  public return_date?: Date;
  public fine_amount?: number;
  public status!: 'active' | 'returned' | 'overdue';
  public remarks?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    LibraryTransaction.belongsTo(models.LibraryBook, { foreignKey: 'book_id', as: 'book' });
    LibraryTransaction.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
    LibraryTransaction.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
  }
}

LibraryTransaction.init(
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
    book_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'library_books',
        key: 'id',
      },
    },
    student_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'students',
        key: 'id',
      },
    },
    staff_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'staff',
        key: 'id',
      },
    },
    transaction_type: {
      type: DataTypes.ENUM('issue', 'return', 'renew'),
      allowNull: false,
    },
    issue_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    return_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fine_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('active', 'returned', 'overdue'),
      allowNull: false,
      defaultValue: 'active',
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
    tableName: 'library_transactions',
    indexes: [
      { fields: ['book_id', 'status'] },
      { fields: ['student_id'] },
      { fields: ['due_date', 'status'] },
      { fields: ['school_id'] },
    ],
  }
);

export default LibraryTransaction;


