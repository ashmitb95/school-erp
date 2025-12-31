# Database Setup Guide

Complete guide to setting up PostgreSQL, generating JWT secrets, and connecting to the database.

## ✅ Quick Setup

### 1. Generate JWT Secret

```bash
# Generate a secure JWT secret
openssl rand -base64 32
```

**Your generated JWT secret:**
```
J0e+A3hKWmuwslKfHbfZ5OZul+XqC6bm8gZhALcQrKo=
```

This has already been added to your `.env` file.

### 2. Connect to PostgreSQL

#### Option A: Using Docker (Recommended)

```bash
# Interactive connection
docker exec -it erp-postgres psql -U erp_user -d school_erp

# Or use the helper script
./scripts/connect-postgres.sh
```

#### Option B: Using psql directly (if installed locally)

```bash
psql -h localhost -p 5432 -U erp_user -d school_erp
# Password: erp_password (from .env)
```

#### Option C: Using connection string

```bash
psql postgresql://erp_user:erp_password@localhost:5432/school_erp
```

### 3. Create Database Schema

Run the migrations to create all tables:

```bash
# From project root
npm run migrate

# Or use the setup script
./scripts/setup-database.sh
```

## 📊 Database Connection Details

From your `.env` file:
- **Host**: localhost
- **Port**: 5432
- **Database**: school_erp
- **User**: erp_user
- **Password**: erp_password

## 🔧 Useful PostgreSQL Commands

Once connected to PostgreSQL:

```sql
-- List all tables
\dt

-- Describe a table structure
\d staff
\d students
\d schools

-- List all databases
\l

-- Show current database
SELECT current_database();

-- Show all schemas
\dn

-- Exit psql
\q
```

## 📝 Creating Initial Data

### 0. Setup Database Defaults (One-time)

Before inserting data, set up default values for easier inserts:

```bash
# Run the setup script
./scripts/setup-defaults.sh

# Or manually
docker exec -i erp-postgres psql -U erp_user -d school_erp < scripts/fix-timestamp-defaults.sql
```

This adds `DEFAULT` values to `id`, `created_at`, and `updated_at` columns so you don't need to specify them in INSERT statements.

### 1. Create a School

**First, run the fix script to set up defaults:**
```bash
docker exec -i erp-postgres psql -U erp_user -d school_erp < scripts/fix-timestamp-defaults.sql
```

**Then insert a school (simplified - defaults handle id and timestamps):**

```sql
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
```

The `RETURNING` clause will show you the created school's ID, which you'll need for the next step.

### 2. Get School ID

```sql
SELECT id, name, code FROM schools;
```

Copy the `id` for the next step.

### 3. Create Staff User with Hashed Password

First, generate a password hash:

```bash
node scripts/hash-password.js "erp@123"
```

Then insert the staff member:

```sql
-- After running fix-timestamp-defaults.sql, you can use this simplified version:
INSERT INTO staff (
  school_id, employee_id, first_name, last_name,
  date_of_birth, gender, designation, qualification,
  experience_years, phone, email, address, city, state,
  pincode, joining_date, password, is_active
) VALUES (
  'c7bd9026-4c82-40d7-8d42-109811162058',  -- Replace with your school_id
  'EMP001',
  'Admin',
  'User',
  '1990-01-01',
  'male',
  'Administrator',
  'B.Ed',
  5,
  '9876543210',
  'admin@school.com',
  'Address',
  'City',
  'State',
  '123456',
  '2024-01-01',
  '$2a$10$wRPkHfehWVuj4mdAnuqJy.3pMliOJ/mhelE9ItNJlv6Y3s1HVHe1q',  -- Your hashed password
  true
) RETURNING id, email, first_name, last_name;
```

**Or use a subquery to get school_id automatically:**

```sql
INSERT INTO staff (
  school_id, employee_id, first_name, last_name,
  date_of_birth, gender, designation, qualification,
  experience_years, phone, email, address, city, state,
  pincode, joining_date, password, is_active
) VALUES (
  (SELECT id FROM schools WHERE code = 'ABC001'),  -- Auto-get school_id
  'EMP001',
  'Admin',
  'User',
  '1990-01-01',
  'male',
  'Administrator',
  'B.Ed',
  5,
  '9876543210',
  'admin@school.com',
  'Address',
  'City',
  'State',
  '123456',
  '2024-01-01',
  '$2a$10$wRPkHfehWVuj4mdAnuqJy.3pMliOJ/mhelE9ItNJlv6Y3s1HVHe1q',
  true
);
```

## 🔍 Verify Setup

### Check if tables exist:

```bash
docker exec erp-postgres psql -U erp_user -d school_erp -c "\dt"
```

### Check if school exists:

```bash
docker exec erp-postgres psql -U erp_user -d school_erp -c "SELECT id, name, code FROM schools;"
```

### Check if staff exists:

```bash
docker exec erp-postgres psql -U erp_user -d school_erp -c "SELECT id, email, first_name, last_name FROM staff;"
```

## 🚨 Troubleshooting

### Cannot connect to PostgreSQL

1. **Check if container is running:**
   ```bash
   docker ps | grep erp-postgres
   ```

2. **Check container logs:**
   ```bash
   docker logs erp-postgres
   ```

3. **Restart container:**
   ```bash
   docker-compose restart postgres
   ```

### Database doesn't exist

The database `school_erp` should be created automatically by Docker. If not:

```bash
docker exec erp-postgres psql -U erp_user -d postgres -c "CREATE DATABASE school_erp;"
```

### Permission denied

Make sure you're using the correct credentials from `.env`:
- User: `erp_user`
- Password: `erp_password`

### Tables not created

Run migrations:
```bash
npm run migrate
```

## 📚 Next Steps

1. ✅ Database is set up
2. ✅ JWT secret is generated
3. ✅ You can connect to PostgreSQL
4. Next: Create a school and staff user (see above)
5. Then: Start your services with `npm run dev`

## 🔐 Security Notes

- **Never commit `.env` file** (already in `.gitignore`)
- **Change default passwords** in production
- **Use strong JWT secrets** (already generated for you)
- **Rotate secrets** periodically in production

