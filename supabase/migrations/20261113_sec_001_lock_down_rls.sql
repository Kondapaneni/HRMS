-- SEC-001: Deploy backend and frontend and verify all Storage flows BEFORE applying.
-- This file is not executed by the Git push; live database remains unchanged.
BEGIN;
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT schemaname,tablename,policyname
    FROM pg_policies WHERE schemaname = 'public'
      AND roles::text[] && ARRAY['anon','authenticated','public']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',item.policyname,item.schemaname,item.tablename);
  END LOOP;
END $$;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon,authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon,authenticated;
-- The existing Storage policies contain FOR ALL TO public, allowing writes and deletes.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects',item.policyname);
  END LOOP;
END $$;
REVOKE INSERT,UPDATE,DELETE ON storage.objects FROM PUBLIC,anon,authenticated;
COMMIT;
