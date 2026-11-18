#!/usr/bin/env bash
# PERF-008: encrypted Mumbai application snapshot. NOT a full Supabase migration.
# Run from a trusted local workstation, never in CI or Render.
set -Eeuo pipefail
set +x
umask 077
die() { printf 'PERF-008 STOP: %s\n' "$*" >&2; exit 1; }
for cmd in psql pg_dump pg_restore gpg stat date; do command -v "$cmd" >/dev/null || die "Missing $cmd"; done
[[ -z "${CI:-}" && -z "${GITHUB_ACTIONS:-}" ]] || die "Refuse real database backup in CI"
[[ -z "${PGPASSWORD:-}" && -z "${DATABASE_URL:-}" ]] || die "Use a private PGPASSFILE, never plaintext DB URLs or env passwords"
[[ -n "${PGHOST:-}" && -n "${PGPORT:-}" && -n "${PGUSER:-}" && -n "${PGDATABASE:-}" ]] || die "Set PGHOST, PGPORT, PGUSER, PGDATABASE"
[[ "$PGPORT" == 5432 && "$PGDATABASE" == postgres ]] || die "Unexpected database/port"
[[ "$PGUSER" == postgres* ]] || die "Expected authorized database maintenance user"
[[ "${PGSSLMODE:-}" == require || "${PGSSLMODE:-}" == verify-ca || "${PGSSLMODE:-}" == verify-full ]] || die "Set PGSSLMODE=require or stronger"
# Require the known project reference in either direct host or session-pooler user.
source_ref='jtgqkkhqyzfbupiqwkgf'
[[ "$PGHOST" == "db.$source_ref.supabase.co" || "$PGUSER" == "postgres.$source_ref" ]] || die "Not the verified Mumbai source"
[[ -n "${PGPASSFILE:-}" && -f "$PGPASSFILE" && "$(stat -c '%a' "$PGPASSFILE")" == 600 ]] || die "Set PGPASSFILE to existing mode-0600 file"
[[ -n "${PERF008_SNAPSHOT_DIR:-}" && -d "$PERF008_SNAPSHOT_DIR" && -w "$PERF008_SNAPSHOT_DIR" && "$(stat -c '%a' "$PERF008_SNAPSHOT_DIR")" == 700 ]] || die "Set PERF008_SNAPSHOT_DIR to a private mode-0700 local directory"
signature="$(psql -X -A -t -v ON_ERROR_STOP=1 -c "
SELECT
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'),
 (SELECT count(*) FROM pg_roles WHERE rolname IN ('hrms_runtime_restricted','hrms_audit_executor','hrms_audit_verifier')),
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='hrms_security' AND c.relname='audit_keys' AND c.relkind='r');
" | tr -d '[:space:]')" || die "Source verification failed"
[[ "$signature" == '38|3|1' ]] || die "Source signature changed; do not take incomplete backup"
printf '%s\n' 'Archive will contain dev password hashes and secret audit signing keys. Encryption is mandatory.'
printf '%s\n' 'THIS IS ONLY PUBLIC + HRMS_SECURITY SCHEMAS; NOT A FULL SUPABASE BACKUP OR STORAGE EXPORT.'
printf 'Type PERF008-MUMBAI-SNAPSHOT to continue: '
read -r confirm
[[ "$confirm" == 'PERF008-MUMBAI-SNAPSHOT' ]] || die "Confirmation declined"
outfile="$PERF008_SNAPSHOT_DIR/perf008-hrms-app-$(date -u +%Y%m%dT%H%M%SZ).pgdump.gpg"
[[ ! -e "$outfile" ]] || die "Refusing to overwrite existing archive"
completed=0
trap 'if (( completed != 1 )); then rm -f -- "$outfile"; fi' EXIT
# No unencrypted archive touches disk; passphrase is requested privately by GPG.
pg_dump -Fc --no-owner --no-acl --schema=public --schema=hrms_security |
  gpg --no-symkey-cache --symmetric --cipher-algo AES256 --output "$outfile"
[[ -s "$outfile" ]] || die "Empty encrypted archive"
gpg --quiet --decrypt "$outfile" | pg_restore --list >/dev/null || die "Archive index verification failed"
completed=1
trap - EXIT
printf 'PASS: encrypted application snapshot: %s\n' "$outfile"
printf '%s\n' 'Never share/upload archive or passphrase. Still required: full project migration, custom roles, Storage binaries, secrets and restore verification.'
