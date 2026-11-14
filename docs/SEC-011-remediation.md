# SEC-011 — Server-side loan ownership, activity reassignment and branch isolation

**Severity:** CRITICAL. **Current state:** Code implemented on a feature branch with isolated automated regression tests. **Do not mark CLOSED until PR, CI, deployment and owner-led live verification are confirmed.**

## Scope and root cause

[Original SEC-011 finding](../AUDIT_REPORT.md) reported ID-only mutation endpoints in three operational modules: `origination_loans_application_routes.php`, `origination_activities_routes.php`, and `branch_operations_application_routes.php`. SEC-009/010 guard module/role/feature access, but **not which record a permitted employee may edit**. In the previous code, a loan origination employee could overwrite another creator's draft or change documents/status/delete a known application ID; a branch officer could edit a loan from another branch by ID; and a branch-authorized employee could reassign any activity ID.

## Implementation

- `backend/src/Security/OriginationAccess.php` centralizes server-derived identity/branch and parameter-bound SQL ownership scopes. For a non-admin loan-originator, mutations and lists require **both** `created_by = current JWT user ID` and `branch = current server-side employee branch`. Explicit authenticated admins retain global access. No owner, role or branch value from request JSON is trusted as authorization proof.
- `POST /api/loans/applications`: validates linked leads belong to the caller/branch, scopes draft lookups by creator and branch, refuses a supplied existing foreign/non-editable draft ID, and repeats the ownership predicate inside `UPDATE`. New records derive `created_by` and `branch` from the backend.
- `GET /api/loans/applications`: lists only owned current-branch loans for delegated staff (admin remains global).
- `POST /api/loans/applications/{id}/documents`, `DELETE /api/loans/applications/{id}/documents/{docKey}`, `PATCH /api/loans/applications/{id}/status` and `DELETE /api/loans/applications/{id}`: all resolve the application with a scoped server-side query. Status and DELETE SQL also recheck ownership in the mutation predicate. Deletes resolve **one exact row** first rather than bulk-delete all loans sharing a lead alias. Unauthorized/missing records return uniform `404`.
- Prevent legacy lead-ID document alias collisions: a loan document keyed by a lead ID is retrieved/deleted only when **exactly one** application across all branches refers to that lead. Batched listing uses one grouped duplicate-key query to avoid N+1 lookups.
- Loan originators may save `Draft` or `Created`, but may not grant themselves an `Approved`/other privileged status. Non-admin `PATCH` status transfer is only `Created → Under Review` with a `Branch Operations` timeline event. Staff cannot forge stage/timeline/creator/branch metadata via the initial draft form payload. Admin exception is deliberate.
- `PUT /api/branch-operations/applications/{id}`: requires a real employee profile **and current branch** for delegated staff (no fake `Branch Officer` fallback), filters both lookup and `UPDATE` by current branch, and rejects records that have not reached the Branch Operations stage or remain drafts. Admin role retains explicit global access and uses its real account identity in audits. Audit records are written only **after** a successful scoped update to avoid logging rejected writes.
- Origination activities: teammate creation, branch rosters, colleague completion and reassignment now check the `canBranchOperations` grant. Reassignment requires the current activity assignee and new target to be active employees in the caller's current branch; the `UPDATE` also repeats the branch predicate. Other loan/sales employees can still create and complete personal activities but cannot manipulate colleagues' branch activities. Admin retains explicit global reassignment/management privileges.

## Automated evidence

`.github/workflows/sec011.yml` runs against a **disposable isolated `sec011_test` PostgreSQL database**, never production. The test suite creates synthetic users, branch A/B employees, admins, loan drafts/transfers, overlapping lead identifiers, documents and activities. It tests:

- Same-branch and cross-branch unauthorized draft overwrites, lead linking, document writes/deletes, status changes, deletion and loan listing.
- Legitimate owner actions and admin read/status update.
- Missing employee branch profile, foreign-branch Branch Operations edit, same-branch authorized branch edit and premature/draft-stage rejection.
- Authorized versus denied activity reassignment, unauthorized new assignees in another branch, personal/branch activity reads, same-branch status updates and admin override.
- Database after-state assertions that forbidden requests did not alter another user's records, documents or audit trail.

Passing CI and merged code are **not proof that the deployed database has no legacy exceptions**. Existing rows missing creator/branch metadata may need controlled, audited data repair before employees can edit them. Do not relax the ownership predicate to accommodate bad data.

## Safe live rollout and validation (development records only)

**Do not run destructive mutation attempts against real customers or use IDs from real applications.** Use separate named development employee accounts in two configured branches and synthetic non-customer loan records. Keep the account/record IDs out of chat.

1. After Render deployment, sign into an employee with Loan Origination access and a valid employee branch. Confirm their **own** development loan drafts/applications load and standard dashboard works.
2. With two loan-enabled development employees in the **same** branch, test a second employee cannot see the first employee's synthetic loan via `GET /api/loans/applications`, while both see their own.
3. Using only an explicitly disposable synthetic development loan and an agreed test account, test a denied foreign application **GET/list and non-mutating lookup**; for mutation checks, use CI (or isolated staging database), not live customer records. Where negative mutation tests are performed in a dedicated staging environment, verify the synthetic owner record remains unchanged.
4. Confirm a Branch Operations development employee can open/edit **their own branch's synthetic transferred application** and cannot access the other branch's synthetic applications.
5. Confirm branch activity creation/reassignment stays within the authorized development branch and only a permitted branch operator can reassign colleagues' synthetic activities.
6. Verify Admin normal functionality and no unexpected 403/500 regressions in loan, branch and activity pages.

**Closure condition:** Source/CI pass, merged PR and Render deploy verified, owner confirms safe live authorization/functional regression tests. The remaining JWT lifetime/revocation risks (SEC-012), input/document upload hardening (SEC-017), and other SQL/data quality findings are tracked separately.

