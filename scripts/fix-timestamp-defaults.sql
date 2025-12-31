-- Fix timestamp defaults for all tables
-- Run this once to add DEFAULT NOW() to created_at and updated_at columns

-- Schools
ALTER TABLE schools ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE schools ALTER COLUMN updated_at SET DEFAULT NOW();

-- Staff
ALTER TABLE staff ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE staff ALTER COLUMN updated_at SET DEFAULT NOW();

-- Students
ALTER TABLE students ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE students ALTER COLUMN updated_at SET DEFAULT NOW();

-- Classes
ALTER TABLE classes ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE classes ALTER COLUMN updated_at SET DEFAULT NOW();

-- Subjects
ALTER TABLE subjects ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE subjects ALTER COLUMN updated_at SET DEFAULT NOW();

-- Attendances
ALTER TABLE attendances ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE attendances ALTER COLUMN updated_at SET DEFAULT NOW();

-- Fees
ALTER TABLE fees ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE fees ALTER COLUMN updated_at SET DEFAULT NOW();

-- Exams
ALTER TABLE exams ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE exams ALTER COLUMN updated_at SET DEFAULT NOW();

-- Exam Results
ALTER TABLE exam_results ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE exam_results ALTER COLUMN updated_at SET DEFAULT NOW();

-- Timetables
ALTER TABLE timetables ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE timetables ALTER COLUMN updated_at SET DEFAULT NOW();

-- Library Books
ALTER TABLE library_books ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE library_books ALTER COLUMN updated_at SET DEFAULT NOW();

-- Library Transactions
ALTER TABLE library_transactions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE library_transactions ALTER COLUMN updated_at SET DEFAULT NOW();

-- Inventory Items
ALTER TABLE inventory_items ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE inventory_items ALTER COLUMN updated_at SET DEFAULT NOW();

-- Transport Routes
ALTER TABLE transport_routes ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE transport_routes ALTER COLUMN updated_at SET DEFAULT NOW();

-- Notifications
ALTER TABLE notifications ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE notifications ALTER COLUMN updated_at SET DEFAULT NOW();

-- Also fix UUID defaults
ALTER TABLE schools ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE staff ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE students ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE classes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE subjects ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE attendances ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE fees ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE exams ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE exam_results ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE timetables ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE library_books ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE library_transactions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE inventory_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE transport_routes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE notifications ALTER COLUMN id SET DEFAULT gen_random_uuid();


