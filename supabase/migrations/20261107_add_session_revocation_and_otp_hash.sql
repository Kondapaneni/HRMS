-- Server-side JWT revocation and hashed OTP storage.
-- Apply this migration before deploying the matching PHP backend.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS session_version BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_code_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_users_reset_token_expiry
  ON public.users (reset_token, reset_token_expires)
  WHERE reset_token IS NOT NULL;
