# Fix PostgreSQL Connection Issue

## Problem
The `erp_user` role exists inside Docker but Node.js can't connect from the host machine.

## Solution Options

### Option 1: Use Docker Network (Recommended)

Since the role exists inside Docker, connect through Docker's network:

```bash
# Update .env to use Docker container's IP or network
# Or run migrations from inside Docker
```

### Option 2: Check for Local PostgreSQL

You might have a local PostgreSQL instance running that's intercepting connections:

```bash
# Check what's on port 5432
lsof -i :5432

# If there's a local PostgreSQL, either:
# 1. Stop it: brew services stop postgresql (on macOS)
# 2. Or change Docker port mapping in docker-compose.yml
```

### Option 3: Recreate Container with Proper Setup

```bash
# Stop and remove the container
docker-compose down postgres

# Remove the volume to start fresh
docker volume rm erp_postgres_data

# Start again
docker-compose up -d postgres

# Wait a few seconds, then run migrations
sleep 5
npm run migrate
```

### Option 4: Use Different Port

Edit `docker-compose.yml` to use a different port:

```yaml
ports:
  - "5433:5432"  # Use 5433 instead of 5432
```

Then update `.env`:
```
DB_PORT=5433
```

## Quick Fix Script

Run this to diagnose and fix:

```bash
./scripts/fix-postgres-connection.sh
```


