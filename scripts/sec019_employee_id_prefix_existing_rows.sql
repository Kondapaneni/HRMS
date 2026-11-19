-- SEC-019 follow-up: store the complete EMP-XXXXXXXX employee code in PostgreSQL.
-- Target: ACTIVE Singapore HRMS development database only, after preflight review.
-- The legacy frontend already displays EMP-XXXXXXXX stored codes unchanged.
--
-- Scope deliberately limited to employee."employeeId" and numeric-only 8-digit codes.
-- UUIDs, payroll/leave/attendance foreign keys, and legacy arbitrary codes stay intact.
-- The migration is idempotent and aborts if any destination code already exists.
-- Run within a short approved maintenance/write-free window; inspect audit logs.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $employee_prefix$
DECLARE
  old_rows integer;
  updated_rows integer;
BEGIN
  SELECT COUNT(*) INTO old_rows
  FROM public.employee
  WHERE "employeeId" ~ '^[1-9][0-9]{7}$';

  IF EXISTS (
    SELECT 1
    FROM public.employee source
    JOIN public.employee target
      ON target."employeeId" = 'EMP-' || source."employeeId"
    WHERE source."employeeId" ~ '^[1-9][0-9]{7}$'
  ) THEN
    RAISE EXCEPTION 'Employee ID prefix migration has a code collision; nothing changed';
  END IF;

  UPDATE public.employee
  SET "employeeId" = 'EMP-' || "employeeId"
  WHERE "employeeId" ~ '^[1-9][0-9]{7}$';

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows <> old_rows THEN
    RAISE EXCEPTION 'Employee ID prefix migration row mismatch';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.employee
    WHERE "employeeId" ~ '^[1-9][0-9]{7}$'
  ) THEN
    RAISE EXCEPTION 'Unprefixed eight-digit employee IDs remain';
  END IF;

  RAISE NOTICE 'Stored EMP- prefix applied to % existing employees (zero on safe re-run)', updated_rows;
END;
$employee_prefix$;
COMMIT;
