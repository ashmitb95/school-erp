"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class School extends sequelize_1.Model {
    static associate(models) {
        School.hasMany(models.Student, { foreignKey: 'school_id', as: 'students' });
        School.hasMany(models.Staff, { foreignKey: 'school_id', as: 'staff' });
        School.hasMany(models.Class, { foreignKey: 'school_id', as: 'classes' });
    }
}
School.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    code: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    address: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    city: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    state: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    pincode: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: false,
    },
    phone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        validate: {
            isEmail: true,
        },
    },
    principal_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    principal_email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        validate: {
            isEmail: true,
        },
    },
    board: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    established_year: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
    settings: {
        type: sequelize_1.DataTypes.JSONB,
        defaultValue: {},
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
    tableName: 'schools',
    indexes: [
        { fields: ['code'], unique: true },
        { fields: ['city', 'state'] },
        { fields: ['is_active'] },
        { fields: ['board'] },
    ],
});
exports.default = School;
//# sourceMappingURL=School.js.map