"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
class Student extends sequelize_1.Model {
    static associate(models) {
        Student.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
        Student.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
        Student.hasMany(models.Attendance, { foreignKey: 'student_id', as: 'attendances' });
        Student.hasMany(models.Fee, { foreignKey: 'student_id', as: 'fees' });
        Student.hasMany(models.ExamResult, { foreignKey: 'student_id', as: 'exam_results' });
    }
}
Student.init({
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
    admission_number: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    roll_number: {
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
    blood_group: {
        type: sequelize_1.DataTypes.STRING(5),
        allowNull: true,
    },
    aadhaar_number: {
        type: sequelize_1.DataTypes.STRING(12),
        allowNull: true,
    },
    class_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'classes',
            key: 'id',
        },
    },
    section: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: true,
    },
    academic_year: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    father_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    mother_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    father_occupation: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    mother_occupation: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    father_phone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    mother_phone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
    },
    father_email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        validate: {
            isEmail: true,
        },
    },
    mother_email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        validate: {
            isEmail: true,
        },
    },
    guardian_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    guardian_phone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
    },
    guardian_email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
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
    latitude: {
        type: sequelize_1.DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Geographic latitude for transport route mapping',
    },
    longitude: {
        type: sequelize_1.DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Geographic longitude for transport route mapping',
    },
    transport_route_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'transport_routes',
            key: 'id',
        },
    },
    hostel_room: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    medical_conditions: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    emergency_contact_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    emergency_contact_phone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    photo_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
    admission_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
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
    tableName: 'students',
    indexes: [
        { fields: ['school_id', 'admission_number'], unique: true },
        { fields: ['school_id', 'roll_number', 'academic_year'] },
        { fields: ['class_id'] },
        { fields: ['academic_year'] },
        { fields: ['is_active'] },
        { fields: ['father_phone'] },
        { fields: ['mother_phone'] },
        { fields: ['latitude', 'longitude'] }, // Index for geospatial queries
        // Full-text search index (created separately via SQL if needed)
        // { name: 'student_name_search', fields: ['first_name', 'last_name'], using: 'gin', opClass: 'gin_trgm_ops' },
    ],
});
exports.default = Student;
