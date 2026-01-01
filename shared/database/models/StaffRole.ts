import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface StaffRoleAttributes {
  id: string;
  staff_id: string;
  role_id: string;
  assigned_by: string; // staff_id of who assigned this role
  assigned_at: Date;
  created_at?: Date;
}

interface StaffRoleCreationAttributes extends Optional<StaffRoleAttributes, 'id' | 'created_at'> {}

class StaffRole extends Model<StaffRoleAttributes, StaffRoleCreationAttributes> implements StaffRoleAttributes {
  public id!: string;
  public staff_id!: string;
  public role_id!: string;
  public assigned_by!: string;
  public assigned_at!: Date;
  public readonly created_at!: Date;

  static associate(models: any) {
    StaffRole.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
    StaffRole.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
    // Note: assigned_by also references Staff, but we use a different alias
    StaffRole.belongsTo(models.Staff, { foreignKey: 'assigned_by', as: 'assigner' });
  }
}

StaffRole.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    staff_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'staff',
        key: 'id',
      },
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
    },
    assigned_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'staff',
        key: 'id',
      },
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'staff_roles',
    indexes: [
      { fields: ['staff_id', 'role_id'], unique: true },
      { fields: ['staff_id'] },
      { fields: ['role_id'] },
      { fields: ['assigned_by'] },
    ],
  }
);

export default StaffRole;

