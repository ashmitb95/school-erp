# Database Seeding Guide

This guide explains how to seed the database with realistic dummy data for testing and AI agent training.

## Overview

The seed script generates comprehensive data for:
- **4 School Branches** with unique names and locations
- **5,000+ Students per school** (20,000+ total students)
- **Classes** (1-12 standard) for each school
- **Subjects** (Math, Science, English, Hindi, etc.)
- **Staff** (Administrators and Teachers)
- **Exams** (Monthly Tests, Mid-Term, Final)
- **Fees** (Tuition, Library, Transport, Hostel)
- **Attendance Records** (Last 30 days)
- **Exam Results** (Sample data)

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure database is running:
   ```bash
   docker-compose up -d postgres
   ```

3. Run migrations:
   ```bash
   npm run migrate
   ```

## Running the Seed Script

```bash
npm run seed
```

**Note:** This process may take 10-30 minutes depending on your system, as it creates:
- 4 schools
- 48 classes (12 per school)
- 32 subjects (8 per school)
- ~200 staff members
- 20,000+ students
- 1,000+ exams
- 200,000+ fee records
- 30,000+ attendance records
- 10,000+ exam results

## Generated Data Details

### Schools
- 4 branches with Indian names and addresses
- Different boards (CBSE, ICSE, State Board)
- Established between 1990-2010

### Students
- Distributed across all classes (1-12)
- Indian names and addresses
- Realistic age distribution based on class level
- Parent/guardian information
- Admission numbers and roll numbers

### Staff
- 1 Administrator per school
- 2-3 Teachers per class
- All staff have login credentials (password: `teacher@123`)

### Exams
- Monthly Tests, Mid-Term, and Final exams
- For all subjects and all classes
- Max marks: 100, Passing: 33

### Fees
- Monthly tuition fees (12 months)
- One-time fees (Library, Transport, Hostel)
- Mix of paid, pending, and partial status

### Attendance
- Last 30 days of attendance
- Present, Absent, Late status
- Sample of 1000 students per day

### Exam Results
- Results for sample exams
- Marks, grades (A+, A, B+, B, C, D, F)
- Remarks for some students

## Login Credentials

After seeding, you can login with:

- **School 1**: `admin@school1.edu.in` / `teacher@123`
- **School 2**: `admin@school2.edu.in` / `teacher@123`
- **School 3**: `admin@school3.edu.in` / `teacher@123`
- **School 4**: `admin@school4.edu.in` / `teacher@123`

All teachers also use password: `teacher@123`

## Clearing Existing Data

The seed script automatically clears existing data before seeding. If you want to keep existing data, comment out the TRUNCATE statement in `scripts/seed-database.ts`.

## Customization

You can modify the seed script to:
- Change the number of schools
- Adjust students per school
- Modify the date ranges
- Change fee amounts
- Adjust attendance patterns

Edit `scripts/seed-database.ts` to customize the data generation.

## Performance Tips

For faster seeding:
1. Ensure PostgreSQL has adequate memory
2. Run during off-peak hours
3. Consider reducing the number of students per school for initial testing
4. Use batch inserts for very large datasets (future enhancement)

## Troubleshooting

### "Cannot find module '@faker-js/faker'"
```bash
npm install
```

### "Database connection failed"
- Ensure PostgreSQL is running: `docker-compose ps`
- Check `.env` file has correct database credentials
- Verify database exists: `docker exec erp-postgres psql -U erp_user -d school_erp -c "\dt"`

### "Out of memory" errors
- Reduce the number of students per school in the seed script
- Increase Docker memory allocation
- Process data in smaller batches

## Next Steps

After seeding:
1. Start all services: `npm run dev`
2. Login to the web app
3. Explore the dashboard with real data
4. Test AI agent features with the comprehensive dataset

