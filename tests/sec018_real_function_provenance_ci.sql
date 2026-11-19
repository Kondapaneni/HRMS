-- SEC-018: REAL function-provenance compatibility exercise, in disposable CI ONLY.
-- The RLS function body is a reviewed, secret-free copy of the owner's
-- Acme HRMS DEV routines on 2026-11-16. No private URLs, secrets or data.
-- The function is installed only on the CI fixture, never on Supabase.
-- Keep SQL test independent from application CI and genuine backup claims.

-- The ACL-only RLS function is replaced without changing its signature or
-- reverting the SEC-018 restricted EXECUTE grants.
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;
-- The real DEV event-trigger registration is called ensure_rls.
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end EXECUTE FUNCTION public.rls_auto_enable();

DO $sec018$
DECLARE
  v_rls boolean;
BEGIN
  SELECT c.relrowsecurity INTO v_rls
  FROM pg_catalog.pg_class c WHERE c.oid = 'public.users'::regclass;
  IF v_rls IS DISTINCT FROM true THEN RAISE EXCEPTION 'RLS on users changed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_event_trigger e JOIN pg_catalog.pg_proc p ON p.oid=e.evtfoid
    WHERE e.evtname='ensure_rls' AND e.evtenabled='O'
      AND p.oid='public.rls_auto_enable()'::regprocedure
  ) THEN RAISE EXCEPTION 'real ensure_rls registration not installed'; END IF;
END
$sec018$;

-- Prove the REAL event function enforces RLS for a brand-new public table.
CREATE TABLE public.sec018_event_probe (id integer);
DO $sec018$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class
                WHERE oid='public.sec018_event_probe'::regclass AND relrowsecurity)
 THEN RAISE EXCEPTION 'real RLS event hook failed to protect new public table'; END IF;
END $sec018$;
DROP TABLE public.sec018_event_probe;

DO $sec018$
BEGIN
 IF has_function_privilege('anon','public.rls_auto_enable()','EXECUTE')
    OR has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE')
    OR has_function_privilege('hrms_runtime_restricted','public.rls_auto_enable()','EXECUTE')
 THEN RAISE EXCEPTION 'unexpected permission to execute a privileged real routine'; END IF;
 IF (SELECT COUNT(*) FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r')<>38
 THEN RAISE EXCEPTION 'application schema changed after temporary function tests'; END IF;
END $sec018$;

SELECT 'SEC-018 REAL ROUTINE AND EVENT HOOK CI PASS' AS result;
