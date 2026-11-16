# SEC-018 Step 2A — Isolated PostgreSQL RLS and least-privilege CI harness

**Status:** Review-only synthetic test implementation. Not a production migration or a closure of SEC-018. The owner has **not** approved merging, deploying, changing database privileges or changing Render credentials.

## Scope and safety boundary

- New workflow: .github/workflows/sec018-rls.yml. Pull-request-triggered and manually dispatchable only; no push-to-main hook or deployment action.
- New harness: tests/sec018_rls_ci.php. Connects only to 127.0.0.1:5432, with the exact database name sec018_rls_ci, exact test-only postgres credentials and GITHUB_ACTIONS=true. If any guard fails or external Supabase/DATABASE_URL environment variables are populated, it aborts before connecting.
- The workflow starts an ephemeral PostgreSQL 16 service inside the GitHub Actions runner. No Supabase project URL, password, key, production record, Render secret or application credential is used.
- The harness creates two CI-only roles and one CI-only schema, all inside this ephemeral PostgreSQL service. This is intentional isolated test DDL, **not live PostgreSQL DDL**.
- Existing HRMS application code, migrations, and configuration are not changed.

## Why this test is necessary

The read-only SEC-018 Step 1E inspection found 38 real public tables with RLS enabled and **no table RLS policies**. All are owned by postgres. The refresh-session table has FORCE RLS. A new ordinary login with DML grants but no RLS policies would not function. Previous tests/sec018_db_test.php exercised permission denials on an abbreviated synthetic schema but did **not** reproduce this missing-policy condition.

In addition, the active Supabase transaction pooler does not support native named prepared statements across transactions. The PHP backend's pooler-safe emulation default must remain unchanged during this work.

## Synthetic objects and boundaries

The harness uses synthetic users Alice and Bob, two synthetic branches, and ten representative tables in schema sec018_ci:

- users, branches, employee, payslips, attendance, loan_applications
- hrms_refresh_sessions (FORCE RLS), audit_logs, email_queue and shift_times

Each table starts with RLS enabled and no policy. A restricted app role and separate mailer role are then granted **representative** minimal SQL permissions, and illustrative per-role RLS policies are installed **only** in the ephemeral database. It validates default denial, allowed ownership-scoped operations, foreign-user/foreign-branch denial, row-count after denied writes, session token-hash update, audit-trigger logging, sequence defaults, mailer separation, DDL/role-switch denial and transaction-local identity reset.

**Known critical limitation (intentionally demonstrated by CI):** custom PostgreSQL configuration variables set through set_config(..., true) are writable by the same SQL login. A compromised SQL query using the backend role can forge another user's identity and defeat illustrative identity-based policies. Therefore these policies MUST NOT be copied to the live Supabase project or described as trusted per-user database isolation. The test records the weakness explicitly as a release blocker. A non-forgeable trusted database identity design and application integration must be assessed separately.

The synthetic pre-auth user lookup is broad, illustrating that the current PHP login flow needs explicit design before applying restrictive users-table RLS. The sample refresh-token test exercises a known synthetic identity; actual pre-auth refresh-token verification cannot assume a user identity before lookup and is **not** solved here.

## SEC-018 Step 1G coverage map

| ID | Scope | Step 2A status |
| --- | --- | --- |
| T01 | Local-only environment and guard rails | Implemented in new CI fixture |
| T02 | No superuser, database/role creation or schema CREATE | Implemented |
| T03 | RLS default deny with SQL SELECT/INSERT grants | Implemented |
| T04 | Illustrative explicit identity RLS policies | Implemented; spoofability explicitly recorded |
| T05 | Admin, Employee, Candidate endpoint authorization | Not covered; reuse/extend synthetic HTTP suites |
| T06 | Forced-RLS refresh issuance and token rotation | Partially modeled; real token/replay/unauthenticated flow pending |
| T07 | MFA enrollment and secrets authorization | Not covered in new harness |
| T08 | Attendance ownership / rejected writes | Partially modeled; geofencing and punch API pending |
| T09 | Payroll ownership | Partially modeled; leave/expenses/assets pending |
| T10 | Recruitment, documents, training, assessments | Pending |
| T11 | Cross-user/cross-branch loan access | Partially modeled; sales/activities/API pending |
| T12 | Sequence, mailer separation, audit trigger | Implemented on representative fixtures |
| T13 | DDL, TRUNCATE and privileged role switching | Implemented |
| T14 | Emulated PDO prepare mode and SET LOCAL reset | Partially modeled; no real transaction pooler exercised |
| T15 | Generic 5xx error sanitization | Existing tests/sec018_http_test.mjs; not exercised by new harness |

GitHub Actions also runs the existing SEC-018 source assertions in the new job. Existing workflows may run additional regressions because their path filters include tests/sec018_*.

## CI acceptance for this Step 2A PR

- The new job runs against the synthetic PostgreSQL service and finishes green.
- No query uses live Supabase or Render credentials.
- Both positive functionality and negative/forbidden SQL checks execute.
- The known identity-GUC spoofability finding appears in the test output; a green test **does not** imply this release blocker has been fixed.
- No change to the development runtime, its database login, RLS policies or application code.

