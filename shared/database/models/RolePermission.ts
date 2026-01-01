import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface RolePermissionAttributes {
  id: string;
  role_id: string;
  permission_id: string;
  created_at?: Date;
}

interface RolePermissionCreationAttributes extends Optional<RolePermissionAttributes, 'id' | 'created_at'> {}

class RolePermission extends Model<RolePermissionAttributes, RolePermissionCreationAttributes> implements RolePermissionAttributes {
  public id!: string;
  public role_id!: string;
  public permission_id!: string;
  public readonly created_at!: Date;

  static associate(models: any) {
    RolePermission.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
    RolePermission.belongsTo(models.Permission, { foreignKey: 'permission_id', as: 'permission' });
  }
}

RolePermission.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
    },
    permission_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'permissions',
        key: 'id',
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'role_permissions',
    indexes: [
      { fields: ['role_id', 'permission_id'], unique: true },
      { fields: ['role_id'] },
      { fields: ['permission_id'] },
    ],
  }
);

export default RolePermission;

