-- SEC-018 Phase A: MANUAL REVIEW-ONLY MIGRATION. DO NOT APPLY to live Supabase.
-- Exact current 38-table role-level RLS compatibility; NOT per-user/branch RLS.
-- The PostgreSQL login stays NOLOGIN until separately approved credentials
-- and an explicit development-only rollout. No passwords are embedded here.
-- Rollback requires prior owner-reviewed backup and coordinated login revert.

BEGIN;
DO $sec018$
DECLARE
 actual text[];
 expected text[];
BEGIN
 SELECT array_agg(c.relname::text ORDER BY c.relname::text COLLATE "C") INTO actual
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r';
 SELECT array_agg(v ORDER BY v COLLATE "C") INTO expected
 FROM unnest(ARRAY['application_timeline', 'applications', 'assessment_attempts', 'assessments', 'assets', 'attendance', 'attendance_punches', 'audit_logs', 'branches', 'candidate_documents', 'candidate_profiles', 'company_holidays', 'department_question_bank', 'email_queue', 'employee', 'employee_training_progress', 'expenses', 'geofences', 'global_settings', 'hrms_refresh_sessions', 'jobs', 'leave_balances', 'leaves', 'loan_application_audit_logs', 'loan_applications', 'loan_documents', 'loan_leads', 'mfa_backup_codes', 'mfa_secrets', 'origination_activities', 'payslips', 'portal_item_reads', 'rate_limits', 'sale_leads', 'shift_times', 'training_videos', 'user_feature_access', 'users']::text[]) v;
 IF actual IS DISTINCT FROM expected THEN
     RAISE EXCEPTION 'SEC-018: public table inventory changed: abort and re-review permissions';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public')
 THEN RAISE EXCEPTION 'SEC-018: preexisting public policies require manual review'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles
           WHERE rolname IN ('hrms_runtime_restricted','hrms_audit_verifier','hrms_audit_executor'))
 THEN RAISE EXCEPTION 'SEC-018: role already exists; no implicit overwrite'; END IF;
 IF EXISTS(
   SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity
 ) THEN RAISE EXCEPTION 'SEC-018: expected RLS enabled on all application tables'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='hrms_refresh_sessions'
    AND c.relrowsecurity AND c.relforcerowsecurity
 ) THEN RAISE EXCEPTION 'SEC-018: expected FORCE RLS on refresh sessions'; END IF;
 IF EXISTS (
   SELECT 1 FROM pg_catalog.aclexplode(
     COALESCE((SELECT nspacl FROM pg_catalog.pg_namespace WHERE nspname='public'),
       pg_catalog.acldefault('n', (SELECT nspowner FROM pg_catalog.pg_namespace WHERE nspname='public')))
   ) a WHERE a.grantee=0 AND a.privilege_type='CREATE'
 ) THEN RAISE EXCEPTION 'SEC-018: PUBLIC can CREATE in schema public; role would not be restricted'; END IF;
END $sec018$;

CREATE ROLE hrms_runtime_restricted NOLOGIN NOSUPERUSER NOCREATEDB
    NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
GRANT USAGE ON SCHEMA public TO hrms_runtime_restricted;
DO $sec018$ BEGIN
 EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
 EXECUTE format('GRANT CONNECT ON DATABASE %I TO hrms_runtime_restricted', current_database());
END $sec018$;

ALTER TABLE public.hrms_refresh_sessions
 ADD COLUMN used_token_hashes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Prevent ambient PUBLIC grants from defeating the explicit role ACL.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE CREATE ON SCHEMA public FROM anon, authenticated;

-- Existing postgres cron and service_role email-worker grants are retained.
-- The HTTP backend cannot update/delete queued delivery jobs.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Explicit table-by-table DML; do not issue GRANT ALL ON ALL TABLES.
-- Backend PHP RBAC remains the authorization boundary in this compatibility
-- phase. A role-specific USING(true) is not independent per-user/branch RLS.
GRANT SELECT, INSERT ON TABLE public.application_timeline TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.application_timeline FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.application_timeline FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.applications TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.applications FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.applications FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.applications FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assessment_attempts TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.assessment_attempts FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.assessment_attempts FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.assessment_attempts FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.assessment_attempts FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assessments TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.assessments FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.assessments FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.assessments FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.assessments FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assets TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.assets FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.assets FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.assets FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.assets FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attendance TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.attendance FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.attendance FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.attendance FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.attendance FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT ON TABLE public.attendance_punches TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.attendance_punches FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.attendance_punches FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);

