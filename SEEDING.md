# Database Seeding Guide

This guide explains how to seed the database with realistic dummy data for testing, demos, and AI agent training.

## Overview

The seed script generates comprehensive, enterprise-grade data with proper relationships and constraints:

- **4 School Branches** with unique names and locations
- **5,200+ Students per school** (20,800+ total students)
- **Classes** (1-12 standard) for each school
- **Subjects** (8 subjects per school: Math, Science, English, Hindi, Social Studies, Computer Science, PE, Art)
- **Staff** (1 Administrator + 2-3 Teachers per class per school)
- **Exams** (Monthly Tests, Mid-Term, Final exams)
- **Fees** (Tuition, Library, Transport, Hostel fees with payment history)
- **Attendance Records** (Last 30 days with realistic patterns)
- **Exam Results** (Historical results with grades)
- **Timetables** (Class schedules)
- **Transport Routes** (With student geolocation data)
- **Library Books** (Catalog with transactions)
- **Inventory Items** (School inventory)
- **Calendar Events** (Organization, class, admin, and teacher events)

## Prerequisites

1. Install dependencies:
   ```bash
   sudo npm install
   ```

2. Ensure database is running:
   ```bash
   docker-compose up -d postgres
   ```

3. Run migrations:
   ```bash
   npm run migrate
   ```

4. Create calendar events table (if not already created):
   ```bash
   npm run create-calendar-table
   ```

## Running the Seed Script

```bash
npm run seed
```

**Note:** This process may take 15-45 minutes depending on your system, as it creates:
- 4 schools
- 48 classes (12 per school)
- 32 subjects (8 per school)
- ~200 staff members (1 admin + ~50 teachers per school)
- 20,800+ students (5,200 per school)
- 1,000+ exams
- 200,000+ fee records (with payment history)
- 600,000+ attendance records (30 days × 20,000 students)
- 10,000+ exam results
- Timetables for all classes
- Transport routes with geolocation
- Library books and transactions
- Inventory items
- Calendar events

## Generated Data Details

### Schools
- 4 branches with Indian company names
- Different boards (CBSE, ICSE, State Board)
- Established between 1990-2010
- Unique addresses in Indian cities (Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad)
- Contact information (phone, email, principal details)

### Students
- **Distribution**: Evenly distributed across all classes (1-12)
- **Names**: Realistic Indian names (first, middle, last)
- **Demographics**: 
  - Age distribution based on class level
  - Gender distribution (male, female, other)
  - Blood groups
  - Aadhaar numbers (12-digit)
- **Family Information**:
  - Father and mother names, occupations, phone numbers, emails
  - Guardian information (if applicable)
  - Emergency contacts
- **Academic**:
  - Admission numbers and roll numbers
  - Class assignments
  - Academic year (2024-2025)
- **Location**:
  - Addresses in Indian cities
  - Geolocation data (latitude/longitude) for transport routes
  - Transport route assignments
- **Medical**: Medical conditions (if applicable)

### Staff
- **Administrators**: 1 per school
  - Email: `admin@school{N}.edu.in`
  - Password: `teacher@123`
  - Designation: Administrator
- **Teachers**: 2-3 per class per school
  - Email: `{firstname}.{lastname}@school{N}.edu.in`
  - Password: `teacher@123`
  - Designations: Teacher, Senior Teacher, Head Teacher
  - Qualifications: B.Ed, M.Ed, Ph.D
  - Experience: 1-20 years
- **Other Staff**: Librarians, Accountants, Clerks, Security, Maintenance

### Classes
- 12 classes per school (I through XII)
- Class levels: 1-12
- Capacity: 40-50 students per class
- Academic year: 2024-2025
- Active status

### Subjects
- 8 subjects per school:
  - Mathematics
  - Science
  - English
  - Hindi
  - Social Studies
  - Computer Science
  - Physical Education
  - Art

