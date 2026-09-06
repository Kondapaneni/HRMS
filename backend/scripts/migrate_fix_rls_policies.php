<?php
require_once __DIR__ . '/../src/Database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();

    echo "Applying complete RLS security and performance optimizations...\n";

    $sql = "
    -- 1. Move extensions to extensions schema to resolve Extension in Public
    CREATE SCHEMA IF NOT EXISTS extensions;
    DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
            ALTER EXTENSION pg_trgm SET SCHEMA extensions;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
            ALTER EXTENSION vector SET SCHEMA extensions;
        END IF;
    END $$;

    -- 2. Create covering indexes for foreign keys
    CREATE INDEX IF NOT EXISTS idx_application_timeline_application_id ON public.application_timeline(application_id);
    CREATE INDEX IF NOT EXISTS idx_application_timeline_updated_by ON public.application_timeline(updated_by);
    CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON public.applications(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_punches_employee_id ON public.attendance_punches(\"employeeId\");
    CREATE INDEX IF NOT EXISTS idx_candidate_documents_candidate_id ON public.candidate_documents(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_leaves_approved_by ON public.leaves(\"approvedBy\");
    CREATE INDEX IF NOT EXISTS idx_training_videos_created_by ON public.training_videos(created_by);

    -- 3. Drop duplicate indexes
    DROP INDEX IF EXISTS public.attendance_employeeid_idx;
    DROP INDEX IF EXISTS public.idx_attendance_emp_date;
    DROP INDEX IF EXISTS public.attendance_date_idx;
    DROP INDEX IF EXISTS public.audit_logs_timestamp_idx;
    DROP INDEX IF EXISTS public.employee_branch_idx;
    DROP INDEX IF EXISTS public.leaves_employeeid_idx;
    DROP INDEX IF EXISTS public.leaves_status_idx;

    -- 4. Create scoped RLS policies with subquery evaluation (resolves auth_rls_initplan)
    DO $$
    DECLARE
        t text;
        tables text[] := ARRAY[
            'assessment_attempts',
            'assessments',
            'assets',
            'attendance',
            'attendance_punches',
            'branches',
            'company_holidays',
            'department_question_bank',
            'employee',
            'employee_training_progress',
            'expenses',
            'geofences',
            'global_settings',
            'leave_balances',
            'leaves',
            'loan_application_audit_logs',
            'loan_applications',
            'loan_documents',
            'loan_leads',
            'payslips',
            'rate_limits',
            'sale_leads',
            'shift_times',
            'training_videos',
            'user_feature_access',
            'users'
        ];
    BEGIN
        FOREACH t IN ARRAY tables LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Allow all access to ' || t, t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Allow public all access to ' || t, t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Allow authenticated and service_role on ' || t, t);
            
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL TO authenticated, service_role USING ((((SELECT auth.jwt()) ->> ''sub''::text) IS NOT NULL) OR ((SELECT auth.role()) = ''service_role''::text)) WITH CHECK ((((SELECT auth.jwt()) ->> ''sub''::text) IS NOT NULL) OR ((SELECT auth.role()) = ''service_role''::text));',
                'Allow authenticated and service_role on ' || t,
                t
            );
        END LOOP;
    END $$;

    -- 5. Consolidated single policies for recruitment tables (resolves multiple_permissive_policies)
    DROP POLICY IF EXISTS \"Admins can manage application timeline\" ON public.application_timeline;
    DROP POLICY IF EXISTS \"Candidates can read their own timeline\" ON public.application_timeline;
    DROP POLICY IF EXISTS \"Allow authenticated and service_role on application_timeline\" ON public.application_timeline;
    DROP POLICY IF EXISTS \"auth_manage_timeline\" ON public.application_timeline;
    DROP POLICY IF EXISTS \"anon_read_own_timeline\" ON public.application_timeline;

    CREATE POLICY \"auth_manage_timeline\" ON public.application_timeline
    FOR ALL TO authenticated, service_role
    USING ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text))
    WITH CHECK ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text));

    CREATE POLICY \"anon_read_own_timeline\" ON public.application_timeline
    FOR SELECT TO anon
    USING (application_id IN (
        SELECT applications.id FROM applications 
        WHERE applications.candidate_id = (((SELECT auth.jwt()) ->> 'sub'::text))::uuid
    ));

    DROP POLICY IF EXISTS \"Admins can manage applications\" ON public.applications;
    DROP POLICY IF EXISTS \"Candidates can manage their own applications\" ON public.applications;
    DROP POLICY IF EXISTS \"Allow authenticated and service_role on applications\" ON public.applications;
    DROP POLICY IF EXISTS \"auth_manage_applications\" ON public.applications;
    DROP POLICY IF EXISTS \"anon_candidate_applications\" ON public.applications;

    CREATE POLICY \"auth_manage_applications\" ON public.applications
    FOR ALL TO authenticated, service_role
    USING ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text))
    WITH CHECK ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text));

    CREATE POLICY \"anon_candidate_applications\" ON public.applications
    FOR ALL TO anon
    USING (candidate_id = (((SELECT auth.jwt()) ->> 'sub'::text))::uuid)
    WITH CHECK (candidate_id = (((SELECT auth.jwt()) ->> 'sub'::text))::uuid);

    DROP POLICY IF EXISTS \"Admins can delete docs db\" ON public.candidate_documents;
    DROP POLICY IF EXISTS \"Admins can manage candidate documents\" ON public.candidate_documents;
    DROP POLICY IF EXISTS \"Admins can read all docs db\" ON public.candidate_documents;
    DROP POLICY IF EXISTS \"Admins can update docs db\" ON public.candidate_documents;
    DROP POLICY IF EXISTS \"Candidates can manage their own documents\" ON public.candidate_documents;
    DROP POLICY IF EXISTS \"Candidates can read own docs db\" ON public.candidate_documents;
    DROP POLICY IF EXISTS \"Allow authenticated and service_role on candidate_documents\" ON public.candidate_documents;
    DROP POLICY IF EXISTS \"auth_manage_candidate_documents\" ON public.candidate_documents;
    DROP POLICY IF EXISTS \"anon_candidate_documents\" ON public.candidate_documents;

    CREATE POLICY \"auth_manage_candidate_documents\" ON public.candidate_documents
    FOR ALL TO authenticated, service_role
    USING ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text))
    WITH CHECK ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text));

    CREATE POLICY \"anon_candidate_documents\" ON public.candidate_documents
    FOR ALL TO anon
    USING (candidate_id = (((SELECT auth.jwt()) ->> 'sub'::text))::uuid)
    WITH CHECK (candidate_id = (((SELECT auth.jwt()) ->> 'sub'::text))::uuid);

    DROP POLICY IF EXISTS \"Admins can read all candidate profiles\" ON public.candidate_profiles;
    DROP POLICY IF EXISTS \"Candidates can manage their own profile\" ON public.candidate_profiles;
    DROP POLICY IF EXISTS \"Allow authenticated and service_role on candidate_profiles\" ON public.candidate_profiles;
    DROP POLICY IF EXISTS \"auth_manage_candidate_profiles\" ON public.candidate_profiles;
    DROP POLICY IF EXISTS \"anon_candidate_profiles\" ON public.candidate_profiles;

    CREATE POLICY \"auth_manage_candidate_profiles\" ON public.candidate_profiles
    FOR ALL TO authenticated, service_role
    USING ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text))
    WITH CHECK ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text));

    CREATE POLICY \"anon_candidate_profiles\" ON public.candidate_profiles
    FOR ALL TO anon
    USING (user_id = (((SELECT auth.jwt()) ->> 'sub'::text))::uuid)
    WITH CHECK (user_id = (((SELECT auth.jwt()) ->> 'sub'::text))::uuid);

    DROP POLICY IF EXISTS \"Admins can read email queue\" ON public.email_queue;
    DROP POLICY IF EXISTS \"Authenticated users can queue emails\" ON public.email_queue;
    DROP POLICY IF EXISTS \"Allow authenticated and service_role on email_queue\" ON public.email_queue;
    DROP POLICY IF EXISTS \"auth_manage_email_queue\" ON public.email_queue;

    CREATE POLICY \"auth_manage_email_queue\" ON public.email_queue
    FOR ALL TO authenticated, service_role
    USING ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text))
    WITH CHECK ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text));

    DROP POLICY IF EXISTS \"Admins can manage jobs\" ON public.jobs;
    DROP POLICY IF EXISTS \"Anyone can read published jobs\" ON public.jobs;
    DROP POLICY IF EXISTS \"Allow authenticated and service_role on jobs\" ON public.jobs;
    DROP POLICY IF EXISTS \"auth_manage_jobs\" ON public.jobs;
    DROP POLICY IF EXISTS \"anon_read_published_jobs\" ON public.jobs;

    CREATE POLICY \"auth_manage_jobs\" ON public.jobs
    FOR ALL TO authenticated, service_role
    USING ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text))
    WITH CHECK ((((SELECT auth.jwt()) ->> 'sub'::text) IS NOT NULL) OR ((SELECT auth.role()) = 'service_role'::text));

    CREATE POLICY \"anon_read_published_jobs\" ON public.jobs
    FOR SELECT TO anon
    USING (status = 'Published');

    -- 6. Storage policies
    DROP POLICY IF EXISTS \"Authenticated users and service role can manage storage objects\" ON storage.objects;
    CREATE POLICY \"Authenticated users and service role can manage storage objects\"
    ON storage.objects
    FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

    DROP POLICY IF EXISTS \"Anon can upload candidate resumes and documents\" ON storage.objects;
    CREATE POLICY \"Anon can upload candidate resumes and documents\"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (bucket_id IN ('resumes', 'candidate_documents'));

    -- 7. Fix mutable search_path on public functions
    ALTER FUNCTION public.enforce_direct_chat_two_participants() SET search_path = public, pg_temp;
    ALTER FUNCTION public.jsonb_diff_val(jsonb, jsonb) SET search_path = public, pg_temp;
    ALTER FUNCTION public.process_audit_log() SET search_path = public, pg_temp;
    ALTER FUNCTION public.daily_attendance_master() SET search_path = public, pg_temp;
    ALTER FUNCTION public.update_assets_updated_at_column() SET search_path = public, pg_temp;
    ALTER FUNCTION public.insert_weekend_holiday_attendance() SET search_path = public, pg_temp;
    ALTER FUNCTION public.finalize_attendance() SET search_path = public, pg_temp;

    -- 8. Restrict EXECUTE on internal security definer trigger functions
    REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM anon, authenticated, public;
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;
    ";

    $conn->exec($sql);
    echo "All database security & performance advisor optimizations applied successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
