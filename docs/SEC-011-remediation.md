# SEC-011 — Server-side loan ownership, activity reassignment and branch isolation

**Severity:** CRITICAL. **Current state:** CLOSED (2026-11-14) — PR #32 merged, isolated real HTTP/SQL and SEC-009 regression CI passed, and owner-confirmed deployed development-account authorization checks passed. Closure covers SEC-011 record-level authorization scope, not an independently executed production penetration test.

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

## Merge and automated evidence — 2026-11-14

- [PR #32](https://github.com/Kondapaneni/HRMS/pull/32) merged to `main` at `6d7e5b4c793e2ad6a67ddb60aa972d8076221be8`.
- Latest dedicated SEC-011 branch CI <https://github.com/Kondapaneni/HRMS/actions/runs/43579120888> passed: real Slim HTTP requests with synthetic JWTs against a disposable two-branch PostgreSQL fixture, plus source policy assertions and post-mutation database integrity assertions.
- Owner-reported live checks passed on 2026-11-14 (details below). Avoid accessing real customer loan records just to test access. No customer data or tokens were requested for the security verification.

## Owner-confirmed deployed verification — 2026-11-14

The project owner used development employee accounts and synthetic development applications and confirmed:

| Live step | Outcome |
| --- | --- |
| 1 — Own applications | Development employee dashboard, own Loan Origination list and own application details load normally |
| 2 — Same-branch non-owner | Employee B does not see Employee A's synthetic application in their Loan Origination list |
| 3 — Foreign document endpoint | Employee B receives `404 Not Found` when making an empty-document POST to Employee A's synthetic application, without uploading data |
| 4 — Different-branch loan isolation | Branch B employee cannot see Branch A's synthetic application; their own branch's development applications remain accessible |
| 5A — Branch activity permission denied | Without Branch Operations grant: personal activities `200`, branch activities `403` |
| 5B — Granted branch activity | With Branch Operations grant: branch activities `200`, authorized branch activities available |
| 5C — Branch Operations list isolation | First `403` for both branch activities and branch application list due to an ungranted feature on the Branch B testing account; after Admin granted Branch Operations for that account both returned `200`, and Branch A's synthetic application was not listed for Branch B |
| 6 — Admin permission management regression | Admin Dashboard and Admin → Feature Access function correctly. **Admin manages employee features; Admin is not expected to use employee-specific module pages** |

**Verification limitations:** These are owner-reported post-deployment results. The live application checks were primarily read-only, with an empty document-list request to test denied lookup. The destructive and cross-user/cross-branch mutation attempts, activity reassignment rules, records' after-state and audit logs were tested in isolated two-branch synthetic PostgreSQL CI. A passing list filter alone does not independently prove every endpoint secure; the combined scoped backend code and synthetic HTTP/SQL tests underpin the closure. Do not attempt mutation attacks against real loan data.

## Safe live rollout and validation (development records only) — retained test procedure

**Do not run destructive mutation attempts against real customers or use IDs from real applications.** Use separate named development employee accounts in two configured branches and synthetic non-customer loan records. Keep the account/record IDs out of chat.

1. After Render deployment, sign into an employee with Loan Origination access and a valid employee branch. Confirm their **own** development loan drafts/applications load and standard dashboard works.
2. With two loan-enabled development employees in the **same** branch, test a second employee cannot see the first employee's synthetic loan via `GET /api/loans/applications`, while both see their own.
3. Using only an explicitly disposable synthetic development loan and an agreed test account, test a denied foreign application **GET/list and non-mutating lookup**; for mutation checks, use CI (or isolated staging database), not live customer records. Where negative mutation tests are performed in a dedicated staging environment, verify the synthetic owner record remains unchanged.
4. Confirm a Branch Operations development employee can open/edit **their own branch's synthetic transferred application** and cannot access the other branch's synthetic applications.
5. Confirm branch activity creation/reassignment stays within the authorized development branch and only a permitted branch operator can reassign colleagues' synthetic activities.
6. Verify Admin normal functionality and no unexpected 403/500 regressions in loan, branch and activity pages.

**Closure decision (2026-11-14):** PR merged and CI passed; the owner reported all eight planned live substeps passed after the correct Branch Operations permission was granted to the Branch B development employee. Object-level authorization SEC-011 is closed, with destructive/unauthorized mutation behavior verified only against a disposable synthetic CI database. Do not infer resolution of JWT lifetime/revocation (SEC-012), assessment/payroll record permission issues (SEC-013), file validation (SEC-017), other SQL errors (SEC-018) or the maintenance bypass (SEC-020).

