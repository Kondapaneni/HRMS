\set ON_ERROR_STOP on

-- Synthetic PostgreSQL-only regression: a duplicate EMP-prefixed eight-digit database code
-- must not invalidate the surrounding transaction or alter an existing row.
DO $numeric_code_check$
DECLARE duplicate_row uuid;
DECLARE inserted_row uuid;
BEGIN
  INSERT INTO public.employee (id, "employeeId", "userId")
    VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'EMP-48392017',
            '11111111-1111-4111-8111-111111111111');

  INSERT INTO public.employee (id, "employeeId", "userId")
    VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'EMP-48392017',
            '11111111-1111-4111-8111-111111111111')
    ON CONFLICT ("employeeId") DO NOTHING
    RETURNING id INTO duplicate_row;

  IF duplicate_row IS NOT NULL THEN
    RAISE EXCEPTION 'EMP-prefixed code collision inserted an unwanted employee row';
  END IF;

  INSERT INTO public.employee (id, "employeeId", "userId")
    VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'EMP-48392018',
            '11111111-1111-4111-8111-111111111111')
    ON CONFLICT ("employeeId") DO NOTHING
    RETURNING id INTO inserted_row;

  IF inserted_row IS DISTINCT FROM 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
     OR (SELECT count(*) FROM public.employee WHERE "employeeId" IN ('EMP-48392017', 'EMP-48392018')) <> 2 THEN
    RAISE EXCEPTION 'EMP-prefixed employee code collision retry did not recover';
  END IF;
  RAISE NOTICE 'EMP-prefixed employee ID unique-constraint retry PASS';
END
$numeric_code_check$;
