"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class Notification extends sequelize_1.Model {
    static associate(models) {
        Notification.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
    }
}
Notification.init({
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
    recipient_type: {
        type: sequelize_1.DataTypes.ENUM('student', 'staff', 'parent', 'all'),
        allowNull: false,
    },
    recipient_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
    },
    title: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    notification_type: {
        type: sequelize_1.DataTypes.ENUM('info', 'alert', 'reminder', 'announcement'),
        allowNull: false,
    },
    priority: {
        type: sequelize_1.DataTypes.ENUM('low', 'medium', 'high'),
        allowNull: false,
        defaultValue: 'medium',
    },
    is_read: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
    read_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
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
    tableName: 'notifications',
    indexes: [
        { fields: ['school_id', 'recipient_type', 'recipient_id'] },
        { fields: ['is_read'] },
        { fields: ['created_at'] },
        { fields: ['priority'] },
    ],
});
exports.default = Notification;
//# sourceMappingURL=Notification.js.map