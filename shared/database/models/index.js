"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const config_1 = require("../config");
Object.defineProperty(exports, "sequelize", { enumerable: true, get: function () { return config_1.sequelize; } });
const School_1 = __importDefault(require("./School"));
const Student_1 = __importDefault(require("./Student"));
const Staff_1 = __importDefault(require("./Staff"));
const Class_1 = __importDefault(require("./Class"));
const Subject_1 = __importDefault(require("./Subject"));
const Attendance_1 = __importDefault(require("./Attendance"));
const Fee_1 = __importDefault(require("./Fee"));
const Exam_1 = __importDefault(require("./Exam"));
const ExamResult_1 = __importDefault(require("./ExamResult"));
const Timetable_1 = __importDefault(require("./Timetable"));
const LibraryBook_1 = __importDefault(require("./LibraryBook"));
const LibraryTransaction_1 = __importDefault(require("./LibraryTransaction"));
const InventoryItem_1 = __importDefault(require("./InventoryItem"));
const TransportRoute_1 = __importDefault(require("./TransportRoute"));
const Notification_1 = __importDefault(require("./Notification"));
const CalendarEvent_1 = __importDefault(require("./CalendarEvent"));
// Initialize all models
const models = {
    School: School_1.default,
    Student: Student_1.default,
    Staff: Staff_1.default,
    Class: Class_1.default,
    Subject: Subject_1.default,
    Attendance: Attendance_1.default,
    Fee: Fee_1.default,
    Exam: Exam_1.default,
    ExamResult: ExamResult_1.default,
    Timetable: Timetable_1.default,
    LibraryBook: LibraryBook_1.default,
    LibraryTransaction: LibraryTransaction_1.default,
    InventoryItem: InventoryItem_1.default,
    TransportRoute: TransportRoute_1.default,
    Notification: Notification_1.default,
    CalendarEvent: CalendarEvent_1.default,
};
// Define associations
Object.values(models).forEach((model) => {
    if (model.associate) {
        model.associate(models);
    }
});
exports.default = models;
//# sourceMappingURL=index.js.map