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
  deletion. Never attach a foreign key to generic varchar audit actor fields.
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
  dependencies, and performs one transactional TRUNCATE **without CASCADE**.
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
No Storage or public-table reset has been executed in this PR.

## Still to verify before closing
- CI: both supported PostgreSQL versions, PHP tests and prior security jobs.
- Reviewed, explicitly authorized DEV migration; post-apply FK/index checks.
- Storage/object reset and app-table reset verified separately, if still desired.
- Admin account bootstrap and login after the reset.
- One-step-at-a-time live Admin, employee, loan, attendance and payroll checks.
- Preserve the earlier accepted SEC-018 residual risks in their own notes.
