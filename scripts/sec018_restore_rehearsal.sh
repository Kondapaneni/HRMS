#!/usr/bin/env bash
# SEC-018: attempt an authentic restore of an encrypted DEV backup into a
# *local disposable* compatible PostgreSQL 17 database. NEVER target Supabase.
# The restore is intentionally refused unless all destination guards pass.
set -Eeuo pipefail
set +x
umask 077
die() { printf 'SEC-018 restore STOP: %s\n' "$*" >&2; exit 1; }
for cmd in pg_restore psql gpg; do
  command -v "$cmd" >/dev/null 2>&1 || die "Install $cmd locally first"
done
[[ -z "${CI:-}" && -z "${GITHUB_ACTIONS:-}" ]] || die "Real DEV backup restore is not a GitHub CI job"
[[ -z "${DATABASE_URL:-}" && -z "${PGPASSWORD:-}" ]] || die "Never pass raw credentials through command-line URLs/environment"
[[ "${PGHOST:-}" == '127.0.0.1' || "${PGHOST:-}" == 'localhost' ]] || die "Restore target must be LOCAL PostgreSQL"
[[ "${PGDATABASE:-}" == sec018_restore_* ]] || die "Restore database must start with sec018_restore_"
[[ "${PGUSER:-}" == 'postgres' ]] || die "Restore requires local disposable postgres maintenance role"
[[ -n "${PGPORT:-}" && "${PGPORT}" =~ ^[0-9]+$ ]] || die "Set local PostgreSQL port in PGPORT"
[[ -n "${PGPASSFILE:-}" && -f "${PGPASSFILE:-}" ]] || die "Set local PGPASSFILE with private file permissions"
[[ -f "${SEC018_RESTORE_ARCHIVE:-}" ]] || die "Set SEC018_RESTORE_ARCHIVE to your encrypted .pgdump.gpg file"
[[ "${SEC018_RESTORE_ARCHIVE}" == *.pgdump.gpg ]] || die "Unrecognized encrypted backup extension"

name="$(psql -X -A -t -v ON_ERROR_STOP=1 -c 'SELECT current_database()')" || die "Cannot connect to restore target"
[[ "$name" == "$PGDATABASE" ]] || die "Restore destination mismatch"
# Refuse to overwrite ANY existing application table or internal SEC-018 schema.
existing="$(psql -X -A -t -v ON_ERROR_STOP=1 -c "
SELECT
  (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')),
  (SELECT count(*) FROM pg_catalog.pg_namespace WHERE nspname IN ('sec018_internal','sec018_recovery'));")" || die "Could not verify disposable destination"
[[ "$existing" == '0|0' ]] || die "Restore destination is not empty: refusing to overwrite data"

printf 'This will write ONLY to LOCAL disposable PostgreSQL %s at %s:%s.\n' "$PGDATABASE" "$PGHOST" "$PGPORT"
printf 'Do not point any production or development application at this database.\n'
printf 'Type exactly RESTORE-LOCAL-SEC018 to continue: '
read -r acknowledgment
[[ "$acknowledgment" == 'RESTORE-LOCAL-SEC018' ]] || die "Restore target not confirmed"

# Validate the encrypted archive, then create placeholder roles needed by
# existing RLS policy metadata. They have NOLOGIN/no elevation/no passwords.
# pg_restore --list can stop reading before the end of the archive;
# drain the GPG stream so content authentication completes without SIGPIPE.
# This does not write decrypted data to disk.
gpg --quiet --decrypt "$SEC018_RESTORE_ARCHIVE" | {
  pg_restore --list >/dev/null && cat >/dev/null
} ||
  die "Backup is unreadable or not a valid custom pg_dump archive"
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
DO $guard$
BEGIN
  IF current_database() NOT LIKE 'sec018_restore_%' THEN
    RAISE EXCEPTION 'Unsafe restore target';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='hrms_runtime_restricted') THEN
    CREATE ROLE hrms_runtime_restricted NOLOGIN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='hrms_audit_verifier') THEN
    CREATE ROLE hrms_audit_verifier NOLOGIN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='hrms_audit_executor') THEN
    CREATE ROLE hrms_audit_executor NOLOGIN;
  END IF;
END $guard$;
SQL

# One transaction, no drops/--clean: a failed restore rolls back schema/data.
# --no-owner/--no-acl is an application-data recovery rehearsal, NOT
# proof that Supabase-managed role ownership/grants have been recreated.
gpg --quiet --decrypt "$SEC018_RESTORE_ARCHIVE" |
  pg_restore --exit-on-error --single-transaction --no-owner --no-acl \
    --dbname="$PGDATABASE" -

counts="$(psql -X -A -t -v ON_ERROR_STOP=1 -F '|' -c "
 SELECT
  (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'),
  (SELECT count(*) FROM public.users WHERE role='admin'),
  (SELECT count(*) FROM sec018_recovery.admin_account),
  (SELECT count(*) FROM sec018_internal.audit_keys);
")" || die "Restored data did not pass basic structure check"
[[ "$counts" == '38|1|1|1' ]] || die "Restored structure/Admin/key counts mismatch"
printf 'SEC-018 LOCAL RESTORE AND ADMIN-ACCOUNT PRESENCE CHECK PASSED.\n'
printf 'SEC-018 SECURITY ROLE/GRANT RECONCILIATION AND APP LOGIN STILL REQUIRE SEPARATE TESTS.\n'
