-- SEC-002: The existing email_queue INSERT webhook sends the complete inserted row.
-- Give each queued message an unguessable, per-row delivery capability. The Edge
-- Function validates the capability against the database and sends DB-held content
-- only; no new Edge secret or webhook-header configuration is required.
-- Apply BEFORE deploying the updated send-email Edge Function.
BEGIN;
ALTER TABLE public.email_queue
  ADD COLUMN IF NOT EXISTS delivery_token uuid NOT NULL DEFAULT gen_random_uuid();
COMMENT ON COLUMN public.email_queue.delivery_token IS
  'SEC-002: server-generated one-time webhook capability; never expose to clients';
COMMIT;
