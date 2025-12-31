import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface InventoryItemAttributes {
  id: string;
  school_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock_level: number;
  location?: string;
  supplier?: string;
  cost_per_unit?: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface InventoryItemCreationAttributes extends Optional<InventoryItemAttributes, 'id' | 'created_at' | 'updated_at'> {}

class InventoryItem extends Model<InventoryItemAttributes, InventoryItemCreationAttributes> implements InventoryItemAttributes {
  public id!: string;
  public school_id!: string;
  public name!: string;
  public category!: string;
  public quantity!: number;
  public unit!: string;
  public min_stock_level!: number;
  public location?: string;
  public supplier?: string;
  public cost_per_unit?: number;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    InventoryItem.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
  }
}

InventoryItem.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    min_stock_level: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    supplier: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    cost_per_unit: {
      type: DataTypes.DECIMAL(10, 2),
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
    tableName: 'inventory_items',
    indexes: [
      { fields: ['school_id', 'category'] },
      { fields: ['quantity'] },
      { fields: ['is_active'] },
    ],
  }
);

export default InventoryItem;


