# SEC-018 remediation — review and release gates

Status: implementation under isolated verification. NOT approved for deployment.
SQL is review-only and has NOT been applied to Supabase. PR #57 is unchanged.

## Security policy

The runtime role receives explicit DML on 38 public application tables, no
ownership or role membership, and no BYPASSRLS. Role-specific policies preserve
backend compatibility; they do **not** implement independent user/branch RLS.
PHP authorization remains the user/branch boundary. SQL injection under this
role can still read/modify records permitted by its table grants.

Prepared statements retain their creating PDO connection. With signed audit
enabled, each operation (including SELECT function calls) receives a signed,
transaction-local identity inside the same transaction. Explicit transactions
are reused; autocommit operations use a short transaction. The verifier must
be available before the operation. Proofs bind to the full PostgreSQL transaction
ID and expire after 60 seconds. Keep a distinct random 256-bit audit key per
database/environment; never reuse JWT_SECRET. PHP verifies authentication and
live session version before assigning an actor. The trigger deliberately does
not recheck the *post-update* token version: logout/password changes increment
it themselves. A compromised application/signing key remains inside this trust
boundary. Legacy app.* session settings no longer establish audit identities.
Public/pre-auth operations are recorded without an actor. Existing audit logs
are retained. Restricted connections require signed audit to be enabled.

Refresh secrets remain hashed. All consumed hashes are retained for the session
lifetime. Unknown secrets are denied without revocation. A consumed secret within
30 seconds of consumption is denied without replacement or revocation. Retries
never extend that interval. A consumed secret after 30 seconds revokes the family.
This deliberately bounds the ambiguity between benign duplicate delivery and
credential theft; a thief using a stolen token within the interval is not detected
by that duplicate alone. Single use is preserved: only one concurrent request
wins; the other receives 401 and must not overwrite a newer cookie. Lost responses
require fresh sign-in because replacement secrets are not stored recoverably.
A retry after 30 seconds can revoke the session even if benign: this is the
explicit security tradeoff. Clients must serialize refreshes and stop retrying
an invalid credential. Expiry, active account, version and client type checks
remain. Expired session rows and their hash histories need operator-owned
retention cleanup; the runtime role has no session DELETE privilege.

## Isolated evidence

`sec018.yml` provisions disposable PostgreSQL 16, applies both actual proposed
SQL files and runs the PHP classes directly and through PgBouncer transaction
pooling with a single backend connection. No production secrets or data are used.
`sec018_adversarial_ci.php` tests connection ownership, signed replay rejection,
commit/rollback, legacy context spoofing, missing verifier, independent-process
refresh races, unknown credentials, lost responses, delayed replay, Data API
roles and prohibited SQL. Existing SEC-008 onward workflows provide additional
HTTP and source regressions. The 38-table fixture has simplified columns and
cannot by itself certify every feature's schema compatibility.

## Controlled deployment (operator only; explicit approval required)

1. Keep deployment blocked until the PR's required suites pass, the complete
   schema/function/trigger/worker inventory has been reviewed and functional
   checks cover the restricted role. Do not run all migrations automatically:
   these review-only scripts must be explicitly selected.
2. In an approved maintenance window stop HTTP writes and background workers.
   Record the deployed application SHA and take a verified schema/ACL/function
   backup and a recoverable database backup. Capture existing policies, grants,
   function owners/bodies and role membership for exact rollback.
3. On a matching isolated restored schema, run `psql -X -v ON_ERROR_STOP=1`
   with `-f supabase/review-only/20261116_sec018_runtime_role_review_only.sql`,
   then `-f supabase/review-only/20261116_sec018_signed_audit_review_only.sql`.
   The first script refuses inventory or policy drift. Review errors, never
   bypass guards. Only after approval repeat on the target with the approved
   migration owner. Do not put a production connection string on the command line.
4. Generate a unique audit key through the approved secrets manager. Provision
   its hex representation as the `v1` row in `sec018_internal.audit_keys` using
   bound parameters and as `SEC018_AUDIT_HMAC_KEY` for the backend. Set
   `SEC018_AUDIT_CONTEXT_ENABLED=true`, keep `DB_PDO_PREPARE_MODE=pooler`, and
   provision a fresh runtime password outside Git. Enable LOGIN on
   `hrms_runtime_restricted` only after checking its attributes/memberships and
   use it for DB_USERNAME. These credential/environment changes require separate
   approval; none are performed by this PR or its tests.
