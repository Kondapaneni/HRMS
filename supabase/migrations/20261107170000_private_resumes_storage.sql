-- Resume files contain personal information and are served through authenticated,
-- application-aware signed URL endpoints. Preserve the existing access rules for
-- every other bucket until its workflow has been migrated.
BEGIN;

UPDATE storage.buckets
SET public = FALSE
WHERE id = 'resumes';

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
        'offer_letters'::text,
        'job_descriptions'::text,
        'training_videos'::text,
        'loan_documents'::text,
        'loan_signatures'::text
    ])
);

DROP POLICY IF EXISTS "Authenticated users can manage non-private storage objects" ON storage.objects;
CREATE POLICY "Authenticated users can manage non-private storage objects"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id NOT IN ('attendance', 'candidate_documents', 'resumes'))
WITH CHECK (bucket_id NOT IN ('attendance', 'candidate_documents', 'resumes'));

COMMIT;
