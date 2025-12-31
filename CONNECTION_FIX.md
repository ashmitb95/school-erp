# Database Connection Fix Summary

## Problem
All microservices were failing to connect to PostgreSQL with errors like:
- `role "erp_user" does not exist`
- Services couldn't find the `.env` file from their subdirectories

## Root Cause
The services were calling `dotenv.config()` without specifying a path, which only looks for `.env` in the current working directory. When services run from their subdirectories (`services/auth`, `services/student`, etc.), they couldn't find the root `.env` file.

## Solution
Updated all services and shared modules to explicitly load the `.env` file from the project root:

```typescript
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
```

## Files Updated

### Services
- ✅ `services/auth/src/index.ts`
- ✅ `services/student/src/index.ts`
- ✅ `services/fees/src/index.ts`
- ✅ `services/attendance/src/index.ts`
- ✅ `services/exam/src/index.ts`
- ✅ `services/api-gateway/src/index.ts`
- ✅ `services/api-gateway/src/middleware/auth.ts`

### Shared Modules
- ✅ `shared/database/config.ts`
- ✅ `shared/utils/redis.ts`
- ✅ `shared/erpnext/client.ts`

## TypeScript Import Fix
Changed all `import path from 'path'` to `import * as path from 'path'` to match TypeScript configuration without `esModuleInterop`.

## Verification
✅ Database migration runs successfully
✅ All tables created: students, schools, staff, classes, transport_routes, subjects, notifications, attendances, fees, exams, exam_results, timetables, library_books, library_transactions, inventory_items

## Next Steps
1. Start all services: `npm run dev`
2. Services should now connect to PostgreSQL on port 5433
3. Verify connection by checking service logs

## Database Connection Details
- **Host**: localhost
- **Port**: 5433 (mapped from container port 5432)
- **Database**: school_erp
- **User**: erp_user
- **Password**: erp_password (or your custom password from `.env`)