## Later steps — not authorized here

1. Design a trusted (not caller-settable) per-request identity mechanism or explicitly document the weaker backend-only authorization design.
2. Extend the isolated tests to all 38 real table shapes, role-scoped API workflows, pre-auth refresh, MFA, attendance/geofence, candidate, payroll, loan/branch, training, queue and Storage dependencies.
3. Validate a real transaction-pooling proxy in isolated CI; native prepares must not be enabled on the current production-like transaction pooler.
4. Review a least-privilege migration, rollout/rollback, and live testing window separately before any live role creation, GRANT/REVOKE, RLS policy change or Render credential rotation.

**SEC-018 stays OPEN.**

## Step 2C — signed, database-verified request identity proof of concept

**Synthetic-only:** tests/sec018_signed_identity_ci.php runs after the original RLS test in the same disposable PostgreSQL service. No live roles, policies, credentials, application source, Supabase data or Render settings are used or modified. Workflow scope is PR review only.

The fixture creates:
- A random 256-bit HMAC-SHA256 signing key generated in PHP for the CI run, with a copy stored in a private test schema.
- A dedicated NOLOGIN verifier role with read access to that private key, but no application-table ownership, login, superuser, BYPASSRLS or database/schema creation rights.
- A protected SECURITY DEFINER verifier with a locked-down search_path, no PUBLIC EXECUTE, explicit runtime EXECUTE only, and strict parsing of version, subject, branch, audience, 24-hex request ID, issue/expiry timestamps (maximum 60-second lifetime) and HMAC.
- Separate synthetic payroll and FORCE-RLS refresh tables with policies that query the verifier rather than an unauthenticated custom GUC.
- A separate synthetic pre-auth login role that has EXECUTE on only a limited SECURITY DEFINER lookup, with no raw login-table/payroll access; this is **not** implementation of password verification, MFA or real refresh login.

The signed request context is supplied transaction-locally via set_config(...,true). Arbitrarily setting identity strings or tampering with the signed context does not grant access to someone else's rows. The verifier checks the signature each time RLS asks for a claim. The original (unsigned) synthetic demo deliberately remains forgeable as an explicit negative control.

### New POC coverage (P01–P10)

| ID | Isolated assertion |
| --- | --- |
| P01 | Exact test-only database and runtime role |
| P02 | Missing signed context denies payroll and FORCE-RLS refresh reads |
| P03 | Runtime cannot read the key, use the private extension schema or switch to the verifier role |
| P04 | Valid Alice context permits Alice records, blocks Bob records and rejects foreign writes |
| P05 | Forging legacy unsigned user/branch GUCs cannot change verified RLS scope |
| P06 | Tampered subject/branch, unsigned, wrong-audience, expired, future, overlong and malformed tokens are rejected |
| P07 | COMMIT resets transaction-local context; successive Alice/Bob contexts do not inherit each other's scope |
| P08 | **Not implemented**: actual PostgreSQL transaction-pooler proxy (plain local Postgres in CI only) |
| P09 | Signed-context FORCE RLS permits representative authorized refresh updates and denies foreign updates |
| P10 | Separate pre-auth SQL role has only a limited synthetic directory lookup; no protected-table access |

### Important remaining security and compatibility blockers

- The CI PHP signer and SQL verifier both hold copies of one synthetic signing key. This protects against arbitrary SQL forging claims **only if** the PHP signer/key cannot be compromised or invoked to mint arbitrary principals. It is not protection from full backend compromise.
- A valid token can be replayed during its short validity window if stolen; the 24-hex request ID is signed but not tied to a server-side nonce registry. The sample checks token expiry, not revocation, account activation, stale roles, key rotation or sessions.
- All JWT/session and branch claims still need authoritative live validation, including feature revocation and role changes. Unsigned session variables must never be treated as trusted just because they are transaction-local.
- Real HRMS pre-auth login, candidate activation, MFA, password-reset, refresh-cookie and refresh-token verification are **not** implemented by the toy directory lookup. The current refresh rotation finds user identity from a presented credential first, so it requires a separate protected, rate-limited pre-auth transaction path.
- The sample uses its own tables and simple string IDs; it is NOT compatible with the live 38-table schema as-is and cannot be applied as a migration.
- CI runs against localhost PostgreSQL, NOT a true Supabase transaction pooler. The live PHP PDO pooler-safe binding default must not be changed. The middleware's existing set_config(...,false) audit context requires a separate transaction-safe redesign before any use for authorization or reliable audit attribution.
- The verifier is a limited POC, not a production-hardened cryptographic protocol. Its timing behavior, role ownership, key rotation, nonce replay policy, service boundaries, and auth-oracle protections require security review before any live deployment.
- There is no evidence yet that PostgreSQL RLS correctly enforces all real employee/branch/user permissions in the full backend.

**Green CI establishes only this synthetic proof. SEC-018 remains OPEN; PR #57 remains DRAFT. No merge, deploy, live credential change or Supabase SQL change is approved.**
