# Quick Start Guide

Complete guide to running both backend services and frontend web application.

## Quick Summary

**To run everything:**

1. **Terminal 1 - Infrastructure & Backend:**
   ```bash
   # Install dependencies
   sudo npm install && sudo npm install --workspaces
   
   # Start Docker services (PostgreSQL, Redis, RabbitMQ)
   docker-compose up -d
   
   # Run database migrations
   npm run migrate
   
   # Start all backend services
   npm run dev
   ```

2. **Terminal 2 - Frontend:**
   ```bash
   cd web
   sudo npm install
   npm run dev
   ```

3. **Access:**
   - Frontend: http://localhost:5173
   - API Gateway: http://localhost:3000

**See detailed steps below for complete setup including password hashing.**

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed
- PostgreSQL client (optional, for direct DB access)

## Installation Steps

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
sudo npm install

# Install dependencies for all workspaces
sudo npm install --workspaces
```

### 2. Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
# The default values work for local development with Docker
# For production, update:
# - JWT_SECRET (use: openssl rand -base64 32)
# - Database credentials
# - Service ports if needed
```

**Important**: The `.env.example` file contains all required environment variables with default values suitable for local development. For production, make sure to:
- Generate a strong `JWT_SECRET` (use `openssl rand -base64 32`)
- Use secure database passwords
- Configure ERPNext credentials if using ERPNext integration

### 3. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, and RabbitMQ
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 4. Database Migration

```bash
# Run database migrations to create tables
npm run migrate

# Or manually:
node shared/database/migrate.js
```

### 5. Start Backend Services

```bash
# Start all backend services in development mode
npm run dev

# This will start:
# - API Gateway on port 3000
# - Auth Service on port 3001
# - Student Service on port 3002
# - Fees Service on port 3003
# - Attendance Service on port 3004
# - Exam Service on port 3005
```

### 6. Start Frontend Web App

Open a new terminal window:

```bash
# Navigate to web directory
cd web

# Install frontend dependencies (first time only)
sudo npm install

# Start frontend development server
npm run dev
```

The web app will be available at `http://localhost:5173`

**Note**: The frontend proxies API requests to `http://localhost:3000` (API Gateway)

### 7. Verify Installation

```bash
# Check API Gateway health
curl http://localhost:3000/health

# Check individual services
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # Student
curl http://localhost:3003/health  # Fees
curl http://localhost:3004/health  # Attendance
curl http://localhost:3005/health  # Exam
```

## First Steps

### 1. Create a School

You'll need to create a school record first. Use a database client or API:

```bash
# Using curl (after setting up authentication)
curl -X POST http://localhost:3000/api/school \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC School",
    "code": "ABC001",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phone": "9876543210",
    "email": "info@abcschool.com",
    "principal_name": "Principal Name",
    "principal_email": "principal@abcschool.com",
    "board": "CBSE",
    "established_year": 2000
  }'
```

### 2. Create Staff/Admin User with Bcrypt Password

**Important**: Passwords must be hashed using bcrypt before storing in the database.

#### Step 1: Generate Password Hash

Use the provided script to hash your password:

```bash
# From the project root directory
node scripts/hash-password.js "your-plain-password"
```

This will output a bcrypt hash like:
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

**Alternative: Using Node.js REPL**

```bash
node
```

Then in the Node.js console:
```javascript
const bcrypt = require('bcryptjs');
const password = 'your-plain-password';
bcrypt.hash(password, 10, (err, hash) => {
  console.log(hash);
  process.exit();
});
```

**Alternative: Using bcryptjs directly**

```bash
# Install bcryptjs globally (if not already installed)
sudo npm install -g bcryptjs

# Or use npx
npx bcryptjs
# Enter your password when prompted
```

#### Step 2: Insert Staff with Hashed Password

```sql
-- Using PostgreSQL client
-- First, get your school_id from the schools table
SELECT id FROM schools LIMIT 1;

-- Then insert staff with the hashed password
INSERT INTO staff (
  id, school_id, employee_id, first_name, last_name,
  date_of_birth, gender, designation, qualification,
  experience_years, phone, email, address, city, state,
  pincode, joining_date, password
) VALUES (
  gen_random_uuid(),
  'your-school-id-here',  -- Replace with actual school_id
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
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'  -- Replace with your generated hash
);
```

**Note**: The password field in the Staff model stores the bcrypt hash. Never store plain text passwords!

### 3. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.com",
    "password": "your-password"
  }'
```

This will return a JWT token. Use this token for authenticated requests:

```bash
curl http://localhost:3000/api/student \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## ERPNext Integration (Optional)

If you want to integrate with ERPNext:

1. **Install ERPNext** (separately or via Docker)
2. **Get API Credentials**:
   - Log in to ERPNext
   - Go to Settings → API → API Keys
   - Create API Key and Secret
