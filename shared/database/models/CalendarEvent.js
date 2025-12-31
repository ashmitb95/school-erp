"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class CalendarEvent extends sequelize_1.Model {
    static associate(models) {
        CalendarEvent.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
        CalendarEvent.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
        CalendarEvent.belongsTo(models.Staff, { foreignKey: 'created_by', as: 'creator' });
    }
}
CalendarEvent.init({
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
    title: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    event_type: {
        type: sequelize_1.DataTypes.ENUM('org', 'class', 'admin', 'teacher_global'),
        allowNull: false,
    },
    start_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    end_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: true,
    },
    start_time: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: true,
    },
    end_time: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: true,
    },
    all_day: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
    class_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'classes',
            key: 'id',
        },
    },
    created_by: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'staff',
            key: 'id',
        },
    },
    target_audience: {
        type: sequelize_1.DataTypes.ENUM('all_teachers', 'all_staff', 'all_students', 'specific_class', 'admins_only'),
        allowNull: true,
    },
    reminder_days_before: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    is_recurring: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
    recurrence_pattern: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
    },
    recurrence_end_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: true,
    },
    color: {
        type: sequelize_1.DataTypes.STRING(7), // Hex color
        allowNull: true,
        defaultValue: '#6366f1',
    },
    location: {
        type: sequelize_1.DataTypes.STRING(255),
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
    tableName: 'calendar_events',
    indexes: [
        { fields: ['school_id', 'start_date'] },
        { fields: ['event_type'] },
        { fields: ['class_id'] },
        { fields: ['created_by'] },
        { fields: ['target_audience'] },
        { fields: ['is_active'] },
        { fields: ['start_date', 'end_date'] },
    ],
});
exports.default = CalendarEvent;
