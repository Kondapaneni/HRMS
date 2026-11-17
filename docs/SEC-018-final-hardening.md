# SEC-018 follow-up: native prepares, scoped data access, and independent recovery

**Status (2026-11-17): REVIEW / DRAFT PR #59 — DO NOT DEPLOY OR CLOSE SEC-018.**

The Acme HRMS development deployment on Render is working and retains its
original database fallback credentials. The live Admin login was user-verified,
and 28/28 manually enumerated DEV checks passed at the scope of each check.
One of those checked that an Employee B from a different branch could not see
Employee A's exclusive loan in the loan **list**. This does **not** establish
all detail/document/member/branch authorization invariants.

## 1. Native prepared statement compatibility

Supabase recommends **session pooling** (shared pooler port **5432**) or
direct Postgres for persistent backends needing native prepared statements.
Shared transaction-pooler port **6543** does NOT support server-side prepares.
See: https://supabase.com/docs/guides/database/connecting-to-postgres .

The existing deployed Render connection still uses the shared **transaction**
pooler and `DB_PDO_PREPARE_MODE=pooler` (PDO emulated prepares with bound
parameters). **Do not turn on `DB_PDO_PREPARE_MODE=native` on port 6543.**

This PR:
- Refuses native PDO mode when `DB_PORT=6543`; it does not silently fall back.
- Rehearses actual PHP sign-in, protected read routes and signed audit INSERT /
  UPDATE in a **disposable** PgBouncer **session** pool with native PDO prepares
  on PostgreSQL 16 and 17. The existing transaction-pool CI is retained.
- Corrects repeated named placeholders in the reviewed member/lead/branch
  queries. PostgreSQL native prepares generally cannot reuse a named PDO
  placeholder in one SQL statement.
- Preserves existing `DB_USERNAME`/`DB_PASSWORD` and restricted-role
  opt-in for an explicit rollback.

**Later, only after an independently recoverable backup and an owner-approved
DEV test window**, switch only the correct Render HRMS service to the
**verified** Supabase session-pooler connection settings copied from Dashboard
Connect (same pooler host, port 5432, custom-role username
`hrms_runtime_restricted.<project-ref>` and existing restricted password),
then `DB_PDO_PREPARE_MODE=native`.
Do not change the Admin password, reissue role credentials, or log secrets.
Use a separate temporary runtime-connection canary if available.
After deployment, verify Render live commit, Admin/Employee/candidate sign-in,
Settings, feature access, Member/loan/branch queries with search and filters,
attendance, audit signatures, loan documents, logout, and concurrent refresh.
If any fail, immediately return to **known-working port 6543 and
`DB_PDO_PREPARE_MODE=pooler`** on the same host, redeploy, and confirm Admin
login. Do not change roles/audit keys to perform this rollback.

## 2. Server-authorized user and branch scopes

The restricted PostgreSQL runtime role still has broad role-level RLS for
application tables. It is NOT an independent per-user/branch RLS authority.
PHP route authorization remains security-critical.

Code review identified `/api/members/{phone}`: it checked ownership of lead
rows but could load `loan_applications` by `lead_id` without independently
checking `created_by` and `branch`. This could expose linked applications
from a different employee or branch when legacy lead aliases overlap. The
member list, member detail and linked application SELECT now use server-derived
`OriginationAccess::loanScope()`; no user/branch query parameter is trusted.
Loan/sales lead list, creation and update paths likewise enforce current
employee branch rather than a caller-supplied branch and repeat the scope on
writes. Branch dashboards' union/search statements use unique native
placeholders.

Synthetic SEC-011 regression now includes multiple employees, different
branches, a **shared phone** and a **shared lead ID**. It must verify that
Member details do not return another user's linked application and that the
explicit Admin path still works. The later genuine DEV check should use only
existing disposable records and never try to access actual confidential data.

**Remaining architectural risk:** Until separate signed per-user RLS policies
and exhaustive endpoint coverage are independently reviewed, SQL injection or
any missed PHP route check could read/modify data allowed to the shared
`hrms_runtime_restricted` role. Do not claim this is solved just by code CI.

## 3. Independent encrypted application backup — manual workstation action

Supabase Free does **not** provide automatic downloadable backups. Supabase
recommends locally generated `db dump` / `pg_dump` backups stored offsite:
https://supabase.com/docs/guides/platform/backups .

