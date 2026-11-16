-- SEC-018 Phase A: REVIEW-ONLY signed audit verifier and trigger owner.
-- Do not apply to Supabase until owner approves a coordinated, reversible
-- DEV maintenance rollout with the previous migration and new PHP setting.
-- No private key material is stored in Git. A separate secured operator step
-- must provision the SAME randomly generated 256-bit secret into the private
-- database table and Render SEC018_AUDIT_HMAC_KEY; never use JWT_SECRET.
-- The runtime feature SEC018_AUDIT_CONTEXT_ENABLED stays OFF until ready.

BEGIN;
DO $guard$
BEGIN
 IF current_user <> 'postgres'
 THEN RAISE EXCEPTION 'SEC-018: expected reviewed postgres migration owner'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
    WHERE e.extname='pgcrypto' AND n.nspname='extensions')
 THEN RAISE EXCEPTION 'SEC-018: expected pgcrypto in extensions schema'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE p.proname='process_audit_log' AND n.nspname='public' AND p.prosecdef)
 THEN RAISE EXCEPTION 'SEC-018: audit trigger function missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='hrms_runtime_restricted')
 THEN RAISE EXCEPTION 'SEC-018: reviewed role migration must be applied first'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('hrms_audit_verifier','hrms_audit_executor'))
 THEN RAISE EXCEPTION 'SEC-018: audit roles already exist'; END IF;
END $guard$;

CREATE ROLE hrms_audit_verifier NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
 NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE ROLE hrms_audit_executor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
 NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE SCHEMA sec018_internal;
REVOKE ALL ON SCHEMA sec018_internal FROM PUBLIC;
CREATE TABLE sec018_internal.audit_keys (
 kid text PRIMARY KEY,
 key_hex text NOT NULL CHECK (key_hex ~ '^[a-f0-9]{64}$')
);
REVOKE ALL ON sec018_internal.audit_keys FROM PUBLIC;
GRANT USAGE ON SCHEMA sec018_internal TO hrms_audit_verifier, hrms_audit_executor;
GRANT SELECT ON sec018_internal.audit_keys TO hrms_audit_verifier;
GRANT USAGE ON SCHEMA public, extensions TO hrms_audit_verifier;
GRANT SELECT ON public.users TO hrms_audit_verifier;
GRANT USAGE ON SCHEMA public TO hrms_audit_executor;
GRANT SELECT ON public.users, public.employee TO hrms_audit_executor;
GRANT INSERT ON public.audit_logs TO hrms_audit_executor;
GRANT EXECUTE ON FUNCTION public.jsonb_diff_val(jsonb,jsonb) TO hrms_audit_executor;

-- Database RLS still applies to dedicated NOLOGIN SECURITY DEFINER owners:
CREATE POLICY sec018_audit_verifier_select ON public.users
 FOR SELECT TO hrms_audit_verifier USING (true);
CREATE POLICY sec018_audit_executor_select ON public.users
 FOR SELECT TO hrms_audit_executor USING (true);
CREATE POLICY sec018_audit_employee_select ON public.employee
 FOR SELECT TO hrms_audit_executor USING (true);
CREATE POLICY sec018_audit_insert ON public.audit_logs
 FOR INSERT TO hrms_audit_executor WITH CHECK (true);

-- Temporarily allow owner-changing inside this single atomic migration.
GRANT hrms_audit_verifier, hrms_audit_executor TO postgres;
GRANT CREATE ON SCHEMA sec018_internal TO hrms_audit_verifier;
GRANT CREATE ON SCHEMA public TO hrms_audit_executor;

CREATE FUNCTION sec018_internal.verified_audit_actor() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $secure$
DECLARE
 payload text := pg_catalog.current_setting('sec018.audit_payload',true);
 mac text := pg_catalog.current_setting('sec018.audit_mac',true);
 raw jsonb;
 secret_hex text;
 expected text;
 actor record;
 txid text;
 issued bigint;
 expires bigint;
 now_epoch bigint;
 i integer;
 diff integer := 0;
