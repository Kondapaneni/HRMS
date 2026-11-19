# PERF-008 Step 3A — Singapore migration readiness (2026-11-18)

> **Current verified status (2026-11-19): STAGED — NOT CUTOVER-APPROVED.** Singapore's application tables and metadata are populated. Security ACL issues found during comparison were fixed. Real Storage file SHA-256 verification and isolated HRMS end-to-end tests are **still outstanding**. Production Render connection settings were not modified by these steps and have not been independently re-read from the protected environment.

## 2026-11-19 verification and security remediation

- Both projects reported ACTIVE_HEALTHY. Singapore contains **38 application tables**, **125 public RLS policies**, **12 Storage buckets**, and **27 Storage object metadata rows**. The 27 listed files total **8,167,523 metadata-declared bytes** in each project; bucket configurations and path/size/ETag manifest fingerprints match. **No 27/27 binary SHA-256 checksum pass has been established.**
- All 38 tables had matching exact row counts (most recently 151 rows each). The Singapore data contains 40 additive columns (6 contain data). These must not be dropped blindly. Audit log `new_values` has a small historical discrepancy, and one stale imported refresh session was intentionally revoked in Singapore; do not overwrite live token rotation state.
- Reconciled 31 excess grants on `hrms_runtime_restricted`. The three custom HRMS roles and their 126 combined table grants match Mumbai; there are zero missing and zero excess grants.
- **Additional important 2026-11-19 finding and fix:** Before the last pass, Singapore's `anon` and `authenticated` PostgreSQL roles each had all seven table privileges on all 38 public HRMS tables (**532 excess grants in total**). We revoked these on Singapore only. Subsequent independent checks show **zero** `anon`/`authenticated` application-table grants, matching Mumbai. The `service_role` retains its **266** grants on public HRMS tables and the HRMS role retains 126 combined grants.
- Reconciled `postgres` default privileges for **future** application tables, sequences and functions in the `public` schema with Mumbai; future objects created by `postgres` should no longer accidentally get those broad `anon` and `authenticated` grants. Supabase-managed `supabase_admin` defaults were not altered.
- Reconciled all nine application/security function definitions modulo comments/formatting, plus function ownership, EXECUTE ACLs, public sequence ACLs, private schema ACLs and HRMS role memberships. The two SEC-018 `SECURITY DEFINER` audit functions now have their original restricted owners, not `postgres`. All corresponding function ACLs, sequence ACLs and schema ACLs match Mumbai.
- Security regression: `anon` may not SELECT/DELETE public users, read MFA secrets/refresh sessions, call the signed-audit functions, or invoke attendance jobs. `hrms_runtime_restricted` can SELECT users and settings but cannot DELETE users or read the private audit signing-key table. PostgreSQL direct `SET ROLE hrms_runtime_restricted` via the `postgres` admin connection is intentionally blocked, like Mumbai; a **real restricted-login smoke test is still needed**.
- Storage schema policies and the `storage.objects` / `storage.buckets` ACLs match across the projects; this is a metadata/authorization inspection, NOT a binary file or authenticated document-preview validation.
- Singapore attendance cron remains **disabled**; Mumbai attendance cron remains active. Do not run both together.
- GitHub draft PR #86 contains `scripts/perf008_verify_storage_binary.py`, a read-only SHA-256 check requiring two securely supplied legacy service-role JWTs in separate private key files in a trusted environment. CI runs 44480000866 and 44480000860 passed offline; **the script has not been run against actual private files**.
- No independent Singapore app login, MFA, document download/upload or background attendance tests have been completed. Do not claim a performance speedup or cutover readiness.

**Open gates:** run the actual 27-file binary checksum comparison, verify genuine restricted-role login and all affected application workflows in an isolated test deployment, reconcile final mutable data/session/audit deltas during a write freeze, verify protected Render database host/environment, and obtain an explicitly approved cutover and rollback window. Keep this PR draft. Do not delete Mumbai.

---

## Historical initial preflight (2026-11-18)

At the initial preflight below, the Singapore application tables and Storage metadata were not yet populated; that snapshot is superseded by the 2026-11-19 status above. It remains here for traceability.

## Confirmed projects

| Purpose | Project | Region | Reference | Status |
| --- | --- | --- | --- | --- |
| Live source | Acme HRMS | Mumbai `ap-south-1` | `jtgqkkhqyzfbupiqwkgf` | ACTIVE_HEALTHY |
| Migration destination | Acme HRMS Singapore | Singapore `ap-southeast-1` | `qayankfbodyvrhemoauw` | ACTIVE_HEALTHY |

Render HRMS service `srv-d8ool30js32c738j6ckg` remains in Singapore on its existing `main` deployment. **Do not change its connection settings before full restoration and verification.**

## Source inventory (read-only)

