-- Enable Row Level Security (RLS) for Multi-Tenancy
-- This script sets up RLS policies to automatically filter all queries by school_id
-- Run this after creating all tables: docker exec -i erp-postgres psql -U erp_user -d school_erp < scripts/enable-rls.sql

-- Enable RLS on all tables that have school_id
DO $$
DECLARE
    table_record RECORD;
    tables_with_school_id TEXT[] := ARRAY[
        'students', 'staff', 'classes', 'subjects', 'attendances', 
        'fees', 'exams', 'exam_results', 'timetables', 'transport_routes',
        'calendar_events', 'inventory_items', 'library_books', 
        'library_transactions', 'notifications'
    ];
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = ANY(tables_with_school_id)
    LOOP
        -- Enable RLS on the table
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.tablename);
        
        -- Create policy that filters by school_id from session variable
        EXECUTE format('
            DROP POLICY IF EXISTS school_id_policy ON %I;
            CREATE POLICY school_id_policy ON %I
                FOR ALL
                USING (school_id = current_setting(''app.school_id'', true)::uuid)
                WITH CHECK (school_id = current_setting(''app.school_id'', true)::uuid);
        ', table_record.tablename, table_record.tablename);
        
        RAISE NOTICE 'RLS enabled and policy created for table: %', table_record.tablename;
    END LOOP;
END $$;

-- For tables that reference school_id through relationships (like exam_results through exams)
-- We need additional policies for exam_results
DO $$
BEGIN
    -- Enable RLS on exam_results (it doesn't have school_id directly, but through exam)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'exam_results' AND schemaname = 'public') THEN
        ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
        
        -- Policy for exam_results: filter by school_id through the exam relationship
        DROP POLICY IF EXISTS exam_results_school_policy ON exam_results;
        CREATE POLICY exam_results_school_policy ON exam_results
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM exams 
                    WHERE exams.id = exam_results.exam_id 
                    AND exams.school_id = current_setting('app.school_id', true)::uuid
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM exams 
                    WHERE exams.id = exam_results.exam_id 
                    AND exams.school_id = current_setting('app.school_id', true)::uuid
                )
            );
        
        RAISE NOTICE 'RLS enabled and policy created for exam_results';
    END IF;
END $$;

-- Create a function to set school_id context (helper for application code)
CREATE OR REPLACE FUNCTION set_school_context(school_uuid UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.school_id', school_uuid::text, false);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_school_context(UUID) TO erp_user;

-- Verify RLS is enabled
DO $$
BEGIN
    RAISE NOTICE 'Verifying RLS setup...';
END $$;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('students', 'staff', 'classes', 'attendances', 'fees', 'exams', 'subjects', 'timetables')
ORDER BY tablename;

-- Show all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

DO $$
BEGIN
    RAISE NOTICE 'RLS setup complete!';
    RAISE NOTICE 'To use RLS, set school_id context before queries:';
    RAISE NOTICE '  SELECT set_config(''app.school_id'', ''<uuid>'', false);';
    RAISE NOTICE 'Or use the helper function:';
    RAISE NOTICE '  SELECT set_school_context(''<uuid>'');';
END $$;