5. Deploy the approved application SHA with coordinated schema/settings changes.
   Retain the separately reviewed existing worker identities. Verify the checks below
   before reopening writes. Never resume using a privileged fallback silently.

## Rollback

Stop HTTP and worker writes first. Restore the previous application SHA and
previous connection configuration only under the approved incident procedure.
Restore exact saved policies, ACLs, trigger function bodies and owners from the
pre-change schema backup; do not use blanket GRANT ALL. Revoke LOGIN from the
new role and terminate its sessions. Retain audit logs and refresh hash history
for investigation; additive history columns can stay during rollback. Rotate
and remove the newly introduced credentials/key after all dependent sessions
are stopped. Reverting to privileged access reopens SEC-018 and must be tracked
as an unresolved incident, not a successful security rollout. Validate rollback
on the isolated restored schema before approving production deployment.

## Read-only inventory (2026-11-16)

Catalog inspection confirmed all 38 public tables have RLS enabled and the
refresh table has FORCE RLS. The real audit key is audit_id (UUID), with a
timestamp column. Seven table audit triggers call process_audit_log; the asset
updated-at trigger is invoker code. The email_queue insert webhook uses
supabase_functions.http_request. The email Edge Function uses its existing
service_role access to claim/update delivery status; those explicit grants are
preserved. The active daily_attendance_master_job runs as postgres, whose
function ownership/execute permissions remain unchanged. These workers are
separate privileged components, not evidence of least privilege for all
infrastructure. No live records, grants, roles, settings or jobs were changed.

## Essential live verification after an approved rollout

Read-only: confirm current_user, role flags/memberships, object ownership,
38-table RLS, refresh FORCE RLS, private key ACL and security-definer ownership.
Using designated synthetic accounts only: verify an audited authorized operation,
a denied cross-user/branch operation with no record change, refresh rotation and
logout, and the email worker. Confirm API failures are sanitized and audit rows
show the expected verified actor. Inspect errors for pooler SQLSTATE 26000.
No destructive live tests or real employee modifications are required.

## Step 1H — explicit deployment hold and outstanding release gates (2026-11-16)

**Decision: NO-GO.** PR #58 must remain **DRAFT, OPEN and UNMERGED**.
SEC-018 must remain **OPEN**. Do not run either review-only SQL migration,
enable a new DB role, provision credentials, change Render settings, or deploy.
The current approved scope is GitHub/documentation and disposable CI only.
There is no authorization to access live Supabase, including read-only schema
queries or generating a new schema export.

### Evidence established by isolated tests (not release approval)

- [x] Proposed backend error-sanitization, no request-time MFA DDL, pooled
  database connectivity, signed audit, restricted-privilege and refresh-replay
  behavior are represented in the draft and tested in disposable CI.
- [x] PostgreSQL 16 + 17 isolated functional/permission coverage includes
  the 38-table synthetic application fixture, 407 pre-migration columns and
  408 post-migration columns, 78 constraints, and nine non-internal triggers.
  The two missing real function bodies are represented by **ACL-only stubs**.
- [x] Five incompatible schema conditions refuse migration with no partial
  restricted role, policy, or refresh-column changes.
- [x] Custom-format backup, both proposed migrations, synthetic post-change
  activity, and full pre-change fixture restore passed on PostgreSQL 16 and 17.
  The restored pre-change schema/ACL/ownership dumps matched exactly; three
  introduced CI roles were cleaned up. This is **not** a rehearsal on an
  authentic restored HRMS database.
