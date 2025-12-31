"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class Timetable extends sequelize_1.Model {
    static associate(models) {
        Timetable.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
        Timetable.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
        Timetable.belongsTo(models.Staff, { foreignKey: 'teacher_id', as: 'teacher' });
    }
}
Timetable.init({
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
    class_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'classes',
            key: 'id',
        },
    },
    subject_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'subjects',
            key: 'id',
        },
    },
    teacher_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'staff',
            key: 'id',
        },
    },
    day_of_week: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
            max: 6,
        },
    },
    period_number: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    start_time: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: false,
    },
    end_time: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: false,
    },
    room: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    academic_year: {
        type: sequelize_1.DataTypes.STRING(20),
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
    tableName: 'timetables',
    indexes: [
        { fields: ['class_id', 'day_of_week', 'period_number', 'academic_year'], unique: true },
        { fields: ['teacher_id', 'day_of_week'] },
        { fields: ['academic_year'] },
    ],
});
exports.default = Timetable;
