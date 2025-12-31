import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface LibraryBookAttributes {
  id: string;
  school_id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  category: string;
  total_copies: number;
  available_copies: number;
  location?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface LibraryBookCreationAttributes extends Optional<LibraryBookAttributes, 'id' | 'created_at' | 'updated_at'> {}

class LibraryBook extends Model<LibraryBookAttributes, LibraryBookCreationAttributes> implements LibraryBookAttributes {
  public id!: string;
  public school_id!: string;
  public title!: string;
  public author!: string;
  public isbn?: string;
  public publisher?: string;
  public category!: string;
  public total_copies!: number;
  public available_copies!: number;
  public location?: string;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    LibraryBook.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
    LibraryBook.hasMany(models.LibraryTransaction, { foreignKey: 'book_id', as: 'transactions' });
  }
}

LibraryBook.init(
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isbn: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    publisher: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    total_copies: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    available_copies: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    location: {
      type: DataTypes.STRING(100),
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
    tableName: 'library_books',
    indexes: [
      { fields: ['school_id'] },
      { fields: ['category'] },
      { fields: ['isbn'] },
      { fields: ['is_active'] },
    ],
  }
);

export default LibraryBook;


