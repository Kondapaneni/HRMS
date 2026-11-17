-- SEC-003: apply ONLY AFTER the authenticated PHP file proxy is live and
-- receipt, avatar, attendance, candidate and loan document downloads are tested.
-- Public job descriptions, holiday art and app-build binaries are intentionally
-- unaffected. This changes bucket visibility; it does not delete any file.
BEGIN;
UPDATE storage.buckets SET public = false
WHERE id IN (
  'resumes', 'offer_letters', 'avatars', 'attendance',
  'candidate_documents', 'expenses', 'loan_documents',
  'loan_signatures', 'training_videos'
);
DO $$
BEGIN
  IF (SELECT count(*) FROM storage.buckets WHERE id IN (
    'resumes', 'offer_letters', 'avatars', 'attendance',
    'candidate_documents', 'expenses', 'loan_documents',
    'loan_signatures', 'training_videos'
  ) AND public = false) <> 9 THEN
    RAISE EXCEPTION 'SEC-003 expected nine private HRMS buckets; aborting';
  END IF;
END $$;
COMMIT;
