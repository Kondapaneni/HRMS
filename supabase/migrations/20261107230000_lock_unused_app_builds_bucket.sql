-- app_builds has no active upload, download, or signed-URL workflow in the
-- application code. Keep the unused bucket private until a complete authenticated
-- release-distribution workflow is implemented.
BEGIN;

UPDATE storage.buckets
SET public = FALSE
WHERE id = 'app_builds';

-- Remove any legacy broad public policy if one was created with the old policy name.
DROP POLICY IF EXISTS "Allow anon upload and access to storage buckets" ON storage.objects;

-- The current public asset policy is read-only and limited to the assets that
-- are intentionally public (avatars, holidays, and job descriptions).
DROP POLICY IF EXISTS "Public can read public asset storage objects" ON storage.objects;
CREATE POLICY "Public can read public asset storage objects"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id IN ('avatars', 'holidays', 'job_descriptions'));

-- Browser clients must not manage objects in any private or public-asset bucket.
DROP POLICY IF EXISTS "Authenticated users can manage non-private storage objects" ON storage.objects;
CREATE POLICY "Authenticated users can manage non-private storage objects"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id NOT IN (
        'avatars',
        'attendance',
        'candidate_documents',
        'resumes',
        'expenses',
        'offer_letters',
        'loan_documents',
        'loan_signatures',
        'holidays',
        'job_descriptions',
        'training_videos',
        'app_builds'
    )
)
WITH CHECK (
    bucket_id NOT IN (
        'avatars',
        'attendance',
        'candidate_documents',
        'resumes',
        'expenses',
        'offer_letters',
        'loan_documents',
        'loan_signatures',
        'holidays',
        'job_descriptions',
        'training_videos',
        'app_builds'
    )
);

COMMIT;