GRANT SELECT ON TABLE public.audit_logs TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.audit_logs FOR SELECT TO hrms_runtime_restricted USING (true);

GRANT SELECT ON TABLE public.branches TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.branches FOR SELECT TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.candidate_documents TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.candidate_documents FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.candidate_documents FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.candidate_documents FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.candidate_documents FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.candidate_profiles TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.candidate_profiles FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.candidate_profiles FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.candidate_profiles FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.company_holidays TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.company_holidays FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.company_holidays FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.company_holidays FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.department_question_bank TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.department_question_bank FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.department_question_bank FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.department_question_bank FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.department_question_bank FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT ON TABLE public.email_queue TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.email_queue FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.email_queue FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.employee TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.employee FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.employee FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.employee FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.employee_training_progress TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.employee_training_progress FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.employee_training_progress FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.employee_training_progress FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.expenses FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.expenses FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.expenses FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.expenses FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.geofences TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.geofences FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.geofences FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.geofences FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.geofences FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.global_settings TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.global_settings FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.global_settings FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.global_settings FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.hrms_refresh_sessions TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.hrms_refresh_sessions FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.hrms_refresh_sessions FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.hrms_refresh_sessions FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.jobs TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.jobs FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.jobs FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.jobs FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.leave_balances TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.leave_balances FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.leave_balances FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.leave_balances FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leaves TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.leaves FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.leaves FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.leaves FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.leaves FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT ON TABLE public.loan_application_audit_logs TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.loan_application_audit_logs FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.loan_application_audit_logs FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.loan_applications TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.loan_applications FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.loan_applications FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.loan_applications FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.loan_applications FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, DELETE ON TABLE public.loan_documents TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.loan_documents FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.loan_documents FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.loan_documents FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.loan_leads TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.loan_leads FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.loan_leads FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.loan_leads FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mfa_backup_codes TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.mfa_backup_codes FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.mfa_backup_codes FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.mfa_backup_codes FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.mfa_backup_codes FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mfa_secrets TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.mfa_secrets FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.mfa_secrets FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.mfa_secrets FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.mfa_secrets FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.origination_activities TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.origination_activities FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.origination_activities FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.origination_activities FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON TABLE public.payslips TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.payslips FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.payslips FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.payslips FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.portal_item_reads TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.portal_item_reads FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.portal_item_reads FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.portal_item_reads FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON TABLE public.rate_limits TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.rate_limits FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.rate_limits FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.rate_limits FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.sale_leads TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.sale_leads FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.sale_leads FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.sale_leads FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_times TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.shift_times FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.shift_times FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.shift_times FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.shift_times FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.training_videos TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.training_videos FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.training_videos FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.training_videos FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);
CREATE POLICY sec018_runtime_d ON public.training_videos FOR DELETE TO hrms_runtime_restricted USING (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.user_feature_access TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.user_feature_access FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.user_feature_access FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.user_feature_access FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO hrms_runtime_restricted;
CREATE POLICY sec018_runtime_s ON public.users FOR SELECT TO hrms_runtime_restricted USING (true);
CREATE POLICY sec018_runtime_i ON public.users FOR INSERT TO hrms_runtime_restricted WITH CHECK (true);
CREATE POLICY sec018_runtime_u ON public.users FOR UPDATE TO hrms_runtime_restricted USING (true) WITH CHECK (true);

-- Three known nextval defaults: global_settings, geofences, shift_times.
-- UUID default columns do not require sequence access.
GRANT USAGE ON SEQUENCE public.global_settings_id_seq,
    public.geofences_id_seq, public.shift_times_id_seq
    TO hrms_runtime_restricted;

-- Defer LOGIN/password enablement and worker privileges to a separate,
-- explicit owner-approved rollout. No ALTER ROLE LOGIN is issued here.
COMMIT;
