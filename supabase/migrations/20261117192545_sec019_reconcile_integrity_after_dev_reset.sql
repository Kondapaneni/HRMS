-- SEC-019: schema-only integrity hardening, safe on both an unpatched
-- database and the owner-approved DEV database where the exact DDL was
-- previously applied without a recorded migration. Existing unrelated
-- constraints and data must not be silently overwritten.
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

-- Replace only the three known legacy ON DELETE CASCADE FKs, but leave the
-- exact already-hardened ON DELETE RESTRICT definitions untouched.
DO $sec019_history_fks$
DECLARE row_ record;
        found_definition text;
        expected_definition text :=
  'FOREIGN KEY ("employeeId") REFERENCES users(id) ON DELETE RESTRICT';
        previous_definition text :=
  'FOREIGN KEY ("employeeId") REFERENCES users(id) ON DELETE CASCADE';
BEGIN
  FOR row_ IN
    SELECT * FROM (VALUES
      ('payslips', 'payslips_employeeId_fkey'),
      ('attendance', 'attendance_employeeId_fkey'),
      ('leaves', 'leaves_employeeId_fkey')
    ) AS item(table_name, constraint_name)
  LOOP
    SELECT pg_get_constraintdef(c.oid) INTO found_definition
      FROM pg_constraint c
      WHERE c.conrelid = format('public.%I', row_.table_name)::regclass
        AND c.conname = row_.constraint_name AND c.contype = 'f';
    IF found_definition IS NULL THEN
      RAISE EXCEPTION 'SEC-019 expected existing FK missing: %', row_.constraint_name;
    ELSIF found_definition = expected_definition THEN
      CONTINUE;
    ELSIF found_definition <> previous_definition THEN
      RAISE EXCEPTION 'SEC-019 unexpected FK definition for %: %',
        row_.constraint_name, found_definition;
    END IF;
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I',
      row_.table_name, row_.constraint_name);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY ("employeeId") REFERENCES public.users(id) ON DELETE RESTRICT',
      row_.table_name, row_.constraint_name);
  END LOOP;
END
$sec019_history_fks$;

-- Draft audit writers use UUID fallback until a business code exists.
ALTER TABLE public.loan_application_audit_logs
  ADD COLUMN IF NOT EXISTS sec019_application_code text
  GENERATED ALWAYS AS (NULLIF(application_id, loan_application_id::text)) STORED;

DO $sec019_generated_guard$
DECLARE actual_expression text;
        actual_generation char;
BEGIN
  SELECT a.attgenerated, pg_get_expr(d.adbin, d.adrelid)
    INTO actual_generation, actual_expression
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE n.nspname = 'public' AND c.relname = 'loan_application_audit_logs'
    AND a.attname = 'sec019_application_code' AND NOT a.attisdropped;
  IF actual_generation IS DISTINCT FROM 's'
     OR actual_expression IS DISTINCT FROM
       'NULLIF((application_id)::text, (loan_application_id)::text)' THEN
    RAISE EXCEPTION 'SEC-019 generated column definition differs from approved schema';
  END IF;
END
$sec019_generated_guard$;

DO $sec019_identity_constraint$
DECLARE actual_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO actual_definition
    FROM pg_constraint WHERE conrelid = 'public.loan_applications'::regclass
    AND conname = 'sec019_loan_application_identity_key';
  IF actual_definition IS NULL THEN
    ALTER TABLE public.loan_applications
      ADD CONSTRAINT sec019_loan_application_identity_key UNIQUE (application_id, id);
  ELSIF actual_definition <> 'UNIQUE (application_id, id)' THEN
    RAISE EXCEPTION 'SEC-019 application identity UNIQUE definition differs: %', actual_definition;
  END IF;
END
$sec019_identity_constraint$;

-- Existing audit relationship constraints must match the approved definition;
-- add missing ones without replacing any unrelated or conflicting constraint.
DO $sec019_audit_fks$
DECLARE row_ record;
        actual_definition text;
BEGIN
  FOR row_ IN
    SELECT * FROM (VALUES
      ('sec019_loan_audit_app_code_fkey',
       'FOREIGN KEY (sec019_application_code) REFERENCES public.loan_applications(application_id) ON DELETE RESTRICT',
       'FOREIGN KEY (sec019_application_code) REFERENCES loan_applications(application_id) ON DELETE RESTRICT'),
      ('sec019_loan_audit_app_identity_fkey',
       'FOREIGN KEY (sec019_application_code, loan_application_id) REFERENCES public.loan_applications(application_id, id) ON DELETE RESTRICT',
       'FOREIGN KEY (sec019_application_code, loan_application_id) REFERENCES loan_applications(application_id, id) ON DELETE RESTRICT'),
      ('sec019_loan_audit_app_uuid_fkey',
       'FOREIGN KEY (loan_application_id) REFERENCES public.loan_applications(id) ON DELETE RESTRICT',
       'FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id) ON DELETE RESTRICT'),
      ('sec019_loan_audit_editor_fkey',
       'FOREIGN KEY (editor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT',
       'FOREIGN KEY (editor_user_id) REFERENCES users(id) ON DELETE RESTRICT')
    ) AS item(constraint_name, add_definition, expected_definition)
  LOOP
    SELECT pg_get_constraintdef(c.oid) INTO actual_definition
      FROM pg_constraint c
      WHERE c.conrelid = 'public.loan_application_audit_logs'::regclass
        AND c.conname = row_.constraint_name;
    IF actual_definition IS NULL THEN
      EXECUTE format('ALTER TABLE public.loan_application_audit_logs ADD CONSTRAINT %I %s',
        row_.constraint_name, row_.add_definition);
    ELSIF actual_definition <> row_.expected_definition THEN
      RAISE EXCEPTION 'SEC-019 loan audit FK definition differs for %: %',
        row_.constraint_name, actual_definition;
    END IF;
  END LOOP;
END
$sec019_audit_fks$;

CREATE INDEX IF NOT EXISTS sec019_loan_audit_app_code_idx
  ON public.loan_application_audit_logs(sec019_application_code, loan_application_id);
CREATE INDEX IF NOT EXISTS sec019_loan_audit_app_uuid_idx
  ON public.loan_application_audit_logs(loan_application_id);
CREATE INDEX IF NOT EXISTS sec019_loan_audit_editor_idx
  ON public.loan_application_audit_logs(editor_user_id);

COMMIT;
