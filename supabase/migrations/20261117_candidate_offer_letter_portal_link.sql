-- Candidate offer-letter portal linkage.
-- Every stored offer path is scoped to its application UUID; old records
-- remain NULL until a verified offer is generated and associated.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS offer_letter_path text;
DO $candidate_offer_guard$
DECLARE actual_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO actual_definition
  FROM pg_constraint
  WHERE conrelid = 'public.applications'::regclass
    AND conname = 'applications_offer_letter_path_scope_ck';
  IF actual_definition IS NULL THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_offer_letter_path_scope_ck
      CHECK (
        offer_letter_path IS NULL OR (
          offer_letter_path ~ '^[0-9a-f-]{36}/offer-[0-9a-f-]{36}-[0-9a-f]{32}\\.pdf$'
          AND split_part(offer_letter_path, '/', 1) = id::text
        )
      );
  END IF;
END
$candidate_offer_guard$;
COMMIT;
