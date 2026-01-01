"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class LibraryTransaction extends sequelize_1.Model {
    static associate(models) {
        LibraryTransaction.belongsTo(models.LibraryBook, { foreignKey: 'book_id', as: 'book' });
        LibraryTransaction.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
        LibraryTransaction.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
    }
}
LibraryTransaction.init({
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
    book_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'library_books',
            key: 'id',
        },
    },
    student_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'students',
            key: 'id',
        },
    },
    staff_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'staff',
            key: 'id',
        },
    },
    transaction_type: {
        type: sequelize_1.DataTypes.ENUM('issue', 'return', 'renew'),
        allowNull: false,
    },
    issue_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    due_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    return_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: true,
    },
    fine_amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('active', 'returned', 'overdue'),
        allowNull: false,
        defaultValue: 'active',
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
    tableName: 'library_transactions',
    indexes: [
        { fields: ['book_id', 'status'] },
        { fields: ['student_id'] },
        { fields: ['due_date', 'status'] },
        { fields: ['school_id'] },
    ],
});
exports.default = LibraryTransaction;
//# sourceMappingURL=LibraryTransaction.js.map