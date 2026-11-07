-- Loan applicant photos and origination signatures are confidential records.
-- All new uploads use random application-scoped paths and are accessed through
-- authenticated PHP endpoints that verify loan ownership or branch access.
--
-- app_builds is handled by a later migration and remains private until a release
-- distribution workflow is implemented.
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

-- The remaining public-facing assets (avatars, holiday posters, and job
-- descriptions) are uploaded through authenticated PHP endpoints using the
-- server-side service role. Training videos use signed upload/playback URLs and
-- therefore must remain private. app_builds is kept private by the later
-- 20261107230000_lock_unused_app_builds_bucket migration until a release workflow exists.
UPDATE storage.buckets
SET public = FALSE
WHERE id IN ('training_videos', 'attendance', 'candidate_documents', 'resumes',
             'expenses', 'offer_letters', 'loan_documents', 'loan_signatures');

-- Remove every broad legacy Storage policy. The backend service role bypasses
-- RLS; browser clients must not inherit unrestricted object access.
DROP POLICY IF EXISTS "Allow anon upload and access to storage buckets" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload and access to helpdesk" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users and service role can manage storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage non-private storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage candidate docs" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload candidate resumes and documents" ON storage.objects;

-- app_builds is intentionally public-read for download-by-known-URL only.
-- Public bucket URLs remain readable, but listing and all anonymous writes are denied.
DROP POLICY IF EXISTS "Public Access app_builds" ON storage.objects;
DROP POLICY IF EXISTS "Public Update app_builds" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload app_builds" ON storage.objects;
COMMIT;
