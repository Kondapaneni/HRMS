-- Avatar objects remain publicly readable through the public bucket URL for
-- profile display compatibility, but browser clients must not upload, replace,
-- delete, or list avatar objects. All avatar writes now use authenticated PHP
-- endpoints and the server-only Supabase service-role key.

BEGIN;

DROP POLICY IF EXISTS "Allow anon upload and access to storage buckets" ON storage.objects;
CREATE POLICY "Public can read public asset storage objects"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id IN ('avatars', 'holidays', 'job_descriptions', 'training_videos'));

DROP POLICY IF EXISTS "Authenticated users can manage non-private storage objects" ON storage.objects;
CREATE POLICY "Authenticated users can manage non-private storage objects"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id NOT IN (
        'avatars', 'attendance', 'candidate_documents', 'resumes', 'expenses',
        'offer_letters', 'loan_documents', 'loan_signatures',
        'holidays', 'job_descriptions', 'training_videos', 'app_builds'
    )
)
WITH CHECK (
    bucket_id NOT IN (
        'avatars', 'attendance', 'candidate_documents', 'resumes', 'expenses',
        'offer_letters', 'loan_documents', 'loan_signatures',
        'holidays', 'job_descriptions', 'training_videos', 'app_builds'
    )
);

COMMIT;
