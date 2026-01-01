"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class Fee extends sequelize_1.Model {
    static associate(models) {
        Fee.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
    }
}
Fee.init({
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
    fee_type: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    due_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    paid_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'paid', 'partial', 'waived'),
        allowNull: false,
        defaultValue: 'pending',
    },
    payment_method: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    transaction_id: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    receipt_number: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        unique: true,
    },
    academic_year: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
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
    tableName: 'fees',
    indexes: [
        { fields: ['student_id', 'fee_type', 'academic_year'] },
        { fields: ['status'] },
        { fields: ['due_date'] },
        { fields: ['school_id', 'academic_year'] },
        // Unique index for receipt_number (non-null values only)
        // Note: Partial unique index needs to be created via raw SQL if needed
        { fields: ['receipt_number'] },
    ],
});
exports.default = Fee;
//# sourceMappingURL=Fee.js.map