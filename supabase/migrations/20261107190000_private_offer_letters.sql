-- Offer letters are confidential candidate employment records. They are stored
-- under candidate-scoped random object paths and served only after application ownership checks.
BEGIN;

CREATE TABLE IF NOT EXISTS public.candidate_offer_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT candidate_offer_letters_storage_path_nonempty CHECK (length(trim(storage_path)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_candidate_offer_letters_candidate_id
    ON public.candidate_offer_letters(candidate_id);

ALTER TABLE public.candidate_offer_letters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.candidate_offer_letters FROM anon, authenticated;

-- Backfill legacy root-level files only when a filename resolves to exactly one
-- user and exactly one hired, selected, or converted application.
WITH matched_legacy AS (
    SELECT
        o.name AS object_name,
        MIN(u.id::text)::uuid AS candidate_id,
        MIN(a.id::text)::uuid AS application_id,
        COUNT(DISTINCT u.id) AS matching_users,
        COUNT(DISTINCT a.id) AS matching_applications,
        MIN(o.created_at) AS created_at
    FROM storage.objects o
    JOIN public.users u
      ON lower(o.name) = lower(
          regexp_replace(trim(coalesce(u."firstName", '')), '[[:space:]]+', '-', 'g')
          || '-'
          || regexp_replace(trim(coalesce(u."lastName", '')), '[[:space:]]+', '-', 'g')
          || '.pdf'
      )
    JOIN public.applications a
      ON a.candidate_id = u.id
     AND a.status IN ('Hired', 'Selected', 'Converted to Employee')
    WHERE o.bucket_id = 'offer_letters'
      AND o.name !~ '/'
      AND o.name <> '.emptyFolderPlaceholder'
    GROUP BY o.name
)
INSERT INTO public.candidate_offer_letters
    (application_id, candidate_id, storage_path, file_name, uploaded_by, created_at)
SELECT application_id, candidate_id, object_name, object_name, NULL, created_at
FROM matched_legacy
WHERE matching_users = 1 AND matching_applications = 1
ON CONFLICT DO NOTHING;

UPDATE storage.buckets
SET public = FALSE
WHERE id = 'offer_letters';

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
        'training_videos'::text,
        'loan_documents'::text,
        'loan_signatures'::text
    ])
)
WITH CHECK (
    bucket_id = ANY (ARRAY[
        'avatars'::text,
        'holidays'::text,
        'job_descriptions'::text,
        'training_videos'::text,
        'loan_documents'::text,
        'loan_signatures'::text
    ])
);

-- Remove the original unrestricted authenticated/service-role policy as well.
-- The service role bypasses RLS; authenticated clients must not inherit broad access.
DROP POLICY IF EXISTS "Authenticated users and service role can manage storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage candidate docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage non-private storage objects" ON storage.objects;
CREATE POLICY "Authenticated users can manage non-private storage objects"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id NOT IN ('attendance', 'candidate_documents', 'resumes', 'expenses', 'offer_letters'))
WITH CHECK (bucket_id NOT IN ('attendance', 'candidate_documents', 'resumes', 'expenses', 'offer_letters'));

COMMIT;
