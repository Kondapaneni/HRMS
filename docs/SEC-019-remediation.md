# SEC-019 — Employee IDs and database integrity (CLOSED — live verified 2026-11-17)

## Verified 2026-11-17: baseline
- GitHub main inspected at 071fbe445eab1d160d383d559a586d8e1bc564ea.
- The Admin creation route used `uniqid()` for public employee codes.
- Employee codes have a UNIQUE rule; the existing column supports 50 characters.
- Connected Supabase project: **Acme HRMS**, ref `jtgqkkhqyzfbupiqwkgf`.
- Existing `payslips.employeeId`, `attendance.employeeId` and `leaves.employeeId`
  reference `public.users` with ON DELETE CASCADE.
- The loan application audit table has no FKs despite valid existing application
  and editor references. The generic `audit_logs` table keeps varchar actor
  and entity IDs; it is not safe to cast those arbitrarily.
- 15 existing `loan_documents.application_id` values do not match
  `loan_applications.application_id`; an unconditional FK would break the
  current document paths. **Do not add one without investigating all writers.**
- This is confirmed schema state, not proof of employee cross-access or data loss.

## Implemented remediation and historical change notes
- Initial SEC-019 remediation introduced server-generated `EMP-` + 128-bit
  random hex display codes; the owner subsequently requested exactly eight
  numeric digits. PR #67 deployed `random_int(10000000, 99999999)` with
  bounded retries and database-enforced uniqueness for **future** employee and
  candidate-conversion IDs. Display codes are **never authorization secrets**.
  Internal UUIDs and access checks remain authoritative.
- Existing IDs were retained by the deployed change. The owner separately
  authorized a one-record DEV test display-code update; no bulk conversion
  or user UUID edits were required.
- Change only three verified history cascades to RESTRICT.
- Add loan application audit references (application UUID, business code and
  editor UUID) that protect audit relationships and prevent accidental parent
  deletion. A composite reference keeps the business code and UUID tied to
  the same application. Drafts can retain the UUID fallback used by existing
  API responses. Generic varchar audit actor fields remain separate.
- Automated tests use **disposable local PostgreSQL**; no live accounts,
  invitations or data are touched by CI.

## Separate owner-requested DEV reset — deliberately NOT a migration
The owner stated Acme HRMS is development-only and asked to remove all
application data and storage files. This resets historical test records,
including the Admin account, invalidates active sessions and can stop further
HRMS login until a new Admin is bootstrapped. It must be scheduled as a
separate verified operation, not embedded in a migration or app startup.

Before clearing any data, confirm the project ref and Render backend target,
stop writers/jobs/tracking/email delivery and prepare a reviewed Admin
bootstrap flow. Inventory every public table, auth user and storage object.
Clear **Storage objects via the Supabase Storage API or Storage Dashboard first**,
not by `DELETE FROM storage.objects`; SQL metadata deletion leaves physical
objects orphaned. Keep storage buckets, their privacy policies and migration
history intact, unless the owner explicitly asks to remove that infrastructure.
Then clear application rows in a reviewed transaction without
`CASCADE` schema drops; keep database structures, extensions, roles,
security policies, migration history, and internal SEC-018 schemas.
Verify object counts and each application-table count afterward.

Two **review-only** reset helpers are staged:
- `frontend/scripts/sec019_purge_storage.mjs` uses the official Supabase
  Storage `emptyBucket` API for the exact, reviewed 12 DEV buckets. It has a
  no-delete inventory mode by default, verifies exact project URL and bucket
  names, and requires an explicit independent environment confirmation for
  `--execute`. Its service key is read **only from local environment**,
  never a browser/Vite variable. Run it only from an owner-controlled terminal
  with Node dependencies installed. Empty requests may be queued; verify actual
  object counts before advancing.
- `scripts/sec019_dev_public_reset_review_only.sql` lists exactly 38
  reviewed public application tables, has a session-bound approval latch,
  checks that Storage is empty, checks table-inventory drift and private
  dependencies, and performs one transactional TRUNCATE **without CASCADE**
  while preserving sequence positions.
  It is **not** applied by deployment, CI, or migrations.

A third reviewed helper, `scripts/sec019_bootstrap_admin.php`, provides
a local CLI-only Admin bootstrap AFTER the reset. It refuses to run if users,
employees or Storage objects remain; it requires an exact DEV confirmation
and a private Admin email in local environment variables. The new Admin
gets a 192-bit random temporary password printed **only locally** once,
with mandatory password change on first login. DB credentials and password
are never written into the repository. An Admin insertion will produce a
new signed-audit-compatible historical row with unknown actor unless an
approved actor context is provided; no previous audit history is restored.

