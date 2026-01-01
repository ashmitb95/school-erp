import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface RoleAttributes {
  id: string;
  name: string; // super-admin, principal, teacher, hr-manager, accountant, transport-manager, librarian, parent, student
  description?: string;
  is_system_role: boolean; // true for system-wide roles like super-admin
  school_id?: string; // nullable for system roles
  created_at?: Date;
  updated_at?: Date;
}

interface RoleCreationAttributes extends Optional<RoleAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public is_system_role!: boolean;
  public school_id?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    Role.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
    Role.hasMany(models.StaffRole, { foreignKey: 'role_id', as: 'staff_roles' });
    Role.hasMany(models.RolePermission, { foreignKey: 'role_id', as: 'role_permissions' });
  }
}

Role.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_system_role: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    school_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'schools',
        key: 'id',
      },
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
    tableName: 'roles',
    indexes: [
      { fields: ['name', 'school_id'], unique: true },
      { fields: ['is_system_role'] },
      { fields: ['school_id'] },
    ],
  }
);

export default Role;