BEGIN
 IF payload IS NULL OR length(payload) > 2048 OR mac IS NULL
    OR mac !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
 BEGIN raw := payload::jsonb; EXCEPTION WHEN OTHERS THEN RETURN NULL; END;
 IF jsonb_typeof(raw)<>'object'
    OR raw->>'v'<>'1'
    OR (raw->>'uid') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    OR (raw->>'tv') !~ '^[0-9]{1,9}$'
    OR (raw->>'txid') !~ '^[0-9]{1,20}$'
    OR (raw->>'iat') !~ '^[0-9]{1,12}$'
    OR (raw->>'exp') !~ '^[0-9]{1,12}$'
    OR (raw->>'sid') !~ '^[a-f0-9]{32}$'
    OR length(COALESCE(raw->>'ip','')) > 60
    OR length(COALESCE(raw->>'ua','')) > 250 THEN RETURN NULL; END IF;
 txid := pg_catalog.txid_current_if_assigned()::text;
 IF txid IS NULL OR txid <> raw->>'txid' THEN RETURN NULL; END IF;
 issued:=(raw->>'iat')::bigint;
 expires:=(raw->>'exp')::bigint;
 now_epoch:=pg_catalog.date_part('epoch',pg_catalog.clock_timestamp())::bigint;
 IF issued>now_epoch+5 OR expires<=now_epoch
    OR expires<=issued OR expires-issued>60 THEN RETURN NULL; END IF;
 SELECT k.key_hex INTO secret_hex FROM sec018_internal.audit_keys k
 WHERE k.kid='v1';
 IF NOT FOUND THEN RETURN NULL; END IF;
 expected:=pg_catalog.encode(extensions.hmac(
    pg_catalog.convert_to(payload,'UTF8'),
    pg_catalog.decode(secret_hex,'hex'),'sha256'),'hex');
 FOR i IN 1..64 LOOP
    diff:=diff | (pg_catalog.ascii(pg_catalog.substr(expected,i,1))
               # pg_catalog.ascii(pg_catalog.substr(mac,i,1)));
 END LOOP;
 IF diff<>0 THEN RETURN NULL; END IF;
 SELECT u.role,u."isActive",u.token_version,u."firstName",u."lastName"
 INTO actor FROM public.users u WHERE u.id=(raw->>'uid')::uuid;
 IF NOT FOUND OR actor."isActive" IS DISTINCT FROM true
    OR actor.token_version <> (raw->>'tv')::integer THEN RETURN NULL; END IF;
 RETURN pg_catalog.jsonb_build_object(
   'uid',raw->>'uid',
   'name',COALESCE(actor."firstName",'') || ' ' || COALESCE(actor."lastName",''),
   'role',actor.role,
   'ip',raw->>'ip','ua',raw->>'ua','sid',raw->>'sid');
END;
$secure$;

REVOKE ALL ON FUNCTION sec018_internal.verified_audit_actor() FROM PUBLIC;
ALTER FUNCTION sec018_internal.verified_audit_actor() OWNER TO hrms_audit_verifier;
GRANT EXECUTE ON FUNCTION sec018_internal.verified_audit_actor()
 TO hrms_audit_executor;

-- The original trigger semantics (row diffs, employee lookup, audit columns)
-- are kept, but legacy session GUC attribution is replaced by verified HMAC.

CREATE OR REPLACE FUNCTION public.process_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
    audit_ctx JSONB;
    app_uid VARCHAR;
    app_uemail VARCHAR;
    app_urole VARCHAR;
    app_ip VARCHAR;
    app_ua VARCHAR;
    app_sid VARCHAR;
    
    target_emp_id VARCHAR := NULL;
    target_emp_name VARCHAR := NULL;
    
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
    v_changed JSONB := NULL;
    
    mod_name VARCHAR := TG_TABLE_NAME;
    rec_id VARCHAR;
BEGIN
    -- ONLY the signed, transaction-bound context may supply actor identity.
    -- Missing context on public/pre-auth operations means "unknown actor",
    -- never a caller-selected app.current_user_id from a session GUC.
    audit_ctx := sec018_internal.verified_audit_actor();
    IF NULLIF(current_setting('sec018.audit_payload', true), '') IS NOT NULL
       AND audit_ctx IS NULL THEN
        RAISE EXCEPTION 'Invalid signed audit context' USING ERRCODE = '28000';
    END IF;
    app_uid := audit_ctx->>'uid';
    app_uemail := audit_ctx->>'name';
    app_urole := audit_ctx->>'role';
    app_ip := audit_ctx->>'ip';
    app_ua := audit_ctx->>'ua';
    app_sid := audit_ctx->>'sid';

    -- Lookup actor name if we have app_uid
    IF app_uid IS NOT NULL THEN
        BEGIN
            EXECUTE 'SELECT "firstName" || '' '' || "lastName" FROM public.users WHERE id = $1'
            INTO app_uemail
            USING app_uid::UUID;
        EXCEPTION WHEN OTHERS THEN
            -- fallback to email if lookup fails
            NULL;
        END;
    END IF;

    -- Generate JSON representations first to avoid static record field errors
    IF TG_OP = 'INSERT' THEN
        v_new_data := row_to_json(NEW)::JSONB;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := row_to_json(OLD)::JSONB;
        v_new_data := row_to_json(NEW)::JSONB;
        v_changed := public.jsonb_diff_val(v_old_data, v_new_data);
        
        -- Do not log if nothing actually changed
        IF v_changed = '{}'::JSONB THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_old_data := row_to_json(OLD)::JSONB;
    END IF;

    -- Determine record ID and Target Employee ID based on Table
    IF TG_TABLE_NAME = 'users' THEN
        mod_name := 'Employee / User Settings';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := rec_id;
        target_emp_name := COALESCE(v_new_data->>'firstName', v_old_data->>'firstName') || ' ' || COALESCE(v_new_data->>'lastName', v_old_data->>'lastName');
    ELSIF TG_TABLE_NAME = 'employee' THEN
        mod_name := 'Employee Work Information';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := COALESCE(v_new_data->>'userId', v_old_data->>'userId');
    ELSIF TG_TABLE_NAME = 'attendance' THEN
        mod_name := 'Attendance Regularization';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := COALESCE(v_new_data->>'employeeId', v_old_data->>'employeeId');
    ELSIF TG_TABLE_NAME = 'leaves' THEN
        mod_name := 'Leave Management';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := COALESCE(v_new_data->>'employeeId', v_old_data->>'employeeId');
    ELSIF TG_TABLE_NAME = 'user_feature_access' THEN
        mod_name := 'Feature Access Roles';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := COALESCE(v_new_data->>'userId', v_old_data->>'userId');
    ELSIF TG_TABLE_NAME = 'payslips' THEN
        mod_name := 'Payroll Management';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        target_emp_id := COALESCE(v_new_data->>'employeeId', v_old_data->>'employeeId');
    ELSIF TG_TABLE_NAME = 'assets' THEN
        mod_name := 'Assets Management';
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
        BEGIN
            EXECUTE 'SELECT "userId" FROM public.employee WHERE id = $1'
            INTO target_emp_id
            USING COALESCE(v_new_data->>'assigned_to', v_old_data->>'assigned_to')::UUID;
        EXCEPTION WHEN OTHERS THEN
            target_emp_id := NULL;
        END;
    ELSE
        rec_id := COALESCE(v_new_data->>'id', v_old_data->>'id');
    END IF;

    -- Lookup target employee name if we have target_emp_id but not name
    IF target_emp_id IS NOT NULL AND target_emp_name IS NULL THEN
        BEGIN
            EXECUTE 'SELECT "firstName" || '' '' || "lastName" FROM public.users WHERE id = $1'
            INTO target_emp_name
            USING target_emp_id::UUID;
        EXCEPTION WHEN OTHERS THEN
            target_emp_name := NULL;
        END;
    END IF;

    INSERT INTO public.audit_logs (
        module_name, entity_type, entity_id, action_type,
        actor_user_id, actor_name, actor_role,
        target_employee_id, target_employee_name,
        previous_values, new_values, changed_fields,
        ip_address, browser_information, session_id
    ) VALUES (
        mod_name, TG_TABLE_NAME, rec_id, TG_OP,
        app_uid, app_uemail, app_urole,
        target_emp_id, target_emp_name,
        v_old_data, v_new_data, v_changed,
        app_ip, app_ua, app_sid
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.process_audit_log() FROM PUBLIC;
ALTER FUNCTION public.process_audit_log() OWNER TO hrms_audit_executor;

-- Do not leave temporary CREATE or role membership privileges behind.
REVOKE CREATE ON SCHEMA sec018_internal FROM hrms_audit_verifier;
REVOKE CREATE ON SCHEMA public FROM hrms_audit_executor;
REVOKE hrms_audit_verifier, hrms_audit_executor FROM postgres;
COMMIT;
