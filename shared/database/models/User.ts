import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface UserAttributes {
  id: string;
  user_type: 'parent' | 'student';
  parent_id?: string; // if user_type is student
  student_id?: string; // if user_type is parent (can link to multiple students via separate table if needed)
  phone: string;
  email?: string;
  password: string; // Bcrypt hashed password
  is_active: boolean;
  last_login?: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public user_type!: 'parent' | 'student';
  public parent_id?: string;
  public student_id?: string;
  public phone!: string;
  public email?: string;
  public password!: string;
  public is_active!: boolean;
  public last_login?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    User.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
    // Note: parent_id would link to a Parent model if we create one, or can be handled differently
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_type: {
      type: DataTypes.ENUM('parent', 'student'),
      allowNull: false,
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      // Note: This would reference a parent table if we create one
    },
    student_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'students',
        key: 'id',
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Bcrypt hashed password',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    last_login: {
      type: DataTypes.DATE,
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
    tableName: 'users',
    indexes: [
      { fields: ['phone'], unique: true },
      { fields: ['email'] },
      { fields: ['user_type'] },
      { fields: ['student_id'] },
      { fields: ['is_active'] },
    ],
  }
);

export default User;

