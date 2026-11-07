-- Loan applicant photos and origination signatures are confidential records.
-- All new uploads use random application-scoped paths and are accessed through
-- authenticated PHP endpoints that verify loan ownership or branch access.
--
-- Read-only audit before this migration:
--   * 23 loan_documents rows mapped to an existing application and Storage object.
--   * 15 legacy metadata rows had neither a matching application nor an object.
--   * 5 signature references mapped to 5 objects under their application's UUID.
--   * 2 additional document objects had no matching metadata reference.
-- The unmatched metadata and orphan objects are retained, not deleted; making the
-- buckets private prevents public access while preserving the recoverable records.

BEGIN;

UPDATE storage.buckets
SET public = FALSE
WHERE id IN ('loan_documents', 'loan_signatures');

-- Preserve public access only for the remaining intentionally public buckets.
DROP POLICY IF EXISTS "Allow anon upload and access to storage buckets" ON storage.objects;
CREATE POLICY "Allow anon upload and access to storage buckets"
ON storage.objects
FOR ALL
TO public
USING (
    bucket_id = ANY (ARRAY[
        'avatars'::text,
        'holidays'::text,
        'job_descriptions'::text,
        'training_videos'::text
    ])
)
WITH CHECK (
    bucket_id = ANY (ARRAY[
        'avatars'::text,
        'holidays'::text,
        'job_descriptions'::text,
        'training_videos'::text
    ])
);

-- Remove the legacy unrestricted policy. The service role bypasses RLS and
-- remains usable by the backend; authenticated browser clients do not.
DROP POLICY IF EXISTS "Authenticated users and service role can manage storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage candidate docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage non-private storage objects" ON storage.objects;

CREATE POLICY "Authenticated users can manage non-private storage objects"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id NOT IN (
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
        'attendance',
        'candidate_documents',
        'resumes',
        'expenses',
        'offer_letters',
        'loan_documents',
        'loan_signatures'
    )
);

COMMIT;
