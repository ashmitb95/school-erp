import { sequelize } from '../config';
import School from './School';
import Student from './Student';
import Staff from './Staff';
import Class from './Class';
import Subject from './Subject';
import Attendance from './Attendance';
import Fee from './Fee';
import Exam from './Exam';
import ExamResult from './ExamResult';
import Timetable from './Timetable';
import LibraryBook from './LibraryBook';
import LibraryTransaction from './LibraryTransaction';
import InventoryItem from './InventoryItem';
import TransportRoute from './TransportRoute';
import Notification from './Notification';

// Initialize all models
const models = {
  School,
  Student,
  Staff,
  Class,
  Subject,
  Attendance,
  Fee,
  Exam,
  ExamResult,
  Timetable,
  LibraryBook,
  LibraryTransaction,
  InventoryItem,
  TransportRoute,
  Notification,
};

// Define associations
Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

export { sequelize };
export default models;

