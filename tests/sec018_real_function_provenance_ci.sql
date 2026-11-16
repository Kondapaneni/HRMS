-- SEC-018: REAL function-provenance compatibility exercise, in disposable CI ONLY.
-- Both function bodies are a reviewed, secret-free copy of the owner's
-- Acme HRMS DEV routines on 2026-11-16. No private URLs, secrets or data.
-- The functions are installed only on the CI fixture, never on Supabase.
-- Keep SQL test independent from application CI and genuine backup claims.

-- The ACL-only fixture functions are replaced without changing signatures or
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
CREATE OR REPLACE FUNCTION public.enforce_direct_chat_two_participants()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    chat_type TEXT;
    participant_count INTEGER;
BEGIN
    SELECT type INTO chat_type FROM chats WHERE id = NEW.chat_id;
    IF chat_type = 'direct' THEN
        SELECT COUNT(*) INTO participant_count FROM chat_participants WHERE chat_id = NEW.chat_id;
        IF participant_count > 2 THEN
            RAISE EXCEPTION 'direct chats cannot have more than 2 participants';
        END IF;
    END IF;
    RETURN NEW;
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
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid='public.enforce_direct_chat_two_participants()'::regprocedure
      AND p.prorettype='pg_catalog.trigger'::regtype AND NOT p.prosecdef
  ) THEN RAISE EXCEPTION 'direct chat enforcement function metadata differs'; END IF;
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

-- Exercise the real direct-chat routine on synthetic TEMP tables. Actual
-- development database has NO persistent row trigger attached to this routine;
-- the synthetic probe verifies its condition without modifying the app schema.
CREATE TEMP TABLE chats (id uuid PRIMARY KEY, type text NOT NULL);
CREATE TEMP TABLE chat_participants(chat_id uuid, user_id uuid);
CREATE TRIGGER sec018_chat_limit AFTER INSERT ON chat_participants
FOR EACH ROW EXECUTE FUNCTION public.enforce_direct_chat_two_participants();

INSERT INTO chats(id,type) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','direct');
INSERT INTO chat_participants(chat_id,user_id) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222');
DO $sec018$
DECLARE
  blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO chat_participants(chat_id,user_id)
    VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%more than 2 participants%' THEN RAISE; END IF;
    blocked := true;
  END;
  IF NOT blocked OR (SELECT COUNT(*) FROM chat_participants)<>2 THEN
    RAISE EXCEPTION 'real direct chat function did not reject a third participant';
  END IF;
END $sec018$;

DO $sec018$
BEGIN
 IF has_function_privilege('anon','public.rls_auto_enable()','EXECUTE')
    OR has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE')
    OR has_function_privilege('hrms_runtime_restricted','public.rls_auto_enable()','EXECUTE')
    OR has_function_privilege('anon','public.enforce_direct_chat_two_participants()','EXECUTE')
    OR has_function_privilege('authenticated','public.enforce_direct_chat_two_participants()','EXECUTE')
    OR has_function_privilege('hrms_runtime_restricted','public.enforce_direct_chat_two_participants()','EXECUTE')
 THEN RAISE EXCEPTION 'unexpected permission to execute a privileged real routine'; END IF;
 IF (SELECT COUNT(*) FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r')<>38
 THEN RAISE EXCEPTION 'application schema changed after temporary function tests'; END IF;
END $sec018$;

SELECT 'SEC-018 REAL ROUTINE AND EVENT HOOK CI PASS' AS result;
