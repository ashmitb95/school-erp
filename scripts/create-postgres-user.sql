-- Create PostgreSQL user/role
-- This script creates the erp_user role with proper permissions

-- Connect as the default postgres user first, or use the user that has CREATE ROLE privilege
-- From Docker: docker exec -i erp-postgres psql -U erp_user -d postgres < scripts/create-postgres-user.sql

-- Check if role exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_user') THEN
        CREATE ROLE erp_user WITH LOGIN PASSWORD 'erp_password';
        RAISE NOTICE 'Role erp_user created';
    ELSE
        RAISE NOTICE 'Role erp_user already exists';
    END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE school_erp TO erp_user;

-- Connect to school_erp database and grant schema privileges
\c school_erp

-- Grant privileges on all tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO erp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO erp_user;

-- Grant privileges on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO erp_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO erp_user;

-- Make erp_user the owner of the database (optional, but gives full control)
ALTER DATABASE school_erp OWNER TO erp_user;


