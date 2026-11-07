-- Avatar images remain publicly viewable for profile cards and legacy image URLs,
-- but all avatar writes must go through the authenticated PHP upload endpoints.
-- This removes avatars from the broad anonymous/authenticated ALL policies.

BEGIN;

UPDATE storage.buckets
SET public = TRUE
WHERE id = 'avatars';

DROP POLICY IF EXISTS "Allow anon upload and access to storage buckets" ON storage.objects;
CREATE POLICY "Allow anon upload and access to storage buckets"
ON storage.objects
FOR ALL
TO public
USING (
    bucket_id = ANY (ARRAY[
        'holidays'::text,
        'job_descriptions'::text,
        'training_videos'::text
    ])
)
WITH CHECK (
    bucket_id = ANY (ARRAY[
        'holidays'::text,
        'job_descriptions'::text,
        'training_videos'::text
    ])
);

DROP POLICY IF EXISTS "Authenticated users and service role can manage storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage candidate docs" ON storage.objects;
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
        'loan_signatures'
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
        'loan_signatures'
    )
);

-- Keep avatar reads available to public profile/photo URLs. No INSERT, UPDATE,
-- or DELETE policy is granted for anon/authenticated clients on this bucket.
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
CREATE POLICY "Public can read avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

COMMIT;
