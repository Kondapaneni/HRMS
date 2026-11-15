-- SEC-018: One-time schema migration for an authorized schema owner.
-- Git pushes DO NOT execute this file. Runtime credentials must not have DDL.
BEGIN;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN DEFAULT false;
COMMIT;
