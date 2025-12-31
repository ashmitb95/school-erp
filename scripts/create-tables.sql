-- Create all tables manually using SQL
-- Run this from inside Docker: docker exec -i erp-postgres psql -U erp_user -d school_erp < scripts/create-tables.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  principal_name VARCHAR(255) NOT NULL,
  principal_email VARCHAR(255) NOT NULL,
  board VARCHAR(50) NOT NULL,
  established_year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(code);
CREATE INDEX IF NOT EXISTS idx_schools_city_state ON schools(city, state);
CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active);
CREATE INDEX IF NOT EXISTS idx_schools_board ON schools(board);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  employee_id VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  date_of_birth DATE NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  designation VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  qualification VARCHAR(255) NOT NULL,
  experience_years INTEGER DEFAULT 0,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  aadhaar_number VARCHAR(12),
  pan_number VARCHAR(10),
  bank_account_number VARCHAR(50),
  bank_ifsc VARCHAR(11),
  salary DECIMAL(10, 2),
  joining_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  photo_url VARCHAR(500),
  password VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_school_employee ON staff(school_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_designation ON staff(designation);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);

-- Note: Run the full migration script to create all other tables
-- This is a simplified version for quick setup


