#!/usr/bin/env bash
# SEC-018 Step 1G-3: restore only a disposable, SYNTHETIC PostgreSQL CI database.
# DANGER: This script drops and recreates the named disposable CI database.
# It MUST NEVER be run against Supabase, Render, DEV or any employee database.
set -euo pipefail

for v in GITHUB_ACTIONS DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD PGPASSWORD SEC018_PG_MAJOR; do
  [[ -n "${!v:-}" ]] || { echo "REFUSED rollback rehearsal: missing $v" >&2; exit 2; }
done
[[ "$GITHUB_ACTIONS" == true &&
   "$DB_HOST" == "127.0.0.1" &&
   "$DB_PORT" == "5432" &&
   "$DB_DATABASE" == "sec018_phasea_ci" &&
   "$DB_USERNAME" == "postgres" &&
   "$DB_PASSWORD" == "SEC018_PHASEA_CI_PG_ONLY" &&
   "$PGPASSWORD" == "SEC018_PHASEA_CI_PG_ONLY" ]] ||
  { echo 'REFUSED rollback rehearsal: not the isolated CI database' >&2; exit 2; }
[[ "$SEC018_PG_MAJOR" == 16 || "$SEC018_PG_MAJOR" == 17 ]] ||
  { echo 'REFUSED rollback rehearsal: unsupported disposable PostgreSQL version' >&2; exit 2; }
for v in DATABASE_URL SUPABASE_URL SUPABASE_SECRET_KEY SUPABASE_SERVICE_ROLE_KEY; do
  [[ -z "${!v:-}" ]] ||
    { echo 'REFUSED rollback rehearsal: external connection variable detected' >&2; exit 2; }
done
command -v docker >/dev/null && command -v psql >/dev/null ||
  { echo 'REFUSED rollback rehearsal: disposable CI tools unavailable' >&2; exit 2; }
[[ -f tests/sec018_phasea_schema_ci.sql &&
   -f supabase/review-only/20261116_sec018_runtime_role_review_only.sql &&
   -f supabase/review-only/20261116_sec018_signed_audit_review_only.sql ]] ||
  { echo 'REFUSED rollback rehearsal: review-only SQL files not found' >&2; exit 2; }

# Check both the database AND immutable synthetic fixture marker before ANY
# database-destructive action. Real HRMS employee data must not exist here.
psql_db() { psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d sec018_phasea_ci "$@"; }
psql_maintenance() { psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d postgres "$@"; }
query() { psql_db -Atqc "$1"; }
require_count() {
  [[ "$(query "$1")" == "$2" ]] ||
    { echo "FAIL rollback rehearsal: $3" >&2; exit 1; }
}
[[ "$(query 'SELECT current_database()')" == "sec018_phasea_ci" ]] ||
  { echo 'REFUSED rollback rehearsal: unexpected connected database' >&2; exit 2; }
[[ "$(query 'SHOW server_version_num')" == "$SEC018_PG_MAJOR"* ]] ||
  { echo 'REFUSED rollback rehearsal: unexpected server major version' >&2; exit 2; }
require_count "SELECT count(*) FROM public.users
    WHERE (id='11111111-1111-4111-8111-111111111111'::uuid AND email='alice@example.invalid')
       OR (id='22222222-2222-4222-8222-222222222222'::uuid AND email='bob@example.invalid')" 2 'synthetic user markers absent'
require_count 'SELECT count(*) FROM public.users' 2 'non-synthetic users present'
require_count "SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'" 38 'unexpected application table count'
require_count "SELECT count(*) FROM pg_catalog.pg_roles WHERE rolname IN ('hrms_runtime_restricted','hrms_audit_verifier','hrms_audit_executor')" 0 'restricted roles must not already exist'
require_count "SELECT count(*) FROM public.email_queue" 0 'preexisting non-synthetic email queue data'

