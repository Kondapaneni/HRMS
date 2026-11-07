-- Replace legacy storage policies with a strict allowlist.
--
-- Earlier migrations removed only known legacy policy names. A separately
-- named broad policy (for example "public") could therefore survive and keep
-- granting anonymous/authenticated writes to every bucket. Drop every existing
-- policy on storage.objects, then recreate only the intended public-read rule.
--
-- All HRMS uploads/deletes now go through authenticated PHP endpoints using the
-- server-only service-role key. Training-video uploads use one-time signed URLs.
-- The service role bypasses RLS; browser anon/authenticated clients must not
-- write directly to any HRMS storage bucket.

BEGIN;

DO $$
DECLARE
    existing_policy RECORD;
BEGIN
    FOR existing_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON storage.objects',
            existing_policy.policyname
        );
    END LOOP;
END
$$;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read public asset storage objects"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id IN ('avatars', 'holidays', 'job_descriptions'));

COMMIT;
