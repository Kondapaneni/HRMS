-- SEC-019: reviewed, schema-only integrity hardening.
-- Apply only in a separately approved migration window, never as part of a
-- data-reset command. Does not delete or rewrite any existing HRMS records.
-- Existing audit/document identity gaps are documented separately; do not
-- cast legacy varchar actor IDs to UUID or change all cascades blindly.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $sec019_preflight$
BEGIN
  IF to_regclass('public.users') IS NULL OR to_regclass('public.employee') IS NULL
     OR to_regclass('public.attendance') IS NULL OR to_regclass('public.payslips') IS NULL
     OR to_regclass('public.leaves') IS NULL
     OR to_regclass('public.loan_applications') IS NULL
     OR to_regclass('public.loan_application_audit_logs') IS NULL THEN
    RAISE EXCEPTION 'SEC-019 required HRMS table missing; aborting';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.employee'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%"employeeId"%'
  ) THEN
    RAISE EXCEPTION 'SEC-019 employee code UNIQUE constraint not found';
  END IF;
END
$sec019_preflight$;

-- Financial/timekeeping history must not vanish as a side effect of deleting
-- a public.users account. These are confirmed legacy CASCADE constraints.
ALTER TABLE public.payslips DROP CONSTRAINT "payslips_employeeId_fkey";
ALTER TABLE public.payslips ADD CONSTRAINT "payslips_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE public.attendance DROP CONSTRAINT "attendance_employeeId_fkey";
ALTER TABLE public.attendance ADD CONSTRAINT "attendance_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE public.leaves DROP CONSTRAINT "leaves_employeeId_fkey";
ALTER TABLE public.leaves ADD CONSTRAINT "leaves_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES public.users(id) ON DELETE RESTRICT;

-- Loan audit rows already have two references to the corresponding
-- application and an optional editor user. Keep historical audit rows
-- attached; no silent cascade or SET NULL when an account is removed.
ALTER TABLE public.loan_application_audit_logs
  ADD CONSTRAINT sec019_loan_audit_app_code_fkey
  FOREIGN KEY (application_id) REFERENCES public.loan_applications(application_id)
  ON DELETE RESTRICT;
ALTER TABLE public.loan_application_audit_logs
  ADD CONSTRAINT sec019_loan_audit_app_uuid_fkey
  FOREIGN KEY (loan_application_id) REFERENCES public.loan_applications(id)
  ON DELETE RESTRICT;
ALTER TABLE public.loan_application_audit_logs
  ADD CONSTRAINT sec019_loan_audit_editor_fkey
  FOREIGN KEY (editor_user_id) REFERENCES public.users(id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS sec019_loan_audit_app_code_idx
  ON public.loan_application_audit_logs(application_id);
CREATE INDEX IF NOT EXISTS sec019_loan_audit_app_uuid_idx
  ON public.loan_application_audit_logs(loan_application_id);
CREATE INDEX IF NOT EXISTS sec019_loan_audit_editor_idx
  ON public.loan_application_audit_logs(editor_user_id);

COMMIT;
