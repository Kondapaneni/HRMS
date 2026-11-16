-- SEC-018 CI fixture — disposable PostgreSQL 16 only, NOT a migration.
-- Invoked by GitHub Actions after strict environment checks. No real data.
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE TABLE public.users (
 id uuid PRIMARY KEY, email text NOT NULL, role text NOT NULL,
 "firstName" text, "lastName" text, "isActive" boolean NOT NULL,
 token_version integer NOT NULL DEFAULT 0
);
CREATE TABLE public.application_timeline (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.applications (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.assessment_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.assessments (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.attendance (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.attendance_punches (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 module_name text, entity_type text, entity_id text, action_type text,
 actor_user_id text, actor_name text, actor_role text,
 target_employee_id text, target_employee_name text,
 previous_values jsonb, new_values jsonb, changed_fields jsonb,
 ip_address text, browser_information text, session_id text
);
CREATE TABLE public.branches (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.candidate_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.candidate_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.company_holidays (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.department_question_bank (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.email_queue (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.employee (
 id uuid PRIMARY KEY, "userId" uuid REFERENCES public.users(id),
 assigned_to uuid
);
CREATE TABLE public.employee_training_progress (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.expenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.geofences (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.global_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.hrms_refresh_sessions (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.users(id),
 token_hash char(64) NOT NULL, session_version integer NOT NULL,
 client_type text NOT NULL, expires_at timestamptz NOT NULL,
 revoked_at timestamptz, last_used_at timestamptz
);
CREATE TABLE public.jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.leave_balances (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.leaves (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.loan_application_audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.loan_applications (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.loan_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.loan_leads (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.mfa_backup_codes (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.mfa_secrets (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.origination_activities (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.payslips (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.portal_item_reads (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.rate_limits (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.sale_leads (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.shift_times (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.training_videos (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.user_feature_access (id uuid PRIMARY KEY DEFAULT gen_random_uuid());

ALTER TABLE public.application_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hrms_refresh_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_application_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.origination_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_item_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hrms_refresh_sessions FORCE ROW LEVEL SECURITY;
CREATE SEQUENCE public.global_settings_id_seq;
CREATE SEQUENCE public.geofences_id_seq;
CREATE SEQUENCE public.shift_times_id_seq;
CREATE OR REPLACE FUNCTION public.jsonb_diff_val(val1 jsonb,val2 jsonb) RETURNS jsonb
 LANGUAGE sql AS $body$
 SELECT CASE WHEN val1 IS NOT DISTINCT FROM val2 THEN '{}'::jsonb
             ELSE '{"modified":true}'::jsonb END
 $body$;
CREATE FUNCTION public.process_audit_log() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
 AS $body$ BEGIN RETURN COALESCE(NEW,OLD); END $body$;
CREATE TRIGGER sec018_users_audit AFTER UPDATE ON public.users
 FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
INSERT INTO public.users (id,email,role,"firstName","lastName","isActive",token_version)
VALUES
 ('11111111-1111-4111-8111-111111111111','alice@example.invalid','employee','Alice','Synthetic',true,1),
 ('22222222-2222-4222-8222-222222222222','bob@example.invalid','employee','Bob','Synthetic',true,1);
