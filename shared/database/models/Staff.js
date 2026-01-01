"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class Staff extends sequelize_1.Model {
    static associate(models) {
        Staff.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
        Staff.hasMany(models.Class, { foreignKey: 'class_teacher_id', as: 'classes' });
    }
}
Staff.init({
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
    employee_id: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    first_name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    last_name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    middle_name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    date_of_birth: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    gender: {
        type: sequelize_1.DataTypes.ENUM('male', 'female', 'other'),
        allowNull: false,
    },
    designation: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    department: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    qualification: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    experience_years: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    phone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        validate: {
            isEmail: true,
        },
    },
    address: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    city: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    state: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    pincode: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: false,
    },
    aadhaar_number: {
        type: sequelize_1.DataTypes.STRING(12),
        allowNull: true,
    },
    pan_number: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: true,
    },
    bank_account_number: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    bank_ifsc: {
        type: sequelize_1.DataTypes.STRING(11),
        allowNull: true,
    },
    salary: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    joining_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
    photo_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
    },
    password: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: 'Bcrypt hashed password',
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
    tableName: 'staff',
    indexes: [
        { fields: ['school_id', 'employee_id'], unique: true },
        { fields: ['designation'] },
        { fields: ['is_active'] },
        { fields: ['email'], unique: true },
    ],
});
exports.default = Staff;
//# sourceMappingURL=Staff.js.map