### Exams
- **Types**: Unit Test, Mid-Term, Final, Assignment
- **Frequency**: Multiple exams per subject per class
- **Details**:
  - Max marks: 100
  - Passing marks: 33
  - Start and end dates
  - Academic year tracking

### Fees
- **Types**: 
  - Tuition fees (monthly, 12 months)
  - Library fees (one-time)
  - Transport fees (monthly)
  - Hostel fees (monthly, if applicable)
- **Status Distribution**:
  - Paid: 60%
  - Pending: 30%
  - Partial: 8%
  - Waived: 2%
- **Payment History**:
  - Transaction IDs
  - Payment methods (Cash, Online, Cheque)
  - Receipt numbers
  - Paid dates
- **Features**:
  - Due dates
  - Payment links
  - Reminder tracking

### Attendance
- **Coverage**: Last 30 days for all students
- **Status Distribution**:
  - Present: 85%
  - Absent: 10%
  - Late: 4%
  - Excused: 1%
- **Patterns**: Realistic attendance patterns (weekends off, some absences)

### Exam Results
- Results for sample exams
- **Marks**: Realistic distribution (0-100)
- **Grades**: A+, A, B+, B, C, D, F
- **Remarks**: For some students
- **Percentage Calculation**: Automatic

### Timetables
- Class schedules for all classes
- Period-based structure
- Subject and teacher assignments
- Day-wise organization

### Transport Routes
- Multiple routes per school
- **Details**:
  - Route names and numbers
  - Start and end locations
  - Driver information
  - Vehicle details (number, type, capacity)
  - Fare per month
- **Student Assignments**: Students assigned to routes
- **Geolocation**: Student pickup points with coordinates

### Library Books
- Book catalog with:
  - Titles, authors, ISBN
  - Categories (Fiction, Non-Fiction, Textbook, Reference, etc.)
  - Availability status
- **Transactions**: Issue, return, renew records

### Inventory Items
- School inventory with:
  - Categories (Stationery, Furniture, Electronics, Sports Equipment, etc.)
  - Quantities
  - Locations

### Calendar Events
- **Event Types**:
  - Organization events (school-wide)
  - Class-specific events
  - Admin-specific events
  - Global teacher events
- **Features**:
  - Date ranges
  - All-day or timed events
  - Recurrence patterns
  - Reminder settings
  - Location information

## Login Credentials

After seeding, you can login with:

### Admin Accounts (All use password: `teacher@123`)
- **School 1**: `admin@school1.edu.in`
- **School 2**: `admin@school2.edu.in`
- **School 3**: `admin@school3.edu.in`
- **School 4**: `admin@school4.edu.in`

### Teacher Accounts
- All teachers use password: `teacher@123`
- Email format: `{firstname}.{lastname}@school{N}.edu.in`
- Example: `aarav.sharma@school1.edu.in`

### Demo Login Feature
The login page includes a dropdown with all 4 school admin accounts for quick demo access.

## Data Quality Features

### Realistic Data Generation
- **Indian Names**: Proper Indian first and last names
- **Addresses**: Realistic Indian addresses with cities, states, pincodes
- **Phone Numbers**: Valid Indian phone number format (10 digits)
- **Dates**: Realistic date ranges (birth dates, admission dates, etc.)
- **Relationships**: Proper foreign key relationships maintained
- **Constraints**: All database constraints respected

### Data Relationships
- Students linked to classes and schools
- Fees linked to students and schools
- Attendance linked to students, classes, and staff
- Exam results linked to exams, students, and subjects
- Timetables linked to classes, subjects, and staff
- Transport routes linked to students with geolocation
- Calendar events linked to schools, classes, and staff

### Transaction Safety
- All operations wrapped in database transactions
- Rollback on errors
- Data integrity maintained

## Clearing Existing Data

The seed script automatically clears existing data before seeding while preserving admin users. If you want to keep existing data, modify the clearing section in `scripts/seed-database.ts`.

**Note**: Admin users (emails matching `admin@school*.edu.in`) are preserved during clearing.

## Customization

