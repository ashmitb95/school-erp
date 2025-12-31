# PostgreSQL Connection Guide

## ✅ Your Setup is Working!

Your PostgreSQL is now properly configured and running.

## 🔌 Connection Methods

### Method 1: Docker Exec (Easiest)

```bash
docker exec -it erp-postgres psql -U erp_user -d school_erp
```

This connects you directly to the database. Once connected, you can run SQL commands.

### Method 2: Using Helper Script

```bash
./scripts/connect-postgres.sh
```

### Method 3: Direct psql (if installed locally)

```bash
psql -h localhost -p 5432 -U erp_user -d school_erp
# Password: erp_password
```

### Method 4: Connection String

```bash
psql postgresql://erp_user:erp_password@localhost:5432/school_erp
```

## 📊 Connection Details

- **Host**: localhost
- **Port**: 5432
- **Database**: school_erp
- **User**: erp_user
- **Password**: erp_password

## 🔑 Your JWT Secret

Your JWT secret has been generated and saved to `.env`:
```
J0e+A3hKWmuwslKfHbfZ5OZul+XqC6bm8gZhALcQrKo=
```

## 📝 Useful Commands (Once Connected)

```sql
-- List all tables
\dt

-- Describe a table
\d staff
\d students
\d schools

-- Show table data
SELECT * FROM schools;
SELECT * FROM staff;

-- Count records
SELECT COUNT(*) FROM students;

-- Exit
\q
```

## 🚀 Quick Commands (Without Connecting)

### Check if database is accessible:
```bash
docker exec erp-postgres psql -U erp_user -d school_erp -c "SELECT version();"
```

### List all tables:
```bash
docker exec erp-postgres psql -U erp_user -d school_erp -c "\dt"
```

### Check if school exists:
```bash
docker exec erp-postgres psql -U erp_user -d school_erp -c "SELECT id, name FROM schools;"
```

## 🎯 Next Steps

1. ✅ Database is connected
2. ✅ Tables are created (after running migrations)
3. Next: Create a school and staff user

See `DATABASE_SETUP.md` for detailed instructions on creating initial data.


