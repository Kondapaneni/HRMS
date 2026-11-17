#!/usr/bin/env bash
# SEC-018: encrypted, independent LOCAL copy of Acme HRMS DEV application data.
# Run manually from a trusted operator workstation, not in GitHub Actions,
# Render, Supabase SQL Editor, or a container attached to production.
set -Eeuo pipefail
set +x
umask 077

die() { printf 'SEC-018 backup STOP: %s\n' "$*" >&2; exit 1; }
for cmd in pg_dump pg_restore psql gpg date mkdir; do
  command -v "$cmd" >/dev/null 2>&1 || die "Install $cmd locally before proceeding"
done
[[ -z "${CI:-}" && -z "${GITHUB_ACTIONS:-}" ]] || die "No backups in CI"
[[ -z "${DATABASE_URL:-}" && -z "${PGPASSWORD:-}" ]] || die "Do not pass raw database secrets in environment/URLs"
[[ -n "${PGHOST:-}" && -n "${PGPORT:-}" && -n "${PGDATABASE:-}" && -n "${PGUSER:-}" ]] || die "Set PGHOST, PGPORT, PGDATABASE and PGUSER locally"
[[ -n "${PGPASSFILE:-}" && -f "${PGPASSFILE:-}" ]] || die "Use a local 0600 PGPASSFILE instead of command-line credentials"
[[ "${PGDATABASE}" == 'postgres' ]] || die "Expected Supabase Postgres database name"
[[ "${PGUSER}" == postgres* ]] || die "Expected authorized Supabase maintenance role"
[[ "${PGPORT}" == '5432' ]] || die "Use a direct or SESSION pooler connection on port 5432 for pg_dump"
[[ -n "${SEC018_BACKUP_DIR:-}" && -d "${SEC018_BACKUP_DIR}" ]] || die "Set SEC018_BACKUP_DIR to an existing private LOCAL directory"
[[ -w "${SEC018_BACKUP_DIR}" ]] || die "Backup directory not writable"

printf 'Target host: %s | database: %s | user: %s | port: %s\n' "$PGHOST" "$PGDATABASE" "$PGUSER" "$PGPORT"
printf 'The dump includes Admin password hashes and the SEC-018 audit signing key.\n'
printf 'It will be encrypted before any bytes are written to disk.\n'
printf 'Type exactly ACME-HRMS-DEV to confirm this is the intended DEV database: '
read -r acknowledgment
[[ "$acknowledgment" == 'ACME-HRMS-DEV' ]] || die "Target not confirmed"

# Structure-only checks, no account row export or secret output.
role="$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT current_user")" || die "Could not verify database identity"
[[ "$role" == 'postgres' ]] || die "Must use the approved database maintenance identity"
counts="$(psql -X -A -t -v ON_ERROR_STOP=1 -F '|' -c "
 SELECT
   (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'),
   (SELECT count(*) FROM public.users WHERE role='admin'),
   (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='sec018_internal' AND c.relname='audit_keys'),
   (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='sec018_recovery' AND c.relname='admin_account');
")" || die "Could not check the exact HRMS structure"
[[ "$counts" == '38|1|1|1' ]] || die "DEV schema/Admin/recovery signature mismatch; stop instead of dumping the wrong database"

filename="sec018-acme-hrms-dev-$(date -u +%Y%m%dT%H%M%SZ).pgdump.gpg"
outfile="${SEC018_BACKUP_DIR%/}/$filename"
[[ ! -e "$outfile" ]] || die "Backup file already exists; will not overwrite"
completed=0
trap 'if (( completed != 1 )); then rm -f -- "$outfile"; fi' EXIT

printf 'Encrypted backup output: %s\n' "$outfile"
printf 'GPG will prompt locally for a strong passphrase; do not share it.\n'
# Never stage the database dump as plaintext. Do not enable shell tracing.
pg_dump --format=custom --no-owner --no-acl \
    --schema=public --schema=sec018_internal --schema=sec018_recovery \
    | gpg --no-symkey-cache --symmetric --cipher-algo AES256 --output "$outfile"

[[ -s "$outfile" ]] || die "Encrypted file is empty"
# Decrypt only in memory and validate that the archive is parseable.
gpg --quiet --decrypt "$outfile" | pg_restore --list >/dev/null || die "Encrypted archive failed integrity/list check"
completed=1
trap - EXIT
printf 'SEC-018 LOCAL ENCRYPTED BACKUP CAPTURED AND ARCHIVE LIST VERIFIED.\n'
printf 'This is NOT a successful restore rehearsal. Run the separate guarded restore script.\n'
printf 'Retain this file and its GPG passphrase separately; do NOT upload either to chat or GitHub.\n'
