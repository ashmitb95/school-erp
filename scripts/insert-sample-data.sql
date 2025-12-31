-- Sample Data Insertion Script
-- Run this after creating the database to add initial test data

-- 1. Create a School
INSERT INTO schools (
  name, code, address, city, state, pincode,
  phone, email, principal_name, principal_email,
  board, established_year, is_active
) VALUES (
  'ABC School',
  'ABC001',
  '123 Main Street',
  'Mumbai',
  'Maharashtra',
  '400001',
  '9876543210',
  'info@abcschool.com',
  'Principal Name',
  'principal@abcschool.com',
  'CBSE',
  2000,
  true
) RETURNING id, name, code;

-- Note: Save the returned school_id for the next step

-- 2. Create a Staff/Admin User
-- First, generate password hash using: node scripts/hash-password.js "your-password"
-- Then replace the hash below and the school_id

-- Example (replace with actual values):
-- INSERT INTO staff (
--   school_id, employee_id, first_name, last_name,
--   date_of_birth, gender, designation, qualification,
--   experience_years, phone, email, address, city, state,
--   pincode, joining_date, password, is_active
-- ) VALUES (
--   (SELECT id FROM schools WHERE code = 'ABC001'),  -- Get school_id automatically
--   'EMP001',
--   'Admin',
--   'User',
--   '1990-01-01',
--   'male',
--   'Administrator',
--   'B.Ed',
--   5,
--   '9876543210',
--   'admin@school.com',
--   'Address',
--   'City',
--   'State',
--   '123456',
--   '2024-01-01',
--   '$2a$10$YOUR_HASHED_PASSWORD_HERE',  -- Replace with hash from script
--   true
-- );

-- 3. Create a Class
-- INSERT INTO classes (
--   school_id, name, code, level, academic_year, capacity, is_active
-- ) VALUES (
--   (SELECT id FROM schools WHERE code = 'ABC001'),
--   'Class 1',
--   'C1',
--   1,
--   '2024-2025',
--   40,
--   true
-- );


