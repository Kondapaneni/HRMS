#!/usr/bin/env bash
# SEC-018 Step 1G-2: negative migration guard checks in disposable CI ONLY.
# Do not run against Supabase, Render, a workstation database or real data.
set -euo pipefail

for v in GITHUB_ACTIONS DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD; do
  [[ -n "${!v:-}" ]] || { echo "REFUSED SEC-018 guard test: missing $v" >&2; exit 2; }
done
[[ "$GITHUB_ACTIONS" == "true" &&
   "$DB_HOST" == "127.0.0.1" &&
   "$DB_PORT" == "5432" &&
   "$DB_DATABASE" == "sec018_phasea_ci" &&
   "$DB_USERNAME" == "postgres" &&
   "$DB_PASSWORD" == "SEC018_PHASEA_CI_PG_ONLY" &&
   "${PGPASSWORD:-}" == "SEC018_PHASEA_CI_PG_ONLY" ]] ||
  { echo "REFUSED SEC-018 guard test: not the disposable CI instance" >&2; exit 2; }
for v in DATABASE_URL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_SECRET_KEY; do
  [[ -z "${!v:-}" ]] || { echo "REFUSED SEC-018 guard test: external configuration" >&2; exit 2; }
done

migration="supabase/review-only/20261116_sec018_runtime_role_review_only.sql"
[[ -f "$migration" && -f tests/sec018_phasea_schema_ci.sql ]] ||
  { echo "REFUSED SEC-018 guard test: expected repository fixture missing" >&2; exit 2; }
p=(psql -X -h 127.0.0.1 -p 5432 -U postgres -d sec018_phasea_ci -v ON_ERROR_STOP=1)
query() { "${p[@]}" -Atqc "$1"; }
sql() { "${p[@]}" -qc "$1"; }

assert_not_partially_applied() {
  local role_count col_count policy_count
  role_count="$(query "SELECT count(*) FROM pg_roles WHERE rolname IN ('hrms_runtime_restricted','hrms_audit_verifier','hrms_audit_executor')")"
  col_count="$(query "SELECT count(*) FROM pg_attribute WHERE attrelid='public.hrms_refresh_sessions'::regclass AND attname='used_token_hashes' AND NOT attisdropped")"
  policy_count="$(query "SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'sec018_runtime_%'")"
  [[ "$role_count" == "0" && "$col_count" == "0" && "$policy_count" == "0" ]] ||
    { echo "FAIL SEC-018 guard: unexpected partial schema/role/ACL creation" >&2; exit 1; }
}

expect_rejection() {
  local name="$1" message="$2" output
  if output=$("${p[@]}" -f "$migration" 2>&1); then
    echo "FAIL SEC-018 guard: migration unexpectedly succeeded with $name" >&2
    exit 1
  fi
  [[ "$output" == *"$message"* ]] ||
    { echo "FAIL SEC-018 guard: incorrect failure reason for $name" >&2; exit 1; }
  assert_not_partially_applied
  echo "PASS SEC-018 guard: $name rejected atomically"
}

assert_not_partially_applied

sql 'CREATE TABLE public.sec018_ci_unapproved_table(id integer);'
expect_rejection 'unexpected table inventory' 'public table inventory changed'
sql 'DROP TABLE public.sec018_ci_unapproved_table;'

sql 'CREATE POLICY sec018_ci_unreviewed_policy ON public.users FOR SELECT USING (false);'
expect_rejection 'preexisting public policy' 'preexisting public policies require manual review'
sql 'DROP POLICY sec018_ci_unreviewed_policy ON public.users;'

sql 'ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;'
expect_rejection 'disabled application RLS' 'expected RLS enabled on all application tables'
sql 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;'

sql 'ALTER TABLE public.hrms_refresh_sessions NO FORCE ROW LEVEL SECURITY;'
expect_rejection 'missing refresh-session FORCE RLS' 'expected FORCE RLS on refresh sessions'
sql 'ALTER TABLE public.hrms_refresh_sessions FORCE ROW LEVEL SECURITY;'

sql 'GRANT CREATE ON SCHEMA public TO PUBLIC;'
expect_rejection 'unsafe PUBLIC CREATE grant' 'PUBLIC can CREATE in schema public'
sql 'REVOKE CREATE ON SCHEMA public FROM PUBLIC;'

assert_not_partially_applied
[[ "$(query "SELECT count(*) FROM pg_tables WHERE schemaname='public'")" == "38" ]] ||
  { echo "FAIL SEC-018 guard: inventory not restored to 38 tables" >&2; exit 1; }
[[ "$(query "SELECT count(*) FROM pg_policies WHERE schemaname='public'")" == "0" ]] ||
  { echo "FAIL SEC-018 guard: unexpected policy remained" >&2; exit 1; }
[[ "$(query "SELECT count(*) FROM pg_class WHERE oid='public.hrms_refresh_sessions'::regclass AND relforcerowsecurity")" == "1" ]] ||
  { echo "FAIL SEC-018 guard: refresh FORCE RLS not restored" >&2; exit 1; }
[[ "$(query "SELECT count(*) FROM pg_class WHERE oid='public.users'::regclass AND relrowsecurity")" == "1" ]] ||
  { echo "FAIL SEC-018 guard: user RLS not restored" >&2; exit 1; }
echo 'SEC-018 Step 1G-2: five fail-closed migration preflight checks PASS (synthetic CI only).'
