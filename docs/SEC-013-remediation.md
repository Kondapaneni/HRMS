# SEC-013 — Salary boundaries and assessment assignment / timer enforcement

**Severity:** HIGH. **Status:** CLOSED 2026-11-15 — SOURCE MERGED / FOCUSED SYNTHETIC CI PASSED / OWNER-CONFIRMED DEVELOPMENT LIVE TESTS AND CLEANUP. **Implementation:** [PR #43](https://github.com/Kondapaneni/HRMS/pull/43), [PR #44](https://github.com/Kondapaneni/HRMS/pull/44). **Scope:** Scoping of the reported development test results, not an independent production penetration test or production clearance.

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

## Assessment calendar follow-up — PR #44

During owner-led SEC-013 Step 7A, the employee Assessment Portal displayed **2026-11-14** shortly after **01:04 IST on 2026-11-15**. The frontend had used `new Date().toISOString().split('T')[0]` (UTC day) while PHP enforces `date('Y-m-d')` in `Asia/Kolkata`. [PR #44](https://github.com/Kondapaneni/HRMS/pull/44) replaced the assessment list and employee navigation's differing date calculations with a shared `Asia/Kolkata` calendar-day hook, refreshed on interval/tab resume and in day-keyed assessment queries. GitHub Action `.github/workflows/assessment-date.yml` passed regression cases around IST midnight (including 01:04 IST), different browser time zones, calendar rollovers and Vite production build. Render was confirmed live at commit `29bf21796b1bd0c71a0d1ed444107a5dedb944ac`; owner confirmed Step 7A-1 displayed **2026-11-15** after refresh.

## Completed development live verification — owner-reported, 2026-11-15

The test operator explicitly reported the following scoped checks as **PASSED** after PR #43 deployment, PR #44 deployment for the calendar correction, and the final cleanup. These are *owner-reported application observations*, not direct independent reproduction of all live requests:

| Test | Confirmed scoped result |
| --- | --- |
| SEC-013 Step 1 | Admin Dashboard/Employees directory and employee detail accessible; Admin salary visible. |
| Steps 2–3 | Assets-only (no Payroll) and Employees-without-Payroll delegated employee directory returned 200 with `salary: null`; detail 200 with `salary: null`, empty payslips and redacted salary history; Employee Dashboard worked. |
| Step 4 | Salary edit `PUT` and promotion `POST` directed only to a random **fake employee UUID** were rejected with 403; no actual employee compensation data changed. |
| Steps 5A–5B | Turning Payroll ON exposed salary to a permitted development delegate with 200, then turning Payroll OFF immediately returned null salaries on **the same logged-in session**, while Employees remained ON. |
| Steps 6A–6B | Unassigned development employee's assessment list 200 did not expose the test assessment; detail 404; unauthorized start 403. |
| Steps 7A-1–7A-3 | Date correction confirmed `2026-11-15` at 01:04 IST; assigned active development assessment appeared with Start available; authorized user opened instructions, started attempt, loaded questions and observed timer decrease. |
| Step 7B | Assigned development employee submitted a synthetic assessment successfully, with completion confirmation and no authorization error. |
| Step 8 | Different employee requested the completed assessment result by known attempt ID and received 404. |
| Step 9A | Dedicated **SEC-013 Timer Security Test** created, active for Nov 15 IST, one synthetic question, 1-minute duration, one test employee, one attempt. |
| Step 9B | Dedicated 1-minute test started with 200; after 105 seconds, expired save 403 and expired submission 403; both operations blocked. |
| Step 9C | Expired resume returned 403; original attempt ID and attempts-used state remained unchanged. |
| Steps 10A–10C | Dedicated timer test changed to **Archived**, disappeared from employee list, expired attempt retained; completed and other development test assessments preserved or archived as appropriate; temporary Payroll/Employees/Assets test grants restored to original settings; Admin Assessments, Feature Access and Employee Dashboard passed final checks. Real employee assessment records were reported unchanged. |

### Closure gates and evidence limits

1. **Source/CI/deployment:** PR #43 merged (commit `c427a19e578342e2163331be70836f101b7432e1`); SEC-013 synthetic authenticated HTTP/PostgreSQL, SEC-009 cross-authorization and Android security regression CI finished successfully on the PR. PR #44 merged (commit `29bf21796b1bd0c71a0d1ed444107a5dedb944ac`); assessment-midnight, SEC-020 and Android CI finished successfully. Render's HRMS development service deployment for PR #44 was independently confirmed `live`.
2. **Salary feature boundary:** Both positive and negative delegated payroll cases verified by operator, including immediate same-session revocation and unrelated employee directory/dashboard regression.
3. **Assessment boundary and deadline:** Unassigned access, result ownership, normal authorized start/submission and expired save/submit/resume verified with approved synthetic development fixtures; no real test-taker's attempts modified to simulate expiry.
4. **Restored environment:** Operator confirmed temporary permissions restored, synthetic test assessments archived/retained as appropriate, and UI regressions passing. Archived expired attempt intentionally retained as evidence rather than destructively removed.
5. **Evidence boundary:** Live testing was **owner-reported**, not an independent penetration test. The live write-denial test used random nonexistent employee IDs, so denial for a real owned record was not separately asserted live; synthetic SQL/HTTP CI covers unauthorized salary writes and zero-mutation postconditions. The 30-second grace and other revocation/race cases were modeled with synthetic PostgreSQL CI; the live expiry test checked the state after 105 seconds, not the exact grace transition. Tests were scoped to development users/assessments, not production datasets.

**Closure decision:** SEC-013 is **CLOSED for the verified development remediation scope** on 2026-11-15. This closure is not a general assertion that all HRMS privacy or authorization problems are resolved. Other tracked security and production release requirements remain open.

**Residual risks:** Other compensation or assessment endpoints beyond those enumerated here may warrant separate review. Non-positive duration remains untimed by design; ensure staff have correct configuration privileges. SEC-014, SEC-015, SEC-018, SEC-021 and other independently tracked findings remain open. This change does not clear HRMS for real-user production use.
