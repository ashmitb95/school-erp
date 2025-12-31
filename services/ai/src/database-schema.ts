/**
 * Database Schema Documentation for AI SQL Generation
 * This provides semantic understanding of the database structure
 */

export const DATABASE_SCHEMA = {
  description: "School ERP Database Schema - CRITICAL: All table names are PLURAL. Use 'attendances' (NOT 'attendance'), 'students', 'classes', 'fees', 'exams', 'exam_results', 'staff', 'subjects', 'schools'",
  tables: {
    schools: {
      description: "School information and details (table name: 'schools')",
      columns: {
        id: "UUID primary key",
        name: "School name",
        code: "Unique school code",
        address: "School address",
        city: "City where school is located",
        state: "State where school is located",
        pincode: "Postal code",
        phone: "School contact phone",
        email: "School email",
        principal_name: "Principal's name",
        principal_email: "Principal's email",
        board: "Education board (CBSE, ICSE, State Board, etc.)",
        established_year: "Year school was established",
        is_active: "Whether school is currently active"
      },
      relationships: ["has many classes", "has many students", "has many staff"]
    },
    students: {
      description: "Student records and personal information",
      columns: {
        id: "UUID primary key",
        school_id: "Foreign key to schools table",
        admission_number: "Unique admission number",
        roll_number: "Roll number in class",
        first_name: "Student's first name",
        middle_name: "Student's middle name",
        last_name: "Student's last name",
        date_of_birth: "Date of birth",
        gender: "Gender (male, female, other)",
        class_id: "Foreign key to classes table",
        section: "Section (A, B, C, etc.)",
        academic_year: "Academic year (e.g., 2024-2025)",
        father_name: "Father's name",
        mother_name: "Mother's name",
        father_phone: "Father's phone number",
        mother_phone: "Mother's phone number",
        address: "Home address",
        city: "City",
        state: "State",
        emergency_contact_name: "Emergency contact name",
        emergency_contact_phone: "Emergency contact phone",
        is_active: "Whether student is currently active"
      },
      relationships: ["belongs to school", "belongs to class", "has many attendance records", "has many fees", "has many exam results"]
    },
    classes: {
      description: "Class/grade information",
      columns: {
        id: "UUID primary key",
        school_id: "Foreign key to schools table",
        name: "Class name (e.g., Class I, Class XII, Grade 10)",
        level: "Class level (1-12)",
        academic_year: "Academic year",
        class_teacher_id: "Foreign key to staff table (class teacher)",
        max_students: "Maximum students allowed",
        is_active: "Whether class is currently active"
      },
      relationships: ["belongs to school", "has many students", "has class teacher"]
    },
    attendances: {
      description: "Student attendance records (table name: 'attendances' - note: plural)",
      columns: {
        id: "UUID primary key",
        school_id: "Foreign key to schools table",
        student_id: "Foreign key to students table",
        class_id: "Foreign key to classes table",
        date: "Date of attendance",
        status: "Status: present, absent, late, excused",
        marked_by: "Foreign key to staff table (who marked attendance)",
        remarks: "Additional remarks"
      },
      relationships: ["belongs to student", "belongs to class", "marked by staff"]
    },
    fees: {
      description: "Fee records and payments",
      columns: {
        id: "UUID primary key",
        school_id: "Foreign key to schools table",
        student_id: "Foreign key to students table",
        fee_type: "Type: tuition, library, transport, hostel",
        amount: "Fee amount",
        due_date: "Due date for payment",
        paid_date: "Date when payment was made",
        status: "Status: pending, paid, partial",
        payment_method: "Payment method: cash, online, cheque",
        receipt_number: "Receipt number if paid",
        academic_year: "Academic year"
      },
      relationships: ["belongs to student", "belongs to school"]
    },
    exams: {
      description: "Exam information",
      columns: {
        id: "UUID primary key",
        school_id: "Foreign key to schools table",
        name: "Exam name",
        exam_type: "Type: unit_test, mid_term, final, assignment",
        academic_year: "Academic year",
        start_date: "Exam start date",
        end_date: "Exam end date",
        max_marks: "Maximum marks",
        passing_marks: "Passing marks",
        class_id: "Foreign key to classes table (optional, if class-specific)",
        subject_id: "Foreign key to subjects table (optional, if subject-specific)"
      },
      relationships: ["belongs to school", "has many exam results", "may belong to class", "may belong to subject"]
    },
    exam_results: {
      description: "Student exam results (table name: 'exam_results')",
      columns: {
        id: "UUID primary key",
        school_id: "Foreign key to schools table",
        exam_id: "Foreign key to exams table",
        student_id: "Foreign key to students table",
        subject_id: "Foreign key to subjects table",
        marks_obtained: "Marks obtained by student",
        max_marks: "Maximum marks for the exam",
        grade: "Grade (A+, A, B+, B, C, D, F)",
        remarks: "Remarks"
      },
      relationships: ["belongs to exam", "belongs to student", "belongs to subject"]
    },
    staff: {
      description: "Staff and teacher information",
      columns: {
        id: "UUID primary key",
        school_id: "Foreign key to schools table",
        employee_id: "Employee ID",
        first_name: "First name",
        last_name: "Last name",
        designation: "Designation: Administrator, Principal, Teacher, etc.",
        email: "Email address (used for login)",
        phone: "Phone number",
        is_active: "Whether staff is currently active"
      },
      relationships: ["belongs to school", "can be class teacher"]
    },
    subjects: {
      description: "Subject information",
      columns: {
        id: "UUID primary key",
        school_id: "Foreign key to schools table",
        name: "Subject name (e.g., Mathematics, English, Science)",
        code: "Subject code",
        academic_year: "Academic year"
      },
      relationships: ["belongs to school"]
    }
  },
  commonQueries: {
    "students absent today": {
      sql: `SELECT s.*, c.name as class_name 
            FROM students s 
            JOIN classes c ON s.class_id = c.id 
            JOIN attendances a ON s.id = a.student_id 
            WHERE a.date = CURRENT_DATE 
            AND a.status = 'absent'`,
      description: "Find students who are absent today"
    },
    "students in class": {
      sql: `SELECT s.*, c.name as class_name 
            FROM students s 
            JOIN classes c ON s.class_id = c.id 
            WHERE c.name = :className`,
      description: "Find all students in a specific class"
    },
    "pending fees": {
      sql: `SELECT s.*, f.amount, f.due_date, f.fee_type 
            FROM students s 
            JOIN fees f ON s.id = f.student_id 
            WHERE f.status = 'pending'`,
      description: "Find students with pending fees"
    }
  }
};

export function getSchemaContext(): string {
  return JSON.stringify(DATABASE_SCHEMA, null, 2);
}