- `public`: **38 application tables**, **84 constraints**, **143 indexes**, **125 RLS policies**, **9 non-system triggers**, and **8 application functions**. Application tables have RLS enabled.
- Custom security schema `hrms_security`: `audit_keys` table and `verified_audit_actor` SECURITY DEFINER function; **never print or commit signing keys**.
- Custom roles: `hrms_runtime_restricted` (LOGIN, no superuser/BYPASSRLS), `hrms_audit_executor` and `hrms_audit_verifier` (NOLOGIN). Maintain the **mandatory SEC-018 `SELECT current_user`** identity verification.
- Supabase Storage: **12 buckets**, **26 objects**, metadata total **8,120,304 bytes** (~7.75 MiB); private buckets must remain private. **Do not copy just storage.objects metadata**—the binary files must move via Storage API/S3.
- Supabase Auth users: **0** (the HRMS application has its own `public.users` records).
- Edge Functions: `send-email` (requires separate authorization/secret review) and `sec019-dev-storage-purge-once` (**one-time destructive cleanup; do not redeploy to Singapore**).
- Scheduled jobs: `daily_attendance_master_job`, active in Mumbai; keep corresponding Singapore job **disabled** before cutover to avoid duplicate attendance processing.
- `vault.secrets` count: 0 at preflight. Check all encryption usage and key migration requirements independently before restoring any encrypted rows.
- Public application tables + indexes occupy approximately 2.5 MiB in source; this is not a substitute for a logical backup or Storage object size.

## Completed preparation in destination

- Created Supabase Free project `Acme HRMS Singapore`, region `ap-southeast-1`.
- Ensured **13 installed Postgres extensions** match Mumbai. The eight originally missing extensions installed by isolated Supabase migrations: `hypopg`, `index_advisor`, `pg_cron`, `pg_net`, `pg_trgm`, `pgmq`, `vector`, `wrappers`.
- Re-read extension list and verified all 13.
- Destination currently has **0 public application tables, 0 Storage buckets, 0 Storage objects, 0 cron jobs, and 0 custom HRMS roles**. It is **not ready for app traffic**.

## Blocking dependency: safe full-fidelity backup and Storage export

Supabase's connected project-management/SQL tools do **not** expose PostgreSQL client connection credentials, a `pg_dump` endpoint, or binary Storage object download/upload. Do not imitate a full backup with ad-hoc table-only SQL copy: it would omit ownership, policies, grants, platform-managed changes, security semantics and S3 object bytes. **No credentials, access tokens, secret keys, password hashes or employee data should be put in this repository, CI logs, or ChatGPT messages.**

Use the official Supabase *Backup and Restore using CLI* guide, from a trusted execution environment with securely configured DB credentials and private encrypted output:

- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/platform/migrating-within-supabase/dashboard-restore
- https://supabase.com/docs/guides/storage/management/download-objects

Existing `scripts/sec018_backup_dev.sh` was written for an **older SEC-018 schema** (`sec018_internal`, `sec018_recovery`) and must **not be run unchanged** on the current `hrms_security` configuration.

### Full migration gate (not executed)

1. Obtain and verify a complete encrypted private source logical backup: roles, schema, data, migration history and any Supabase-managed `auth`/`storage` modifications. Preserve audit signing keys and encryption-root handling securely. Do not reset source credentials.
2. Perform a restore rehearsal into a disposable compatible PostgreSQL environment; verify required policies, constraints, owners, grants, triggers, functions, sequence values and row counts before modifying the Singapore project.
3. Restore into Singapore with the official Supabase supported logical-restore workflow. Restore custom role names and grants, then provision **new secure** passwords for permitted LOGIN roles through protected secret channels; confirm SEC-018 restricted-role sign-in and `current_user` results.
4. Migrate all 12 buckets and all 26 **binary objects** via Storage API/S3 and verify each object's existence/content and privacy status. Never create orphaned metadata rows.
5. Review and deploy only required non-destructive Edge Functions and configure their secrets securely. **Never deploy the SEC-019 one-time purge function**. Preserve email relay SEC-002 authorization.
6. Verify all 38 tables, 125 public policies, 84 constraints, 143 indexes, nine triggers, nine app functions (8 public + 1 `hrms_security`), 3 custom roles, RLS and authenticated/anonymous access boundaries. Check source/destination row counts and checksum strategy.
7. Leave the Singapore cron job disabled until source scheduling is quiesced in a separately approved low-traffic cutover; do not allow two daily attendance jobs to run simultaneously.
8. Take a final consistent backup/delta during a new explicitly approved maintenance window; do not assume earlier source table counts remain current while Render uses Mumbai.
9. Update Render only after all gates pass; test login, admin, employee, candidate, refresh sessions, MFA, attendance, maintenance behavior, payroll, documents/Storage and Edge Functions; validate SEC-012/018/020/021.
10. Measure `/api/news` PDO/identity/SQL stages and TTFB against the PERF-008 baseline. Turn diagnostic variable off afterward. Retain Mumbai intact and accessible for tested rollback. Do not retire until explicit approval.

**Change control:** This readiness PR must remain **draft/unmerged**. It contains no data, passwords or production configuration writes.

## Step 3B — Guarded source snapshot preparation (NOT run)

- Added [scripts/perf008_encrypted_mumbai_snapshot.sh](../scripts/perf008_encrypted_mumbai_snapshot.sh) to this **draft** branch. It is for trusted local execution only, not GitHub Actions or Render.
- The script refuses unknown source projects and credential-in-environment patterns, verifies the current `38 public tables / 3 HRMS roles / 1 private security key table` source signature, and streams `pg_dump` into AES-256 GPG encryption without writing a plaintext archive to disk.
- This artifact covers only application schemas `public` and `hrms_security`; **it does not replace Supabase's full roles/schema/data CLI dump, physical Storage transfer, auth/storage modifications, or encryption configuration**. The backup script was not executed in this chat because the connected tools have no access to a trusted password-protected PostgreSQL dump/export environment.
- Source and destination remained healthy and independent. Render remains on the original Mumbai connection. The new Singapore database remains empty of application records.
- Security, performance and health advisors for Singapore returned no lints before any application schema restoration; run again after the full restore.
