-- Expense receipts contain employee financial information. All current upload and
-- preview flows now use authenticated PHP endpoints with per-expense ownership checks.
BEGIN;

UPDATE storage.buckets
SET public = FALSE
WHERE id = 'expenses';

DROP POLICY IF EXISTS "Allow anon upload and access to storage buckets" ON storage.objects;
CREATE POLICY "Allow anon upload and access to storage buckets"
ON storage.objects
FOR ALL
TO public
USING (
    bucket_id = ANY (ARRAY[
        'avatars'::text,
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
USING (bucket_id NOT IN ('attendance', 'candidate_documents', 'resumes', 'expenses'))
WITH CHECK (bucket_id NOT IN ('attendance', 'candidate_documents', 'resumes', 'expenses'));

COMMIT;
