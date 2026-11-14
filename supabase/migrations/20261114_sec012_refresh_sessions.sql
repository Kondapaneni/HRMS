-- SEC-012: server-only refresh sessions. Commit first; DO NOT apply to live
-- until the coordinated secure-token/Android rollout has been approved.
BEGIN;
CREATE TABLE IF NOT EXISTS public.hrms_refresh_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash char(64) NOT NULL,
    session_version integer NOT NULL,
    client_type text NOT NULL CHECK (client_type IN ('web', 'android')),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    last_used_at timestamptz,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_hrms_refresh_sessions_user
    ON public.hrms_refresh_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_hrms_refresh_sessions_expiry
    ON public.hrms_refresh_sessions (expires_at);
ALTER TABLE public.hrms_refresh_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hrms_refresh_sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON public.hrms_refresh_sessions FROM PUBLIC, anon, authenticated;
COMMIT;
