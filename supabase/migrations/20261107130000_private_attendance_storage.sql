-- Make attendance photos private after the application has moved attendance uploads
-- and reads through the authenticated PHP API. The service-role key remains server-side.
BEGIN;

UPDATE storage.buckets
SET public = FALSE
WHERE id = 'attendance';

-- Remove attendance from the broad anonymous policy while preserving the existing
-- public-bucket behavior for the other buckets until their workflows are migrated.
DROP POLICY IF EXISTS "Allow anon upload and access to storage buckets" ON storage.objects;
CREATE POLICY "Allow anon upload and access to storage buckets"
ON storage.objects
FOR ALL
TO public
USING (
    bucket_id = ANY (ARRAY[
        'avatars'::text,
        'expenses'::text,
        'holidays'::text,
        'resumes'::text,
        'offer_letters'::text,
        'job_descriptions'::text,
        'candidate_documents'::text,
        'training_videos'::text,
        'loan_documents'::text,
        'loan_signatures'::text
    ])
)
WITH CHECK (
    bucket_id = ANY (ARRAY[
        'avatars'::text,
        'expenses'::text,
        'holidays'::text,
        'resumes'::text,
        'offer_letters'::text,
        'job_descriptions'::text,
        'candidate_documents'::text,
        'training_videos'::text,
        'loan_documents'::text,
        'loan_signatures'::text
    ])
);

-- Supabase Auth users must not gain broad access to the now-private attendance
-- bucket. The PHP backend accesses it with the service-role key, which bypasses RLS.
DROP POLICY IF EXISTS "Authenticated users and service role can manage storage objects" ON storage.objects;
CREATE POLICY "Authenticated users can manage non-attendance storage objects"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id <> 'attendance')
WITH CHECK (bucket_id <> 'attendance');

COMMIT;
