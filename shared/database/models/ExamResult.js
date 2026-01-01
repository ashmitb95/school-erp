"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class ExamResult extends sequelize_1.Model {
    static associate(models) {
        ExamResult.belongsTo(models.Exam, { foreignKey: 'exam_id', as: 'exam' });
        ExamResult.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
        ExamResult.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
    }
}
ExamResult.init({
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
    exam_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'exams',
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
    subject_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'subjects',
            key: 'id',
        },
    },
    marks_obtained: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: false,
    },
    max_marks: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: false,
    },
    grade: {
        type: sequelize_1.DataTypes.STRING(5),
        allowNull: true,
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
    tableName: 'exam_results',
    indexes: [
        { fields: ['exam_id', 'student_id', 'subject_id'], unique: true },
        { fields: ['student_id'] },
        { fields: ['exam_id'] },
    ],
});
exports.default = ExamResult;
//# sourceMappingURL=ExamResult.js.map