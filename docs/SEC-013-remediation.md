# SEC-013 — Salary boundaries and assessment assignment / timer enforcement

**Severity:** HIGH. **Status:** CODE IMPLEMENTED / SYNTHETIC CI PASSED / LIVE DEVELOPMENT VERIFICATION PENDING. **Implementation:** [PR #43](https://github.com/Kondapaneni/HRMS/pull/43). **Scope:** Development-only security remediation, not production clearance.

## Original audit finding

[AUDIT_REPORT.md](../AUDIT_REPORT.md#issue-id-sec-013) identifies sensitive salary disclosure in `GET /api/admin/employees` when the caller has a delegated non-payroll feature, and employee assessment routes that did not consistently verify `assigned_employee_ids` or the assessment deadline on the server.

The new source review also found related compensation disclosures in `GET /api/admin/employees/{id}`, its recent payslips and historical salary timeline entries, plus salary mutation paths through employee edits, creation, conversion and promotion. These are protected in the same remediation.

## Changes in PR #43

### Compensation data and writes

- `App\Security\CompensationAccess` checks the authenticated principal's live `user_feature_access.canPayroll` for delegated employee, HR or manager roles; the globally privileged `admin` role retains compensation access. The grant check is fail-closed on missing/malformed grants. It does not trust client-claimed permissions.
- `GET /api/admin/employees` selects `NULL::numeric AS salary` for non-payroll delegated readers, rather than fetching salaries and hiding them only in JavaScript.
- `GET /api/admin/employees/{id}` returns `salary: null`, no `recentPayslips`, and removes salary/pay/rupee-related timeline events for non-payroll delegates.
- `PUT /api/admin/employees/{id}`, `POST /api/admin/employees/{id}/promote`, `POST /api/admin/employees/convert`, and `POST /api/employees` deny unauthorized compensation changes with **403**. Legitimate non-salary directory changes are not blocked.
- Admin Employee Directory, Edit and View components represent missing salary as **Restricted**, not ₹0, and avoid submitting a redacted salary from a normal non-payroll editing flow. Client-side controls are usability measures, not the security boundary.

### Assessment assignment, ownership and deadlines

- `GET /api/employee/assessments/{id}` and `POST /api/employee/assessments/{id}/start` filter in PostgreSQL to **active and explicitly assigned** assessments. The existing list already filters by assignment.
- `PUT /api/employee/assessments/attempts/{attemptId}/save` and `POST .../submit` require all of: attempt belongs to authenticated user, `in_progress`, assessment `Active`, current employee still in `assigned_employee_ids`, and the PostgreSQL clock within `start_time + duration_minutes + 30 seconds`. The extra 30 seconds is a narrowly bounded grace for the final browser autosave and submit over the network. Both routes lock the attempt row to prevent competing writes/submissions.
- Expired `/start` resumptions deny further question access. `GET /attempts/{attemptId}/result` now checks current assignment as well as attempt ownership. Unassigned or revoked students cannot retrieve a previous result via a known ID.
- Assessments configured with non-positive `duration_minutes` retain existing untimed behavior. This is a configuration choice, not something the browser can change for an existing assessment.
- No schema migration is required; read-only Supabase inspection confirmed `assessments.assigned_employee_ids` is `jsonb` and `assessment_attempts.start_time` is `timestamptz`.

## Isolated CI (no live mutation)

`.github/workflows/sec013.yml` runs a dedicated `sec013_test` PostgreSQL instance with synthetic, fixed UUIDs. `tests/sec013_seed.php` **refuses to run against any other database**; the test JWT secret is synthetic and is not deployable. Real HTTP tests cover:

- Assets-only employee, employees-directory-only employee, payroll-authorized HR and Admin roles, including directory and detail salary redaction, payslips, historical timeline, promotion/salary edit and permitted non-salary edit.
- Assigned vs unassigned assessment detail/start, unauthorized attempts by known UUID, post-assignment-revocation save/submit/result denial, expired resume/save/submit denial, and successful fresh save/submit/result.
- Isolated PostgreSQL postconditions confirm salary unchanged, expired/revoked attempts untouched, and exactly one normal graded attempt.
- PHP lint, JS checks and Vite production build. Existing SEC-009 role regressions and Android CI run when paths overlap.

## Live development gates before closure

1. **Source/CI:** Require all focused SEC-013 jobs and important cross-issue regressions green, merge PR #43 and confirm development Render deployment. No live employee data modifications by CI.
2. **Admin payroll positive regression:** After deploy, development Admin → Employees shows valid salary values and employee view/payslips where relevant. Don't publish salary values in chat.
3. **Delegated negative role:** Using a synthetic development employee account with **assets only** (no payroll feature), verify that `GET /api/admin/employees` returns `salary: null`; Employee Dashboard still operates. Then with **employees only** (not payroll) verify detail salary null, recentPayslips empty, and denied malicious salary PUT/promotion using synthetic data only. Restore feature access after testing.
4. **Payroll positive role:** Grant `canPayroll` alongside `canEmployees` for the development test HR/employee account and confirm salary becomes visible. Revoke grant and verify the existing session loses salary visibility on the next API call.
5. **Assessment negative:** Identify only a synthetic development assessment ID assigned to test employee A and **not** to test employee B; B's details and start are denied without modifications. Verify the assigned A can start and submit a normal assessment.
6. **Timer negative:** The isolated CI already tests expired attempts by setting synthetic PostgreSQL `start_time`. Do not modify real attendance, assessments or student attempts to force timeouts on the connected development database without an approved safe test fixture. A live 30-second grace/expiration test is optional after an explicit safe fixture has been arranged.
7. **Closure:** Mark SEC-013 CLOSED only when the owner reports the scoped live results, environment is restored, and evidence boundaries are documented.

**Residual risks:** Other compensation or assessment endpoints beyond those enumerated here may warrant separate review. Non-positive duration remains untimed by design; ensure staff have correct configuration privileges. SEC-014, SEC-015, SEC-018, SEC-021 and other independently tracked findings remain open. This change does not clear HRMS for real-user production use.