3. **Update .env**:
   ```env
   ERPNEXT_URL=http://localhost:8000
   ERPNEXT_API_KEY=your-api-key
   ERPNEXT_API_SECRET=your-api-secret
   ```

See `ERPNEXT_INTEGRATION.md` for detailed integration guide.

## Running Backend and Frontend Together

### Option 1: Run Everything (Recommended for Development)

**Terminal 1 - Backend Services:**
```bash
# From project root
npm run dev
```

**Terminal 2 - Frontend:**
```bash
# From project root
cd web
npm run dev
```

### Option 2: Run Individual Services

```bash
# Run only API Gateway
cd services/api-gateway
npm run dev

# Run only Student Service
cd services/student
npm run dev

# Run only Auth Service
cd services/auth
npm run dev
```

### Option 3: Using Process Manager (PM2)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start all backend services
pm2 start npm --name "api-gateway" -- run dev:gateway
pm2 start npm --name "auth-service" -- run dev:auth
pm2 start npm --name "student-service" -- run dev:student
pm2 start npm --name "fees-service" -- run dev:fees
pm2 start npm --name "attendance-service" -- run dev:attendance
pm2 start npm --name "exam-service" -- run dev:exam

# Start frontend
cd web
pm2 start npm --name "web-app" -- run dev

# View all processes
pm2 list

# Stop all
pm2 stop all
```

### Database Access

#### Command Line

```bash
# Connect via Docker (easiest)
docker exec -it erp-postgres psql -U erp_user -d school_erp

# Or using connection string (from host)
psql postgresql://erp_user:erp_password@localhost:5433/school_erp
```

#### GUI Clients (pgAdmin, DBeaver, TablePlus, etc.)

**Connection Details:**
- Host: `localhost`
- Port: `5433` ⚠️ (Not 5432 - changed to avoid conflict)
- Database: `school_erp`
- Username: `erp_user`
- Password: `erp_password`

**Connection String:**
```
postgresql://erp_user:erp_password@localhost:5433/school_erp
```

See `PGADMIN_CONNECTION.md` for detailed instructions on connecting with pgAdmin and other GUI clients.

### Viewing Logs

```bash
# Docker logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Service logs (in separate terminals)
npm run dev:gateway
npm run dev:student
```

## Password Management

### Creating New Users with Hashed Passwords

Always hash passwords before storing them in the database:

```bash
# Generate hash for a new password
node scripts/hash-password.js "new-password-123"
```

Copy the generated hash and use it in your INSERT statement.

### Updating Existing Passwords

```sql
-- Update password for existing user
UPDATE staff 
SET password = '$2a$10$your-generated-hash-here'
WHERE email = 'user@example.com';
```

### Verifying Password Hash

To test if a password hash is correct:

```bash
node
```

```javascript
const bcrypt = require('bcryptjs');
const hash = '$2a$10$your-hash-here';
const plainPassword = 'test-password';

bcrypt.compare(plainPassword, hash, (err, result) => {
  console.log('Password matches:', result);
  process.exit();
});
```

## Common Issues

### Port Already in Use

If a port is already in use, either:
- Stop the service using that port
- Change the port in `.env` file (backend) or `vite.config.ts` (frontend)

**Backend ports:**
- API Gateway: 3000
- Auth: 3001
- Student: 3002
- Fees: 3003
- Attendance: 3004
- Exam: 3005

**Frontend port:**
- Web App: 5173 (Vite default)

### Database Connection Failed

1. Verify Docker containers are running: `docker-compose ps`
2. Check database credentials in `.env`
3. Ensure PostgreSQL is accessible: `docker exec -it erp-postgres pg_isready`

### Redis Connection Failed

1. Check Redis is running: `docker-compose ps redis`
2. Verify Redis connection: `docker exec -it erp-redis redis-cli ping`

### Module Not Found

Run `sudo npm install` in the root directory and in each service directory.

**For frontend:**
```bash
cd web
sudo npm install
```

### Frontend Not Connecting to Backend

1. Ensure backend services are running (check `http://localhost:3000/health`)
2. Check `web/vite.config.ts` proxy configuration
3. Verify API Gateway is running on port 3000
4. Check browser console for CORS errors

### Password Authentication Failing

1. Verify password was hashed correctly using `node scripts/hash-password.js`
2. Check that the hash in database matches the format: `$2a$10$...`
3. Ensure bcryptjs is installed: `npm list bcryptjs`
4. Check auth service logs for errors

## Next Steps

1. Read `ARCHITECTURE.md` for system design
2. Read `ERPNEXT_INTEGRATION.md` for ERPNext setup
3. Explore API endpoints in service files
4. Set up production deployment (see ARCHITECTURE.md)

## Production Deployment

For production:
1. Use environment-specific `.env` files
2. Set up proper database backups
3. Configure reverse proxy (nginx)
4. Set up monitoring and logging
5. Use process manager (PM2) or container orchestration (Kubernetes)

