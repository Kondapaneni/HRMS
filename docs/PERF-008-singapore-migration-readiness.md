# PERF-008 — Singapore cutover verification and recovery status (2026-11-19)

> **Environment classification:** Acme HRMS is a development-only application containing dummy/test data, as confirmed by its owner. The current Render deployment is the development app, not a real-employee production workload. Even so, secure access keys, deployed authentication settings, rollback procedures, and meaningful test evidence must not be invented or exposed.

> **Current status: OPERATIONAL — MONITORING, NOT FULLY VERIFIED.** Render's HRMS service is live in the Singapore compute region and the owner confirmed Singapore connection settings, HRMS login, and dashboard usability. The protected Render database host and credentials were not independently readable through the connected tools. Storage binary integrity is reported complete based on the trusted-environment SHA-256 audit recorded below; a measured application performance improvement has **not** been established.

## 2026-11-19 full binary-verification progress (COMPLETED)

- **PASS — All 27/27 original Mumbai Storage binaries match Singapore SHA-256 bit-for-bit.**
  Executed read-only binary verifier matching `scripts/perf008_verify_storage_binary.py` in trusted non-CI environment using privately supplied project service credentials. Every original file was downloaded directly from both Mumbai and Singapore authenticated storage endpoints; actual byte lengths and SHA-256 digests were computed independently and compared.
- **Original objects verified:** 27 / 27 (100% binary match, 0 mismatches, 0 corruptions, 0 missing).
- **Per-bucket breakdown of verified original binaries:**
  - `attendance`: 5 original files verified ✓
  - `avatars`: 2 original files verified ✓
  - `candidate_documents`: 10 original files verified ✓
  - `job_descriptions`: 1 original file verified ✓ (public PDF)
  - `loan_documents`: 6 original files verified ✓
  - `loan_signatures`: 1 original file verified ✓
  - `offer_letters`: 1 original file verified ✓
  - `resumes`: 1 original file verified ✓
  - Empty original buckets confirmed empty: `app_builds` (0), `expenses` (0), `holidays` (0), `training_videos` (0).
- **Newer Singapore-only objects preserved:** 1 newer post-cutover attendance file (`attendance/attendance-16804125-1795077652636-aad3f085bd431dd5c76b92d9448ffb14.jpg`, 41,421 bytes, uploaded 2026-11-19 14:10:53 IST) was identified, left untouched, and not overwritten or deleted.
- **Bucket configurations:** All 12 bucket privacy settings (`public`), size limits, and allowed MIME types confirmed matching between Mumbai and Singapore.
- **No credential exposure:** Private service-role credentials were read strictly from ephemeral local storage files with strict permissions and removed immediately after verification; never committed, logged, or uploaded to CI.

## 2026-11-19 Render application latency evidence (measured, not a controlled migration benchmark)

The Render service `srv-d8ool30js32c738j6ckg` is confirmed deployed in Singapore. Its Render Metrics API exposed CPU/memory samples but **no HTTP latency or HTTP request-count samples**, including when filtered to the app hostname and `/api/news`. Instead, read-only Render application logs were analyzed: PHP `AUDIT: [GET] /api/... took ... seconds` records measure actual **backend processing time**, excluding connection establishment, Render edge transit, browser JavaScript and rendering. The two days were not load-matched, and the earlier protected Render database host was not independently exposed to these tools. The observed changes therefore **cannot be attributed exclusively to a database-region migration**.

| GET endpoint | Nov 18 server p50 / p95 | Nov 19 server p50 / p95 | Logged timing samples (Nov 18 / Nov 19) |
| --- | ---: | ---: | ---: |
| Public `/api/news` | 770.3 / 957.6 ms | **43.8 / 122.1 ms** | 50 / 50; all accompanying access-log statuses 200 |
| Employee attendance | 1,271.9 / 1,679.6 ms | **202.5 / 411.5 ms** | 33 / 50 |
| Employee profile | 3,439.1 / 4,531.6 ms | **393.2 / 1,095.2 ms** | 34 / 49 |
| Employee leaves | 4,513.1 / 5,976.6 ms | **422.3 / 1,100.0 ms** | 32 / 50 |
| Employee payroll | 1,288.1 / 1,652.0 ms | **128.8 / 495.7 ms** | 31 / 50 |

The November 18 employee samples are largely from **16:42–17:31 UTC**, while November 19 samples span approximately **08:49–10:32 UTC**. News samples are from November 18 **20:42–21:31 UTC** and November 19 **11:15–11:39 UTC**. Employee samples on November 19 contain a small number of 401 responses (and a 503 profile response in accompanying access logs), whereas the sampled November 18 employee requests were 200; the reported logged durations were not status-paired and are **observational only**. The original samples were analyzed in memory; raw request paths with tokens, headers, user data and log messages were not committed.

