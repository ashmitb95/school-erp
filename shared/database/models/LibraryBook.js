"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class LibraryBook extends sequelize_1.Model {
    static associate(models) {
        LibraryBook.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
        LibraryBook.hasMany(models.LibraryTransaction, { foreignKey: 'book_id', as: 'transactions' });
    }
}
LibraryBook.init({
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
    author: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    isbn: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
    },
    publisher: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    category: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    total_copies: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    available_copies: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    location: {
        type: sequelize_1.DataTypes.STRING(100),
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
    tableName: 'library_books',
    indexes: [
        { fields: ['school_id'] },
        { fields: ['category'] },
        { fields: ['isbn'] },
        { fields: ['is_active'] },
    ],
});
exports.default = LibraryBook;
//# sourceMappingURL=LibraryBook.js.map