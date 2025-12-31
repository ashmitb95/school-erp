"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class Attendance extends sequelize_1.Model {
    static associate(models) {
        Attendance.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
        Attendance.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
    }
}
Attendance.init({
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
    student_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'students',
            key: 'id',
        },
    },
    class_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'classes',
            key: 'id',
        },
    },
    date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('present', 'absent', 'late', 'excused'),
        allowNull: false,
    },
    leave_type: {
        type: sequelize_1.DataTypes.ENUM('planned', 'unplanned'),
        allowNull: true, // Only applicable for absent/excused
    },
    marked_by: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'staff',
            key: 'id',
        },
    },
    remarks: {
        type: sequelize_1.DataTypes.TEXT,
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
    tableName: 'attendances',
    indexes: [
        { fields: ['student_id', 'date'], unique: true },
        { fields: ['class_id', 'date'] },
        { fields: ['school_id', 'date'] },
        { fields: ['date'] },
        { fields: ['status'] },
        { fields: ['leave_type'] },
        { fields: ['school_id', 'date', 'leave_type'] },
    ],
});
exports.default = Attendance;