**Additional external, network-inclusive HTTP baseline (2026-11-19):** A no-credentials, read-only GitHub-hosted runner performed 25 GETs per public endpoint, after two warmups, against the Singapore Render URL. See successful [GitHub Actions run #44519127505](https://github.com/Kondapaneni/HRMS/actions/runs/44519127505), temporary [measurement PR #91](https://github.com/Kondapaneni/HRMS/pull/91), and the source-only workflow `.github/workflows/perf008_live_public_latency.yml` on this PERF-008 branch. All 50 measured requests returned HTTP 200. Times include HTTPS client/network/Render response handling from the runner; they are **not** user-in-India measurements or protected-account requests.

| Public endpoint | Response-headers p50 / p95 | Full-response p50 / p95 | Full-response maximum | Measured |
| --- | ---: | ---: | ---: | ---: |
| `GET /version.json` | 295.6 / 773.1 ms | **295.7 / 773.2 ms** | 5,479.0 ms (one long-tail sample) | 25 / 25 succeeded |
| `GET /api/news` | 333.1 / 515.4 ms | **333.2 / 515.5 ms** | 799.1 ms | 25 / 25 succeeded |

The benchmark used unique public read-only URLs, `Cache-Control: no-cache`, and 0.65 seconds between requests. No service-role keys, cookies, authentication, Storage objects or mutations were involved. The extra `/version.json` tail sample above 5 seconds is retained in the report; do not describe p95 as a worst-case bound.

**Still not established:** a comparable external Mumbai/pre-cutover HTTP p50/p95 baseline and authenticated end-to-end dashboard timings on both hosts. The observed backend API differences are encouraging, and current Singapore public-network latency is now quantified, but a causal percentage speedup cannot be justified. Keep PERF-008 **Operational — Monitoring**, not fully closed, until the remaining evidence/risks are explicitly accepted.

## Latest post-cutover evidence — read-only checks

- Both Supabase projects are ACTIVE_HEALTHY; Mumbai (`jtgqkkhqyzfbupiqwkgf`) is preserved and Singapore (`qayankfbodyvrhemoauw`) is serving new HRMS activity.
- **Attendance scheduler:** Mumbai `daily_attendance_master_job` disabled, Singapore enabled; no double-scheduling observed.
- **Database:** 38 shared application tables, 410 shared column definitions, 125 public RLS policies, no `anon`/`authenticated` direct public HRMS table grants. The 40 extra Singapore columns have been retained. At the latest comparison, Mumbai had 151 rows and Singapore 158; 32/38 tables matched common-column fingerprints. Singapore contains newer audit/session, loan and rate-limit data; `attendance` also changed. Do **not** roll back to Mumbai by simply swapping connection strings or overwriting Singapore's newer records.
- **Storage:** Mumbai has **27** original objects; Singapore has **28**. Every one of the 27 original path/size/ETag metadata entries matches Singapore. The additional Singapore-only attendance image was uploaded **2026-11-19 14:10:53 IST** (41,421 bytes). **Actual 27/27 binary SHA-256 equality is now fully verified** (100% bit-for-bit match across all 27 original objects, 0 mismatches, 0 corruptions), with the newer Singapore-only attendance file preserved untouched.
- **Performance:** The prior SQL-only microqueries completed in 0.1–0.2 ms but are not HTTP timings. **New evidence above:** measured November 18/19 application PHP processing p50/p95 from live Render logs and current Singapore external public HTTP p50/p95 from GitHub Actions. Render's built-in HTTP metrics remain empty. **No controlled migration-attributable speedup or authenticated end-to-end p95 has been demonstrated.**
- **Backup/rollback:** Mumbai remains healthy but contains older data. Available Supabase connector tools expose neither managed backup snapshots nor restore operations. **A verified restorable recovery point and reverse-delta restore rehearsal remain outstanding.** No source data should be deleted.

## Remediation added after cutover

1. Updated `scripts/perf008_verify_storage_binary.py` to compare all **27 original Mumbai binaries** against their Singapore counterparts while **allowing new Singapore-only files**. Missing original files, altered bytes, altered bucket privacy settings and unexpected source counts still FAIL. It never reads, modifies or deletes destination-only files.
2. Added isolated, credential-free regression cases in `tests/perf008_storage_verifier_test.py` and wired them into `.github/workflows/perf008_migration_preflight.yml`. **Offline test success is not the real private-file SHA-256 result.**
3. **Owner requested removal of Singapore backups for this dummy-data development project.** Singapore Supabase is on the **Free** organization plan, which does not include automatic scheduled database backups. A read-only inspection found no backup/archive/snapshot objects in Singapore Storage; its 28 objects remain application data. No managed backup inventory or deletion endpoint is exposed via the connected tools. The unused `scripts/perf008_encrypted_singapore_snapshot.sh` helper was removed from this draft PR; it had never been executed and was never stored on the Singapore server. This action did **not** delete live HRMS data or any provider-managed backups.

## Remaining closure evidence

- **COMPLETED:** Run the read-only **27/27 private binary** integrity checker from a trusted environment with privately supplied project credentials; all 27 original files verified bit-for-bit, and new Singapore-only file preserved.
- **PARTIALLY COMPLETED:** A real post-migration **public HTTP** p50/p95 baseline and protected backend-processing log distributions are recorded above. Still needed for full closure: representative **authenticated browser/dashboard end-to-end** timings, and a controlled/pre-cutover external HTTP baseline if one can be recovered. No percentage improvement claim is yet justified.
- **Singapore backup/restore verification intentionally waived by owner for dummy-data development.** There is no confirmed backup copy in Singapore Storage to remove, and the Free plan has no automatic database backups; managed backups, if any, are not directly inspectable with the connected tools. Without a backup, newly created Singapore dummy data may be unrecoverable if deleted or corrupted. A rollback to Mumbai still requires reconciliation of newer Singapore records if those records are to be retained.
- Keep PR #86 draft and PERF-008 **Completed — Monitoring**, not **fully verified/closed**, until these checks are supported by evidence. Do not delete Mumbai.

---

## Archived 2026-11-19 pre-cutover investigation (historical; not current configuration)

The following pre-cutover evidence and migration plan is retained for traceability. Its references to Singapore being inactive/empty and the Mumbai scheduler being active were correct **at the time of the earlier steps** but have since been superseded. Do not apply the historical deploy instructions against the live post-cutover setup.

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
