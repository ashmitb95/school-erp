"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class TransportRoute extends sequelize_1.Model {
    static associate(models) {
        TransportRoute.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
    }
}
TransportRoute.init({
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
    route_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    route_number: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    driver_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    driver_phone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    vehicle_number: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    vehicle_type: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    capacity: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    start_location: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    end_location: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    stops: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
    },
    fare_per_month: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
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
    tableName: 'transport_routes',
    indexes: [
        { fields: ['school_id', 'route_number'], unique: true },
        { fields: ['is_active'] },
    ],
});
exports.default = TransportRoute;
