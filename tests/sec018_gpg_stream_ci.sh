#!/usr/bin/env bash
# SEC-018 isolated GPG streaming regression: synthetic bytes ONLY, no HRMS access.
set -Eeuo pipefail
umask 077
for path in scripts/sec018_backup_dev.sh scripts/sec018_restore_rehearsal.sh; do
  grep -Fq 'pg_restore --list >/dev/null && cat >/dev/null' "$path" ||
    { echo "FAIL: $path lacks full-stream drain" >&2; exit 1; }
done
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