You can modify the seed script (`scripts/seed-database.ts`) to:

### Adjust Quantities
- Change number of schools: `CONFIG.NUM_SCHOOLS`
- Adjust students per school: `CONFIG.STUDENTS_PER_SCHOOL`
- Modify teachers per class
- Change number of exams

### Modify Data Ranges
- Change academic year
- Adjust date ranges for attendance
- Modify fee amounts
- Change exam frequency

### Customize Patterns
- Attendance patterns
- Fee payment status distribution
- Exam result grade distribution
- Transport route assignments

## Performance Tips

For faster seeding:

1. **System Resources**:
   - Ensure PostgreSQL has adequate memory (4GB+ recommended)
   - Increase Docker memory allocation
   - Use SSD storage

2. **Timing**:
   - Run during off-peak hours
   - Close other resource-intensive applications

3. **Reduced Data**:
   - For initial testing, reduce `STUDENTS_PER_SCHOOL` to 100-500
   - Reduce attendance days from 30 to 7
   - Reduce number of fee records

4. **Batch Processing**:
   - The script uses batch inserts (100 records per batch)
   - Adjust `CONFIG.BATCH_SIZE` if needed

## Troubleshooting

### "Cannot find module '@faker-js/faker'"
```bash
sudo npm install
```

### "Database connection failed"
- Ensure PostgreSQL is running: `docker-compose ps`
- Check `.env` file has correct database credentials
- Verify database exists: `docker exec erp-postgres psql -U erp_user -d school_erp -c "\dt"`

### "Out of memory" errors
- Reduce the number of students per school in the seed script
- Increase Docker memory allocation (8GB+ recommended)
- Process data in smaller batches
- Close other applications

### "Foreign key constraint violation"
- Ensure all migrations have been run
- Check that schools are created before students/staff
- Verify model associations are correct

### "Unique constraint violation"
- The script handles unique emails, but if issues persist:
- Clear all data and re-run
- Check for duplicate entries in the seed script

### Slow Performance
- Increase PostgreSQL `shared_buffers` and `work_mem`
- Use connection pooling
- Reduce batch size if memory is limited
- Run on a more powerful machine

## Progress Monitoring

The seed script provides progress updates:
- Step-by-step progress indicators
- Count of records created per table
- Final summary with totals
- Login credentials display

## Post-Seeding Steps

After seeding:

1. **Verify Data**:
   ```bash
   # Check record counts
   docker exec erp-postgres psql -U erp_user -d school_erp -c "SELECT 'students' as table, COUNT(*) FROM students UNION ALL SELECT 'staff', COUNT(*) FROM staff UNION ALL SELECT 'fees', COUNT(*) FROM fees;"
   ```

2. **Start Services**:
   ```bash
   npm run dev
   ```

3. **Start Frontend**:
   ```bash
   cd web
   npm run dev
   ```

4. **Login and Explore**:
   - Use the demo login dropdown
   - Explore dashboard with real data
   - Test AI agent features with comprehensive dataset
   - Verify all modules are working

## Data Statistics

After successful seeding, you should see approximately:

- **Schools**: 4
- **Classes**: 48 (12 per school)
- **Subjects**: 32 (8 per school)
- **Staff**: ~200 (1 admin + ~50 teachers per school)
- **Students**: ~20,800 (5,200 per school)
- **Exams**: 1,000+
- **Fee Records**: 200,000+
- **Attendance Records**: 600,000+
- **Exam Results**: 10,000+
- **Timetables**: 48 (one per class)
- **Transport Routes**: 12+ (3+ per school)
- **Library Books**: 1,000+
- **Inventory Items**: 500+
- **Calendar Events**: 100+

## Notes

- All passwords are hashed using bcrypt (10 rounds)
- All dates are in ISO format
- All monetary values are in Indian Rupees (₹)
- Geolocation coordinates are within India
- Phone numbers follow Indian format (10 digits)
- Email addresses follow the pattern: `{identifier}@school{N}.edu.in`
