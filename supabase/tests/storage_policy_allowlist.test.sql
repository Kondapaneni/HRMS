-- Run after applying 20261107240000_enforce_storage_policy_allowlist.sql.
-- This is a plain PostgreSQL regression check and does not require pgTAP.

DO $$
DECLARE
    policy_count INTEGER;
    public_read_count INTEGER;
    write_policy_count INTEGER;
    public_read_policy RECORD;
BEGIN
    SELECT COUNT(*)
    INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects';

    IF policy_count <> 1 THEN
        RAISE EXCEPTION
            'Expected exactly one storage.objects policy after allowlist migration; found %',
            policy_count;
    END IF;

    SELECT COUNT(*)
    INTO public_read_count
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can read public asset storage objects'
      AND cmd = 'SELECT'
      AND 'public' = ANY(roles)
      AND qual ILIKE '%avatars%'
      AND qual ILIKE '%holidays%'
      AND qual ILIKE '%job_descriptions%'
      AND with_check IS NULL;

    IF public_read_count <> 1 THEN
        RAISE EXCEPTION
            'Expected the single public-read allowlist policy for avatars, holidays, and job_descriptions';
    END IF;

    SELECT COUNT(*)
    INTO write_policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');

    IF write_policy_count <> 0 THEN
        RAISE EXCEPTION
            'Unexpected direct browser write policies remain on storage.objects: %',
            write_policy_count;
    END IF;
END
$$;
