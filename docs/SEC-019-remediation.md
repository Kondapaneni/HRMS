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

The connected Supabase SQL connector does **not** provide an object-delete
endpoint or app-service-role secret. No reset has been executed by this PR.
Never claim full wipe completion from an SQL-only storage metadata deletion.

## Still to verify before closing
- CI: both supported PostgreSQL versions, PHP tests and prior security jobs.
- Reviewed, explicitly authorized DEV migration; post-apply FK/index checks.
- Storage/object reset and app-table reset verified separately, if still desired.
- Admin account bootstrap and login after the reset.
- One-step-at-a-time live Admin, employee, loan, attendance and payroll checks.
- Preserve the earlier accepted SEC-018 residual risks in their own notes.
