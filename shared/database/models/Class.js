"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class Class extends sequelize_1.Model {
    static associate(models) {
        Class.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
        Class.belongsTo(models.Staff, { foreignKey: 'class_teacher_id', as: 'class_teacher' });
        Class.hasMany(models.Student, { foreignKey: 'class_id', as: 'students' });
        Class.hasMany(models.Timetable, { foreignKey: 'class_id', as: 'timetables' });
    }
}
Class.init({
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
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    code: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    section: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'A',
    },
    level: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    academic_year: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    class_teacher_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'staff',
            key: 'id',
        },
    },
    capacity: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 40,
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
    tableName: 'classes',
    indexes: [
        { fields: ['school_id', 'code', 'section', 'academic_year'], unique: true },
        { fields: ['academic_year'] },
        { fields: ['is_active'] },
        { fields: ['section'] },
    ],
});
exports.default = Class;
