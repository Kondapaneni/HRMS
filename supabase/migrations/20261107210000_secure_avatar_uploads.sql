-- Avatar objects remain publicly readable through the public bucket URL for
-- profile display compatibility, but browser clients must not upload, replace,
-- delete, or list avatar objects. All avatar writes now use authenticated PHP
-- endpoints and the server-only Supabase service-role key.

BEGIN;

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

COMMIT;
