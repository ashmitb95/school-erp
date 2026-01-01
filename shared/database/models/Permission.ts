import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface PermissionAttributes {
  id: string;
  resource: string; // students, fees, attendance, exams, staff, hr, analytics, etc.
  action: string; // create, read, update, delete, approve, export, etc.
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface PermissionCreationAttributes extends Optional<PermissionAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Permission extends Model<PermissionAttributes, PermissionCreationAttributes> implements PermissionAttributes {
  public id!: string;
  public resource!: string;
  public action!: string;
  public description?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    Permission.hasMany(models.RolePermission, { foreignKey: 'permission_id', as: 'role_permissions' });
  }
}

Permission.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    resource: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    description: {
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
    tableName: 'permissions',
    indexes: [
      { fields: ['resource', 'action'], unique: true },
      { fields: ['resource'] },
      { fields: ['action'] },
    ],
  }
);

export default Permission;