# Use matching major-version pg_dump/pg_restore binaries from an ephemeral
# postgres container. The host is GitHub's runner-local service only.
pg_client() {
  docker run --rm -i --network host \
    -e PGPASSWORD="$DB_PASSWORD" "postgres:$SEC018_PG_MAJOR" "$@"
}
tempdir="$(mktemp -d /tmp/sec018-rollback-ci.XXXXXXXX)"
trap 'rm -rf "$tempdir"' EXIT

database_acl_before="$(psql_maintenance -Atqc "SELECT COALESCE(datacl::text,'<NULL>') FROM pg_database WHERE datname='sec018_phasea_ci'")"
[[ -n "$database_acl_before" ]] || { echo 'FAIL rollback rehearsal: cannot inventory database ACL' >&2; exit 1; }
pg_client pg_dump -h 127.0.0.1 -p 5432 -U postgres -d sec018_phasea_ci -Fc > "$tempdir/prechange.dump"
pg_client pg_restore --list < "$tempdir/prechange.dump" > "$tempdir/prechange.list"
[[ -s "$tempdir/prechange.dump" && -s "$tempdir/prechange.list" ]] ||
  { echo 'FAIL rollback rehearsal: backup invalid' >&2; exit 1; }
grep -Fq 'TABLE public users ' "$tempdir/prechange.list" ||
  { echo 'FAIL rollback rehearsal: no user table in backup' >&2; exit 1; }

# Capture complete schema text including ownership/ACLs for exact diff.
# pg_dump may write randomized session protection \restrict / \unrestrict tokens.
# Remove ONLY those unstable lines before comparing.
pg_client pg_dump -h 127.0.0.1 -p 5432 -U postgres -d sec018_phasea_ci --schema-only |
  grep -v -E '^\\(un)?restrict[[:space:]]' > "$tempdir/schema.before.sql"
[[ -s "$tempdir/schema.before.sql" ]] ||
  { echo 'FAIL rollback rehearsal: schema fingerprint missing' >&2; exit 1; }
echo 'PASS SEC-018 rollback: custom-format synthetic backup and schema/ACL snapshot captured'

# Rehearse both ACTUAL proposed review-only SQL scripts on the disposable DB.
psql_db -f supabase/review-only/20261116_sec018_runtime_role_review_only.sql >/dev/null
psql_db -f supabase/review-only/20261116_sec018_signed_audit_review_only.sql >/dev/null
require_count "SELECT count(*) FROM pg_roles WHERE rolname IN ('hrms_runtime_restricted','hrms_audit_verifier','hrms_audit_executor')" 3 'proposed roles not created'
require_count "SELECT count(*) FROM pg_catalog.pg_attribute WHERE attrelid='public.hrms_refresh_sessions'::regclass AND attname='used_token_hashes' AND NOT attisdropped" 1 'refresh history migration missing'
require_count "SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'sec018_runtime_%'" 121 'expected role-specific policies missing'
require_count "SELECT count(*) FROM pg_catalog.pg_namespace WHERE nspname='sec018_internal'" 1 'audit private schema missing'
require_count "SELECT count(*) FROM pg_catalog.pg_proc p WHERE p.oid='sec018_internal.verified_audit_actor()'::regprocedure" 1 'audit verifier missing'
# Simulate post-upgrade writes ONLY on a fixture table with a no-network trigger.
psql_db -qc "INSERT INTO public.email_queue(to_email,subject,body)
VALUES ('rollback-ci@example.invalid','SEC018 rollback','Synthetic never delivered')"
require_count "SELECT count(*) FROM public.email_queue WHERE to_email='rollback-ci@example.invalid'" 1 'postchange fixture marker missing'
echo 'PASS SEC-018 rollback: proposed migration and synthetic postchange write applied'

# Database replacement is intentionally destructive, but ONLY for the verified
# isolated CI database, never for a persistent/shared instance.
psql_maintenance -qc 'DROP DATABASE sec018_phasea_ci WITH (FORCE)'
psql_maintenance -qc 'CREATE DATABASE sec018_phasea_ci'
pg_client pg_restore --exit-on-error --clean --if-exists \
  -h 127.0.0.1 -p 5432 -U postgres -d sec018_phasea_ci < "$tempdir/prechange.dump"
