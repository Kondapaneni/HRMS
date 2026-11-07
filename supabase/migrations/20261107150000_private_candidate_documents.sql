-- Candidate KYC documents are private and are served through authenticated PHP APIs.
-- Keep all other bucket visibility unchanged until their individual workflows are migrated.
BEGIN;

UPDATE storage.buckets
SET public = FALSE
WHERE id = 'candidate_documents';

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
        'training_videos'::text,
        'loan_documents'::text,
        'loan_signatures'::text
    ])
);

DROP POLICY IF EXISTS "Admins can manage candidate docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage non-attendance storage objects" ON storage.objects;
CREATE POLICY "Authenticated users can manage non-private storage objects"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id NOT IN ('attendance', 'candidate_documents'))
WITH CHECK (bucket_id NOT IN ('attendance', 'candidate_documents'));

COMMIT;
