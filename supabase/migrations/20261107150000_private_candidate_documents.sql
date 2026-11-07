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

-- Remove the legacy anonymous upload path. Candidate uploads must pass through
-- the authenticated PHP endpoint so MIME, size, ownership, and path checks cannot
-- be bypassed with the public anon key.
DROP POLICY IF EXISTS "Anon can upload candidate resumes and documents" ON storage.objects;

DROP POLICY IF EXISTS "Admins can manage candidate docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage non-attendance storage objects" ON storage.objects;
CREATE POLICY "Authenticated users can manage non-private storage objects"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id NOT IN ('attendance', 'candidate_documents'))
WITH CHECK (bucket_id NOT IN ('attendance', 'candidate_documents'));

COMMIT;
