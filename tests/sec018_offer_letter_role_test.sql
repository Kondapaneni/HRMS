\set ON_ERROR_STOP on

-- Isolated synthetic database ONLY. Never run against the live HRMS database.
DO $guard$
BEGIN
  IF current_database() <> 'sec018_offer_test' THEN
    RAISE EXCEPTION 'Refusing to run outside isolated sec018_offer_test database';
  END IF;
END;
$guard$;

-- Synthetic tables and roles are installed by the CI workflow.
INSERT INTO public.applications(id) VALUES
 ('00000000-0000-4000-8000-00000000b503');
INSERT INTO storage.objects(bucket_id,name) VALUES
 ('offer_letters','00000000-0000-4000-8000-00000000b503/offer-12345678-1234-4123-8123-123456789abc-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf'),
 ('other_bucket','00000000-0000-4000-8000-00000000b503/offer-11111111-1234-4123-8123-123456789abc-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf');

DO $privileges$
BEGIN
 IF NOT has_function_privilege('hrms_runtime_restricted', 'hrms_security.offer_letter_object_exists(uuid,text)', 'EXECUTE')
   OR has_function_privilege('anon', 'hrms_security.offer_letter_object_exists(uuid,text)', 'EXECUTE')
   OR has_function_privilege('authenticated', 'hrms_security.offer_letter_object_exists(uuid,text)', 'EXECUTE')
   OR has_function_privilege('service_role', 'hrms_security.offer_letter_object_exists(uuid,text)', 'EXECUTE')
 THEN
   RAISE EXCEPTION 'Incorrect SEC-018 helper EXECUTE grants';
 END IF;
END;
$privileges$;

SET ROLE hrms_runtime_restricted;
DO $test$
DECLARE
 p text := '00000000-0000-4000-8000-00000000b503/offer-12345678-1234-4123-8123-123456789abc-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf';
BEGIN
 IF has_schema_privilege(current_user, 'storage', 'USAGE') THEN
   RAISE EXCEPTION 'Restricted runtime unexpectedly has Storage schema USAGE';
 END IF;
 -- Confirm a direct read fails, without granting access or leaking objects.
 BEGIN
   EXECUTE 'SELECT 1 FROM storage.objects LIMIT 1';
   RAISE EXCEPTION 'Restricted runtime unexpectedly read Storage metadata';
 EXCEPTION WHEN insufficient_privilege THEN
   NULL; -- Expected; only the scoped helper may inspect Storage.
 END;
 IF NOT hrms_security.offer_letter_object_exists('00000000-0000-4000-8000-00000000b503'::uuid,p) THEN
   RAISE EXCEPTION 'Existing application-scoped PDF must be visible through helper';
 END IF;
 IF hrms_security.offer_letter_object_exists('00000000-0000-4000-8000-00000000b504'::uuid,p)
    OR hrms_security.offer_letter_object_exists('00000000-0000-4000-8000-00000000b503'::uuid,
       '00000000-0000-4000-8000-00000000b503/offer-does-not-exist.pdf')
    OR hrms_security.offer_letter_object_exists('00000000-0000-4000-8000-00000000b503'::uuid,
       '00000000-0000-4000-8000-00000000b503/offer-11111111-1234-4123-8123-123456789abc-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf')
 THEN
   RAISE EXCEPTION 'Helper exposed a different application, invalid or non-offer object';
 END IF;
END;
$test$;
RESET ROLE;

SELECT 'PASS: SEC-018 restricted offer-letter helper grants, positive, negatives and Storage denial' AS result;
