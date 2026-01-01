"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class Exam extends sequelize_1.Model {
    static associate(models) {
        Exam.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
        Exam.hasMany(models.ExamResult, { foreignKey: 'exam_id', as: 'results' });
    }
}
Exam.init({
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
    exam_type: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    academic_year: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    start_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    end_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    class_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'classes',
            key: 'id',
        },
    },
    subject_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'subjects',
            key: 'id',
        },
    },
    max_marks: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: false,
    },
    passing_marks: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled',
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
    tableName: 'exams',
    indexes: [
        { fields: ['school_id', 'academic_year'] },
        { fields: ['class_id'] },
        { fields: ['exam_type'] },
        { fields: ['start_date', 'end_date'] },
        { fields: ['status'] },
    ],
});
exports.default = Exam;
//# sourceMappingURL=Exam.js.map