# SEC-019 — Employee IDs and database integrity (OPEN until live verification)

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

## Planned change in this branch
- Server-generated `EMP-` + 128-bit unpredictable uppercase hex code for both
  Admin employee creation and candidate-to-employee conversion; cannot be
  chosen by the caller. Primary UUIDs, auth and access checks remain unchanged.
- Retain employee-code uniqueness and all existing IDs.
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

## Still to verify before closing
- All required GitHub branch checks pass for the final head commit.
- One protected-main squash merge and Render deployment of the reviewed code.
- Verify new Admin employee creation emits a server-owned opaque employee code,
  including live API authorization checks, without exposing invitation secrets.
- Verify candidate conversion and loan audit flows safely when suitable test
  fixtures exist; preserve prior SEC-018 accepted residual risks separately.