require_count "SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'" 38 'table inventory not restored'
require_count "SELECT count(*) FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped" 407 'original column inventory not restored'
require_count "SELECT count(*) FROM pg_policies WHERE schemaname='public'" 0 'post-migration RLS policies remain'
require_count "SELECT count(*) FROM pg_catalog.pg_namespace WHERE nspname='sec018_internal'" 0 'private audit schema remains'
require_count "SELECT count(*) FROM pg_catalog.pg_attribute WHERE attrelid='public.hrms_refresh_sessions'::regclass AND attname='used_token_hashes' AND NOT attisdropped" 0 'post-migration history column remains'
require_count "SELECT count(*) FROM public.users" 2 'synthetic prechange user rows not restored'
require_count "SELECT count(*) FROM public.email_queue" 0 'postchange marker survived restoration'
require_count "SELECT count(*) FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal" 9 'application triggers were not restored'
require_count "SELECT count(*) FROM pg_catalog.pg_constraint co JOIN pg_catalog.pg_class c ON c.oid=co.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'" 78 'constraints not restored'
require_count "SELECT count(*) FROM pg_catalog.pg_class c WHERE c.oid='public.hrms_refresh_sessions'::regclass AND c.relforcerowsecurity" 1 'refresh FORCE RLS not restored'
require_count "SELECT count(*) FROM pg_catalog.pg_roles WHERE rolname IN ('hrms_runtime_restricted','hrms_audit_verifier','hrms_audit_executor')" 3 'role-cleanup test precondition missing'
require_count "SELECT count(*) FROM pg_catalog.pg_proc p WHERE p.oid='public.process_audit_log()'::regprocedure AND pg_get_userbyid(p.proowner)='postgres'" 1 'original audit trigger function ownership not restored'
require_count "SELECT count(*) FROM pg_catalog.pg_roles WHERE rolname='service_role'" 1 'original synthetic worker role missing'
require_count "SELECT count(*) FROM pg_catalog.pg_class c WHERE c.oid='public.email_queue'::regclass AND has_table_privilege('service_role',c.oid,'UPDATE')" 1 'email worker UPDATE grant lost'

# DB-level grants are NOT included in a normal pg_dump, so verify the
# recreated CI DB has exactly the recorded pre-migration database ACL.
database_acl_after="$(psql_maintenance -Atqc "SELECT COALESCE(datacl::text,'<NULL>') FROM pg_database WHERE datname='sec018_phasea_ci'")"
[[ "$database_acl_after" == "$database_acl_before" ]] ||
  { echo 'FAIL rollback rehearsal: database-level ACL differs after recreation' >&2; exit 1; }

pg_client pg_dump -h 127.0.0.1 -p 5432 -U postgres -d sec018_phasea_ci --schema-only |
  grep -v -E '^\\(un)?restrict[[:space:]]' > "$tempdir/schema.after.sql"
if ! cmp -s "$tempdir/schema.before.sql" "$tempdir/schema.after.sql"; then
  diff -u "$tempdir/schema.before.sql" "$tempdir/schema.after.sql" | head -n 80 >&2 || true
  echo 'FAIL rollback rehearsal: schema, ownership, or ACL dump mismatch' >&2
  exit 1
fi
echo 'PASS SEC-018 rollback: original fixture rows, schema, trigger owners and ACLs match baseline'

# Roles are PostgreSQL cluster objects, not contained in a per-DB pg_dump.
# Explicitly check and remove only the three CI-created restricted roles.
psql_maintenance -qc 'DROP ROLE hrms_runtime_restricted, hrms_audit_executor, hrms_audit_verifier'
require_count "SELECT count(*) FROM pg_catalog.pg_roles WHERE rolname IN ('hrms_runtime_restricted','hrms_audit_verifier','hrms_audit_executor')" 0 'new cluster roles remain'
echo 'PASS SEC-018 rollback: three migration-owned cluster roles removed'
echo 'SEC-018 STEP 1G-3 SYNTHETIC BACKUP/ROLLBACK REHEARSAL PASSED (not a real restored-schema test).'
