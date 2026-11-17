\set ON_ERROR_STOP on
DO $sec019_assert$
DECLARE blocked boolean;
BEGIN
  -- Prove legacy employee codes/data are untouched.
  IF NOT EXISTS (SELECT 1 FROM public.employee WHERE "employeeId"='EMP-LEGACY') THEN
    RAISE EXCEPTION 'SEC-019 changed legacy employee code';
  END IF;
  blocked := false;
  BEGIN
    DELETE FROM public.users WHERE id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN foreign_key_violation THEN
    blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'SEC-019 allowed user history cascade'; END IF;
  blocked := false;
  BEGIN
    DELETE FROM public.loan_applications WHERE id='66666666-6666-4666-8666-666666666666';
  EXCEPTION WHEN foreign_key_violation THEN
    blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'SEC-019 allowed loan audit cascade/orphan'; END IF;
  blocked := false;
  BEGIN
    INSERT INTO public.loan_application_audit_logs(id,application_id)
    VALUES ('88888888-8888-4888-8888-888888888888','LN-NONEXISTENT');
  EXCEPTION WHEN foreign_key_violation THEN
    blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'SEC-019 allowed orphan loan audit'; END IF;
  IF (SELECT count(*) FROM public.payslips) <> 1
     OR (SELECT count(*) FROM public.attendance) <> 1
     OR (SELECT count(*) FROM public.leaves) <> 1
     OR (SELECT count(*) FROM public.loan_application_audit_logs) <> 1 THEN
    RAISE EXCEPTION 'SEC-019 destroyed historical fixture rows';
  END IF;
  IF (SELECT count(*) FROM pg_constraint
      WHERE conrelid IN ('public.payslips'::regclass,'public.attendance'::regclass,'public.leaves'::regclass)
        AND contype='f' AND confdeltype='r') <> 3 THEN
    RAISE EXCEPTION 'SEC-019 history RESTRICT rules missing';
  END IF;
  INSERT INTO public.loan_applications(id, application_id)
    VALUES ('99999999-9999-4999-8999-999999999999', NULL);
  INSERT INTO public.loan_application_audit_logs(id, application_id, loan_application_id)
    VALUES ('88888888-8888-4888-8888-888888888888',
            '99999999-9999-4999-8999-999999999999', '99999999-9999-4999-8999-999999999999');
  UPDATE public.loan_applications SET application_id = 'LN-ISSUED'
    WHERE id = '99999999-9999-4999-8999-999999999999';
  blocked := false;
  BEGIN
    INSERT INTO public.loan_application_audit_logs(id, application_id, loan_application_id)
      VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              'LN-EXISTING', '99999999-9999-4999-8999-999999999999');
  EXCEPTION WHEN foreign_key_violation THEN
    blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'SEC-019 allowed different loan identities in one audit row'; END IF;
  RAISE NOTICE 'SEC-019 constraint and retention tests PASS';
END
$sec019_assert$;
