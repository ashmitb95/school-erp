# Connecting to PostgreSQL with pgAdmin

Complete guide to connect to your School ERP database using pgAdmin or any PostgreSQL GUI client.

## Connection Details

Use these credentials to connect:

- **Host/Server**: `localhost` (or `127.0.0.1`)
- **Port**: `5433` (⚠️ Note: Not the default 5432)
- **Database**: `school_erp`
- **Username**: `erp_user`
- **Password**: `erp_password`

## Using pgAdmin

### Step 1: Install pgAdmin

**macOS:**
```bash
brew install --cask pgadmin4
```

**Or download from:** https://www.pgadmin.org/download/

### Step 2: Add New Server

1. Open pgAdmin
2. Right-click on **Servers** in the left panel
3. Select **Register** → **Server**

### Step 3: Configure Connection

#### General Tab:
- **Name**: `School ERP` (or any name you prefer)

#### Connection Tab:
- **Host name/address**: `localhost`
- **Port**: `5433` ⚠️ **Important: Use 5433, not 5432**
- **Maintenance database**: `school_erp`
- **Username**: `erp_user`
- **Password**: `erp_password`
- ✅ **Save password** (optional, for convenience)

#### Advanced Tab (Optional):
- **DB restriction**: `school_erp` (to only show this database)

### Step 4: Save and Connect

Click **Save** and pgAdmin will connect to your database.

## Using Other GUI Clients

### DBeaver

1. **New Database Connection** → Select **PostgreSQL**
2. **Main Tab:**
   - Host: `localhost`
   - Port: `5433`
   - Database: `school_erp`
   - Username: `erp_user`
   - Password: `erp_password`
3. Click **Test Connection** → **Finish**

### TablePlus

1. **Create a new connection** → **PostgreSQL**
2. Fill in:
   - Name: `School ERP`
   - Host: `localhost`
   - Port: `5433`
   - User: `erp_user`
   - Password: `erp_password`
   - Database: `school_erp`
3. Click **Connect**

### DataGrip (JetBrains)

1. **Database** → **+** → **Data Source** → **PostgreSQL**
2. Configure:
   - Host: `localhost`
   - Port: `5433`
   - Database: `school_erp`
   - User: `erp_user`
   - Password: `erp_password`
3. Click **Test Connection** → **OK**

### Postico (macOS)

1. **New Favorite**
2. Configure:
   - Host: `localhost`
   - Port: `5433`
   - User: `erp_user`
   - Password: `erp_password`
   - Database: `school_erp`
3. Click **Connect**

## Connection String

For tools that use connection strings:

```
postgresql://erp_user:erp_password@localhost:5433/school_erp
```

Or with SSL disabled (if needed):

```
postgresql://erp_user:erp_password@localhost:5433/school_erp?sslmode=disable
```

## Troubleshooting

### Connection Refused

1. **Check if PostgreSQL container is running:**
   ```bash
   docker ps | grep erp-postgres
   ```

2. **Check if port 5433 is accessible:**
   ```bash
   lsof -i :5433
   ```

3. **Restart the container:**
   ```bash
   docker-compose restart postgres
   ```

### Authentication Failed

1. **Verify credentials in `.env` file:**
   ```bash
   cat .env | grep DB_
   ```

2. **Test connection via command line:**
   ```bash
   psql -h localhost -p 5433 -U erp_user -d school_erp
   ```

### Can't See Tables

1. **Refresh the database connection** in your GUI client
2. **Check if tables exist:**
   ```bash
   docker exec erp-postgres psql -U erp_user -d school_erp -c "\dt"
   ```

### Port Already in Use

If port 5433 is already in use:

1. **Check what's using it:**
   ```bash
   lsof -i :5433
   ```

2. **Change port in `docker-compose.yml`:**
   ```yaml
   ports:
     - "5434:5432"  # Use 5434 instead
   ```

3. **Update `.env`:**
   ```
   DB_PORT=5434
   ```

## Quick Test Connection

Test your connection before using a GUI:

```bash
# Using psql
psql -h localhost -p 5433 -U erp_user -d school_erp

# Using connection string
psql postgresql://erp_user:erp_password@localhost:5433/school_erp
```

## What You'll See

Once connected, you should see:

- **15 tables** in the `public` schema:
  - schools
  - staff
  - students
  - classes
  - subjects
  - attendances
  - fees
  - exams
  - exam_results
  - timetables
  - library_books
  - library_transactions
  - inventory_items
  - transport_routes
  - notifications

- **Indexes** on all tables for optimized queries
- **Foreign key relationships** between tables

## Security Note

⚠️ **For Production:**
- Change default passwords
- Use SSL/TLS connections
- Restrict access to specific IPs
- Use strong passwords
- Don't commit `.env` file to git

## Quick Reference Card

```
┌─────────────────────────────────────┐
│   PostgreSQL Connection Details     │
├─────────────────────────────────────┤
│ Host:     localhost                 │
│ Port:     5433                      │
│ Database: school_erp                │
│ User:     erp_user                  │
│ Password: erp_password              │
└─────────────────────────────────────┘
```


