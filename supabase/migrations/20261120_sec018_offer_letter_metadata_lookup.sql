-- SEC-018 / SEC-015: Offer-letter linking must work with the restricted
-- runtime role without granting that role read access to all Storage metadata.
-- Database writes, Supabase Storage RLS, signed audit context, and existing
-- application authorization remain unchanged.
BEGIN;

DO $precondition$
BEGIN
  IF to_regnamespace('hrms_security') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hrms_runtime_restricted')
  THEN
    RAISE EXCEPTION 'SEC-018 runtime role / private schema not installed';
  END IF;
  IF to_regprocedure('hrms_security.offer_letter_object_exists(uuid,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'SEC-018 offer-letter metadata helper already exists: review before replacing';
  END IF;
END;
$precondition$;

-- SECURITY DEFINER executes as the migration's privileged database owner;
-- this is the only Storage metadata operation exposed to the runtime role.
-- The helper returns one boolean for an existing application's precisely
-- scoped, generated, immutable PDF path. It accepts no arbitrary bucket or
-- public URL and cannot enumerate object names.
CREATE FUNCTION hrms_security.offer_letter_object_exists(
  p_application_id uuid,
  p_path text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $offer$
  SELECT EXISTS (
    SELECT 1
    FROM storage.objects AS o
    JOIN public.applications AS a ON a.id = p_application_id
    WHERE o.bucket_id = 'offer_letters'
      AND o.name = p_path
      AND o.name ~ (
        '^' || p_application_id::text ||
        '/offer-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{32}[.]pdf$'
      )
  );
$offer$;

-- PostgreSQL grants EXECUTE to PUBLIC by default. Revoke it in the same
-- transaction; neither anon nor authenticated nor service_role needs it.
REVOKE ALL ON FUNCTION hrms_security.offer_letter_object_exists(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms_security.offer_letter_object_exists(uuid,text)
  TO hrms_runtime_restricted;

COMMENT ON FUNCTION hrms_security.offer_letter_object_exists(uuid,text)
  IS 'Private SEC-018 boolean-only offer PDF existence check for HRMS restricted DB role';

COMMIT;
