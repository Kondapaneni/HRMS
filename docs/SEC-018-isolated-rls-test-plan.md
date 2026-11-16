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
