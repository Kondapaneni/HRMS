-- Keep intentionally public assets publicly readable but prevent anonymous or
-- authenticated browser clients from writing to them. Uploads are performed by
-- the PHP backend or a one-time signed training-video upload URL.
BEGIN;

UPDATE storage.buckets
SET public = TRUE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'avatars';

UPDATE storage.buckets
SET public = TRUE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf']::text[]
WHERE id = 'job_descriptions';

UPDATE storage.buckets
SET public = TRUE,
    file_size_limit = 524288000,
    allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime']::text[]
WHERE id = 'training_videos';

-- Holidays remain public-read only. Their existing file-size and MIME settings
-- are preserved because the app's complete holiday asset lifecycle is still
-- being audited.

COMMIT;