The prior `sec018_recovery` schema preserves one Admin row and some ACL
metadata but is INSIDE the SAME Supabase database: it cannot recover from
database loss.

Two **manual-only** guarded scripts are supplied:
- `scripts/sec018_backup_dev.sh` creates a **local encrypted GPG archive**
  of `public`, `sec018_internal` and `sec018_recovery` (all table data
  included). Nothing plaintext is staged on disk. It checks for 38 public
  tables and exactly 1 existing Admin before starting. GPG and the target
  operator prompt for confirmation. The encrypted file contains **Admin
  password hashes and the audit signing key**; keep it private and **never
  upload it to GitHub, Render logs, chat, email or CI artifacts**.
- `scripts/sec018_restore_rehearsal.sh` decrypts in memory and restores
  ONLY to an empty, disposable **local** PostgreSQL database named
  `sec018_restore_*`. It refuses a Supabase/remote hostname or an existing
  populated app database and checks restored Admin presence. It does NOT
  drop existing databases.

### Running locally (Git Bash/WSL/Linux with PostgreSQL client + GPG)

1. On your **private workstation**, install compatible PostgreSQL 17 client
   (`psql`, `pg_dump`, `pg_restore`), GPG and Bash; use a current client.
   Copy connection **host, port 5432, database, username** from your Acme HRMS
   Supabase Dashboard's **Session pooler** or approved direct connection.
   **Do not paste any credentials into chat or Git.** Set standard
   `PGHOST`, `PGPORT=5432`, `PGDATABASE=postgres`, and `PGUSER`
   locally. Store password in a private local `PGPASSFILE` (mode 0600;
   never check it in). Do not put passwords in URL/CLI arguments.
2. Create an existing, private local directory outside the repository and
   set `SEC018_BACKUP_DIR` to its **absolute path**. Then run
   `bash scripts/sec018_backup_dev.sh` and confirm the target by typing
   `ACME-HRMS-DEV`. GPG prompts for a separate **strong backup passphrase**.
3. Back up the encrypted `*.pgdump.gpg` file to a second independent,
   access-controlled, encrypted storage location; retain the GPG passphrase
   separately. Record file size, date, and access controls without publishing
   the file or key. `pg_restore --list` checking only means the archive is
   readable; **this is NOT a successful restore**.
4. Provision an **empty local disposable** PostgreSQL 17 database named
   `sec018_restore_...` in a compatible environment with needed Supabase
   extensions installed. Set the local **PGHOST=127.0.0.1**, `PGPORT`,
   `PGDATABASE`, `PGUSER=postgres`, `PGPASSFILE`, and
   `SEC018_RESTORE_ARCHIVE` to the encrypted file, then run
   `bash scripts/sec018_restore_rehearsal.sh`. Never set this destination
   to the real Supabase host or the HRMS Render database.
5. Restore must pass (38 application tables, **1 Admin record**,
   **1 recovery Admin row**, **1 audit key**) before calling it a data
   recovery rehearsal. Do not share row contents/hashes/secrets.
   Validate extensions, function owners, RLS, ACLs and external object
   dependencies separately; `--no-owner --no-acl` deliberately does not
   prove full security-role/privilege reconstruction or application login.
   Supabase Auth/Storage files and platform-managed objects are **not**
   guaranteed by this scoped application backup. If restore fails, do NOT
   continue to live native migration.

**Never let ChatGPT, GitHub Actions, or a public service ingest an unencrypted
copy of this database or the GPG passphrase.**

## 4. Residual risk and closeout gates

- **Native prepare cutover:** CI native session test PASS and manually verify
  every critical authenticated HRMS flow after a controlled config change.
- **Authorization:** Synthetic and appropriate DEV live checks for Member,
  loan, sales, document, branch mutation and shared-lead/cross-branch cases.
- **Backup:** Operator confirms independently stored encrypted backup and
  an actual compatible local restore, including preserved Admin login
  material and audit key; also an explicit privilege/function recreation
  plan.
- **Session replay:** Owners still need to accept or further reduce the
  bounded 30-second refresh-token grace period. Do not remove it blindly;
  simultaneous browser refresh and lost-response behavior were tested.
- **Merge/release:** PR #59 remains DRAFT until all checks pass; retain the
  original Render settings and Admin credentials. Keep SEC-018 OPEN. No
  production release is authorized by this document.
