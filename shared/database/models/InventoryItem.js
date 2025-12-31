"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class InventoryItem extends sequelize_1.Model {
    static associate(models) {
        InventoryItem.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
    }
}
InventoryItem.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    school_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'schools',
            key: 'id',
        },
    },
    name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    category: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    quantity: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    },
    unit: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    min_stock_level: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    },
    location: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    supplier: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    cost_per_unit: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: config_1.sequelize,
    tableName: 'inventory_items',
    indexes: [
        { fields: ['school_id', 'category'] },
        { fields: ['quantity'] },
        { fields: ['is_active'] },
    ],
});
exports.default = InventoryItem;
