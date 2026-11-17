#!/usr/bin/env bash
# SEC-018 isolated GPG streaming regression: synthetic bytes ONLY, no HRMS access.
set -Eeuo pipefail
umask 077
for path in scripts/sec018_backup_dev.sh scripts/sec018_restore_rehearsal.sh; do
  grep -Fq 'pg_restore --list >/dev/null && cat >/dev/null' "$path" ||
    { echo "FAIL: $path lacks full-stream drain" >&2; exit 1; }
done
# The encrypted stream must be consumed from stdin; a bare "-" is a
# literal filename for pg_restore and fails before any restore occurs.
grep -Fq -- 'DROP SCHEMA IF EXISTS public' scripts/sec018_restore_rehearsal.sh ||
  { echo "FAIL: local empty public schema collision not guarded" >&2; exit 1; }
grep -Fq -- '--dbname="$PGDATABASE"' scripts/sec018_restore_rehearsal.sh ||
  { echo "FAIL: local restore lacks explicit database target" >&2; exit 1; }
if grep -Fq -- '--dbname="$PGDATABASE" -' scripts/sec018_restore_rehearsal.sh; then
  echo "FAIL: pg_restore uses literal '-' filename instead of stdin" >&2
  exit 1
fi
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
python3 - "$tmpdir/synthetic.bin" <<'PY'
from pathlib import Path
import os, sys
Path(sys.argv[1]).write_bytes(os.urandom(2 * 1024 * 1024))
PY
passphrase='SYNTHETIC_CI_ONLY_DO_NOT_USE_ON_REAL_DATA'
gpg --batch --yes --pinentry-mode loopback --passphrase "$passphrase" \
  --compress-algo none --symmetric --cipher-algo AES256 \
  --output "$tmpdir/test.gpg" "$tmpdir/synthetic.bin"
# A TOC-only consumer closes its reader before GPG has streamed the entire
# archive. The trailing cat consumes the remaining stream, so GPG finishes
# authenticating instead of exiting nonzero with Broken pipe.
gpg --batch --quiet --pinentry-mode loopback --passphrase "$passphrase" \
  --decrypt "$tmpdir/test.gpg" | {
  head -c 1024 >/dev/null && cat >/dev/null
}
echo "PASS: GPG stream completely consumed after early-exiting metadata reader"
# Truncation must still be fatal; do not let a stream-drain workaround
# accidentally accept a damaged ciphertext archive.
python3 - "$tmpdir/test.gpg" "$tmpdir/truncated.gpg" <<'PY'
from pathlib import Path
import sys
src = Path(sys.argv[1]).read_bytes()
Path(sys.argv[2]).write_bytes(src[:-4096])
PY
if gpg --batch --quiet --pinentry-mode loopback --passphrase "$passphrase" \
  --decrypt "$tmpdir/truncated.gpg" 2>/dev/null | {
  head -c 1024 >/dev/null
  cat >/dev/null
}; then
  echo "FAIL: incomplete encrypted ciphertext accepted" >&2
  exit 1
fi
echo "PASS: incomplete encrypted ciphertext remains fatal"

# PostgreSQL 16/17 live CLI-in-CI smoke: actual custom pg_dump -> GPG ->
# pg_restore reading stdin into another *disposable synthetic* CI database.
# Both databases are isolated CI services; never run against a user DB.
if [[ "${GITHUB_ACTIONS:-}" == "true" && "${DB_DATABASE:-}" == "sec018_phasea_ci" ]]; then
  export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres
  server_major="$(psql -X -A -t -v ON_ERROR_STOP=1 -d sec018_phasea_ci -c 'SHOW server_version_num')"
  # Ubuntu runner has pg_dump 17; PG17 dumps can include session settings
  # unknown to a PG16 target. Exercise full restore on matching PG17 only.
  if (( server_major < 170000 )); then
    echo "PASS: PG16 validated static stream guard; PG17 runner performs full encrypted restore"
    exit 0
  fi
  pgsrc=sec018_stream_source_ci
  pgdest=sec018_stream_target_ci
  createdb "$pgsrc"
  createdb "$pgdest"
  psql -X -v ON_ERROR_STOP=1 -d "$pgsrc" \
    -c "CREATE TABLE public.stream_fixture (n integer NOT NULL); INSERT INTO public.stream_fixture(n) VALUES (42);" > /dev/null
  # Match a real HRMS export containing CREATE SCHEMA public. Only the
  # disposable local target's EMPTY default public schema may be removed.
  psql -X -v ON_ERROR_STOP=1 -d "$pgdest" -c 'DROP SCHEMA IF EXISTS public' >/dev/null
  pg_dump -Fc --no-owner --no-acl -d "$pgsrc" -n public |
    gpg --batch --yes --pinentry-mode loopback --passphrase "$passphrase" \
      --compress-algo none --symmetric --cipher-algo AES256 \
      --output "$tmpdir/pgdump.gpg"
  gpg --batch --quiet --pinentry-mode loopback --passphrase "$passphrase" \
    --decrypt "$tmpdir/pgdump.gpg" |
    pg_restore --exit-on-error --single-transaction --no-owner --no-acl \
      --dbname="$pgdest"
  value="$(psql -X -A -t -v ON_ERROR_STOP=1 -d "$pgdest" \
    -c 'SELECT n FROM public.stream_fixture')"
  [[ "$value" == "42" ]] || {
    echo "FAIL: synthetic stdin restoration content mismatch" >&2
    exit 1
  }
  dropdb "$pgdest"
  dropdb "$pgsrc"
  echo "PASS: encrypted custom-format PostgreSQL restore consumes stdin (no '-' argument)"
fi