**Important:** A total data wipe removes the only Admin account. The app
is unusable until the bootstrap has completed successfully. The operator
must have access to the reviewed DB setup credentials and be able to run
this CLI helper before starting the destructive reset. Pause all live DEV writers and confirm that plan
before either reset helper is executed. The connected Supabase SQL connector
does **not** provide an object-delete API or service-role credentials.
The reset was an independent owner-authorized operation, not part of this PR's code or CI.

## Owner-approved DEV reset and live checks (2026-11-17)
- Confirmed all 12 approved Supabase Storage buckets still exist, with **zero**
  object records (previously 232 across 11 nonempty buckets). Storage cleanup
  was performed separately using the supported Supabase Storage API/UI.
- Confirmed all 38 public HRMS tables exist and test-business data has been
  reset: 33 tables had zero rows at inspection; remaining rows were newly
  created admin, settings, audit, refresh-session and rate-limit records.
- New Admin account bootstrapped separately; owner confirmed that the Admin
  login, Dashboard and Settings work after the reset.
- Confirmed live SEC-019 history FKs are ON DELETE RESTRICT; four loan audit
  foreign keys, an application identity UNIQUE rule and related indexes exist.
- Supabase had the DDL applied before migration history was registered. The
  migration was made safe to replay and PG 16/17 CI now tests application twice.
- Supabase migration `20261117192545_sec019_reconcile_integrity_after_dev_reset`
  was applied successfully through the migration API; its file name now matches
  the recorded version. Post-apply constraints were independently verified.
- Supabase security advisor reported zero active lints at time of inspection.
- Temporary `sec019-dev-storage-purge-once` Edge Function has been replaced
  with a nonfunctional HTTP 410 response and JWT verification enabled. It is
  not a cleanup endpoint anymore; its function record awaits later deletion.
- All prior audit risk notes concerning legacy loan-document aliases remain
  in scope for future investigation, not silently cast to a stronger FK.

## Closure decision — 2026-11-17: VERIFIED / CLOSED

All agreed SEC-019 live verification steps have now passed:

| Verification | Evidence |
| --- | --- |
| 4A — Admin employee creation | Owner passed; record confirmed directly in Supabase |
| 4B — New eight-digit ID | Owner PASSED live UI test |
| 4C — Anonymous admin API denial | Owner PASSED (401) |
| 4D — Candidate conversion | Owner PASSED; independently confirmed below in live DB |
| 4E — Loan audit functional check | Owner PASSED |
| 4F — Admin regression | Owner PASSED |

### Candidate conversion postconditions independently queried in Supabase

- Exactly **one** converted application, with status `Converted to Employee`.
- The associated user has role `employee` and is active; its
  `token_version` was incremented to **1** during conversion.
- Exactly **one** employee row links to that candidate's existing UUID.
- The server-generated employee display ID is **40213258** (eight decimal
  digits); the employee and user email fields match.
- Exactly **one** `Converted to Employee` application-timeline event exists.
- The live employee directory contained two records; both IDs were numeric,
  eight-digit, distinct, and covered by the existing UNIQUE constraint.
- This conversion was performed by the owner through the Admin Recruitment UI;
  all verification queries were read-only. No candidate was converted by CI.

### Source, CI, deployment and database

- PR #66: reviewed SEC-019 security implementation and integrity migration.
- PR #67: owner-requested eight-digit numeric employee labels.
- PR #68: PDF-only candidate resume UI and secure activation/resend workflow.
- PR #70: completed authorized atomic conversion (PR #69 was superseded/closed).
- All **nine required workflows** passed for PR #70 before its single squash
  merge commit `bc83f89fb08bd93d31c1bf49972ee4a5049ccf3e` on `main`.
- Render service `HRMS` deployed that exact SHA and is **LIVE**. Deployment
  health returned HTTP 200; no error-level logs appeared in the checked window.
- Migration `20261117192545_sec019_reconcile_integrity_after_dev_reset`
  exists in Supabase migration history; the scoped SEC-019 foreign keys and
  loan application audit constraints were verified in prior live checks.
- Supabase security advisor returned **zero active security findings** on
  the closure check.

### Non-blocking follow-up / accepted limits

- `sec019-dev-storage-purge-once` still exists as a Supabase Edge Function
  record. Its deployed v2 code was **independently inspected**: it only returns
  HTTP **410 Gone**, with `verify_jwt=true` and no deletion logic. Remove
  this abandoned function entry during routine DEV housekeeping if a supported
  deletion pathway is available; do not silently grant it any powers.
- Legacy `loan_documents.application_id` values were previously observed in
  multiple identifier formats. No unsafe unconditional FK was introduced.
  Investigating and normalizing those aliases is **separate future work**, not
  an assertion that those records already have a new FK.
- The one-use activation and conversion tests were exercised in isolated CI;
  the live completion decision is based on the owner's authorized UI tests
  and independent database postconditions, not on unperformed destructive tests.

**SEC-019 security remediation: CLOSED.** All listed closure gates were
satisfied. The two tracked limits above are not concealed or described as
completed fixes.