- [x] All 13 PR security workflows passed for isolated commit
  `3e5ddb2d61c01b73ce0ad377309f01907243ac48`. Evidence:
  [Step 1F](https://github.com/Kondapaneni/HRMS/actions/runs/43837861858),
  [Step 1G-2](https://github.com/Kondapaneni/HRMS/actions/runs/43840077826),
  [Step 1G-3](https://github.com/Kondapaneni/HRMS/actions/runs/43841566133).
  Any later application/security code change requires its own green CI run.

### Outstanding blockers — all MUST pass before rollout approval

- [ ] **B1 — Trustworthy schema source.** Obtain an owner-approved, sanitized
  *schema-only* snapshot from an authorized channel, including real table,
  column, constraint, index, view, trigger/event-trigger, function, extension,
  cron, schema-default-privilege, role, grant and policy metadata. No real
  employee data, OTPs, tokens, secrets, webhook authorization headers or
  credentials in Git/issues/test artifacts. No existing offline backup is
  available; live extraction remains prohibited without new explicit approval.
- [ ] **B2 — Real routine and worker compatibility.** Review actual definitions,
  owners, grants, dependencies and trigger registrations of
  `public.rls_auto_enable()`,
  `public.enforce_direct_chat_two_participants()`, and the privileged
  attendance/email/audit paths. The isolated versions of the first two are
  ACL-only stubs: do not claim they verify actual behavior or event hooks.
  Confirm that the proposed broad function EXECUTE revocations do not break
  any legitimate existing RPCs/background workers.
- [ ] **B3 — Genuine restored-schema rehearsal.** Recreate a sufficiently
  faithful complete HRMS schema in an isolated environment; validate both
  exact review-only migrations with the full structure and representative
  synthetic HRMS workflows. Fix any grant, ownership, dependency or
  application compatibility regressions and rerun all required CI.
- [ ] **B4 — Recoverable pre-change backup and real-schema rollback.** Verify
  database and schema/ACL/function backups, capture current deployed app
  revision and role/worker state, and rehearse restoration from a matching
  authentic schema. The GitHub synthetic backup/restore is not sufficient.
  Obtain an owner-approved downtime/writer-quiescence and rollback procedure.
- [ ] **B5 — Explicit risk and configuration decision.** Owner reviews that
  role-scoped RLS `USING (true)` is a compatibility boundary, **not**
  database-enforced employee/branch row isolation; PHP authorization remains
  critical. Owner reviews the 30-second refresh-token duplicate policy and
  potential re-login after lost refresh responses. Decide whether these risks
  are acceptable or require additional remediation.
- [ ] **B6 — Separate, explicit DEV change authorization.** Only after B1–B5,
  request owner approval for the exact target environment, maintenance window,
  app revision, SQL order, restricted role provisioning, audit signing key,
  feature setting, transaction-pooler setting, worker coordination, backups
  and rollback trigger. No implicit fallback to privileged credentials.
  **Approval to run tests does not authorize deployment.**
- [ ] **B7 — Approved DEV verification and cleanup.** Under a separate approved
  rollout, use designated synthetic accounts to check Admin/Employee login,
  session refresh/revocation, Employee Directory/Settings, Recruitment and email,
  Attendance/background tracking and daily scheduler, branch/loan/sales access,
  Payroll, audit identity, rejected cross-user/branch actions, and safe API
  error messages. Verify old and new roles, application logs, workers, and
  the expected denied operations; then remove/restore test state safely.
- [ ] **B8 — Owner's release decision.** Confirm no outstanding security or
  functionality regressions, obtain explicit merge/release approval, and only
  then consider marking SEC-018 closed in the issue tracker.

### Stop conditions

A missing real routine definition, unknown dependency/worker privilege, stale
or incomplete schema snapshot, unexpected migration output, failed restore,
unverified backup, employee attendance disruption, privileged runtime fallback,
or failed security CI means **STOP / DO NOT DEPLOY**. Keep PR #58 draft and
SEC-018 open. Log the reason and continue isolated investigation only.

**Latest checkpoint:** Earlier Step 1D included authorized read-only
catalog/worker metadata queries; it did not inspect employee records or mutate
the live database. Steps 1E–1H used GitHub/offline sources and disposable CI.
No live SQL mutation, role/grant change, credential change, Render setting,
deployment, data migration or merge was performed in this remediation review.
The next actionable gate is **B1**, but it is blocked until the owner explicitly
authorizes a safe method of obtaining the missing trusted schema source.
