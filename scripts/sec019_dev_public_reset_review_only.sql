-- SEC-019 OWNER-APPROVED DEV RESET (REVIEW ONLY; NEVER A MIGRATION).
-- Only run AFTER Storage API cleanup is independently verified and all
-- Render app/tracker/email writers have been stopped. This permanently deletes
-- ALL records from 38 public HRMS tables, including the one Admin account,
-- and invalidates login sessions. A new Admin bootstrap is then required.
-- DO NOT apply from CI or automatically at application startup.
--
-- Safety latch: operator must set application_name to the exact approved
-- string within the same database session before executing this file.
-- DO NOT inline or remove the latch.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $sec019_reset_preflight$
DECLARE actual text[];
DECLARE expected text[];
BEGIN
 IF current_setting('application_name', true)
       IS DISTINCT FROM 'SEC019_DEV_RESET_APPROVED_jtgqkkhqyzfbupiqwkgf'
 THEN
   RAISE EXCEPTION 'SEC-019 reset is NOT approved in this database session';
 END IF;
 SELECT array_agg(tablename::text ORDER BY tablename::text)
 INTO actual FROM pg_catalog.pg_tables WHERE schemaname='public';
 SELECT array_agg(table_name ORDER BY table_name)
 INTO expected FROM unnest(ARRAY[
  'application_timeline','applications','assessment_attempts','assessments',
  'assets','attendance','attendance_punches','audit_logs','branches',
  'candidate_documents','candidate_profiles','company_holidays',
  'department_question_bank','email_queue','employee','employee_training_progress',
  'expenses','geofences','global_settings','hrms_refresh_sessions','jobs',
  'leave_balances','leaves','loan_application_audit_logs','loan_applications',
  'loan_documents','loan_leads','mfa_backup_codes','mfa_secrets',
  'origination_activities','payslips','portal_item_reads','rate_limits',
  'sale_leads','shift_times','training_videos','user_feature_access','users'
 ]::text[]) table_name;
 IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'SEC-019 public schema inventory changed; stop and review';
 END IF;
 IF (SELECT count(*) FROM storage.objects) <> 0 THEN
    RAISE EXCEPTION 'SEC-019 Storage objects not empty; use Storage API first';
 END IF;
 IF EXISTS(
   SELECT 1 FROM pg_constraint
   WHERE contype='f'
     AND confrelid IN(
       SELECT c.oid FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
       WHERE n.nspname='public' AND c.relkind='r'
     )
     AND connamespace <> 'public'::regnamespace
 ) THEN
    RAISE EXCEPTION 'SEC-019 private schema has FK into public; review manually';
 END IF;
END
$sec019_reset_preflight$;

-- Intentionally no CASCADE. If dependencies changed, the reset must fail.
TRUNCATE TABLE
 public.application_timeline,public.applications,
 public.assessment_attempts,public.assessments,public.assets,
 public.attendance,public.attendance_punches,public.audit_logs,
 public.branches,public.candidate_documents,public.candidate_profiles,
 public.company_holidays,public.department_question_bank,
 public.email_queue,public.employee,public.employee_training_progress,
 public.expenses,public.geofences,public.global_settings,
 public.hrms_refresh_sessions,public.jobs,public.leave_balances,
 public.leaves,public.loan_application_audit_logs,public.loan_applications,
 public.loan_documents,public.loan_leads,public.mfa_backup_codes,
 public.mfa_secrets,public.origination_activities,public.payslips,
 public.portal_item_reads,public.rate_limits,public.sale_leads,
 public.shift_times,public.training_videos,public.user_feature_access,
 public.users
 RESTART IDENTITY;
COMMIT;
-- Storage buckets/permissions, migrations, auth service infrastructure,
-- extensions, roles and SEC-018 protected internal/recovery schemas remain.
