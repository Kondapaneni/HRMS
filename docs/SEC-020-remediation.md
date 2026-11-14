# SEC-020 — Remove hardcoded maintenance bypass and enforce server-side maintenance

**Severity:** CRITICAL. **Status:** CLOSED — fixed, deployed and owner-confirmed in live tests on 2026-11-14. [PR #35](https://github.com/Kondapaneni/HRMS/pull/35) introduced backend maintenance enforcement and removed the embedded developer bypass, and [PR #37](https://github.com/Kondapaneni/HRMS/pull/37) corrected cross-workspace maintenance presentation and non-reloading refresh. Focused and cross-issue CI passed. Closure is based on source/CI evidence and **owner-reported** live test results, not an independent production penetration test.

## Original audit finding

[`AUDIT_REPORT.md` SEC-020](../AUDIT_REPORT.md#issue-id-sec-020) identified a static developer password inside `MaintenanceOverlay.jsx` and a persistent `localStorage` bypass flag trusted by the Employee and Candidate layouts. Anyone with browser DevTools or the public JavaScript bundle could activate the maintenance bypass. There was no server-side maintenance check in front of protected PHP API endpoints. The historical audit contains the previously exposed password; it is **not a usable secret** and must never be reused for any other service.

## Remediation

1. `frontend/src/components/MaintenanceOverlay.jsx`: removed the static developer password, hidden click trigger, developer authentication form and `onBypassSuccess` callback. The notice now displays only maintenance text and a **Check again** button that checks status without a page reload.
2. `frontend/src/components/EmployeeLayout.jsx`, `CandidateLayout.jsx`, `UpdateOverlay.jsx`: removed the persistent browser bypass flag, unlock callbacks and badge. PR #37 further moved the informational maintenance notice to a root-level `MaintenanceGate` in `frontend/src/App.jsx`, covering employee, candidate, loan, sales, branch operations and delegated feature routes. The gate checks public `/api/news`, avoids browser reloads and restores existing employee profile access once maintenance is OFF. A `localStorage` entry cannot authorize protected APIs.
3. `backend/src/Middleware/MaintenanceMiddleware.php`: a central, **server-side** PHP maintenance check reads `global_settings.maintenance_mode` on **each** protected `/api/*` request (no stale settings cache). When maintenance is ON, a non-admin, missing, forged, disabled, demoted, expired, or MFA-pending session receives sanitized **503 Service Unavailable**, with `Cache-Control: no-store` and `Retry-After: 30`. No browser local storage state is consulted.
4. Authenticated **admins** can still use protected API routes only when the JWT has a valid signature, indicates a completed session (legacy untyped completed JWTs supported), and the currently active database user retains `role = admin`. The route's existing `AuthMiddleware` continues to enforce normal permissions.
5. `POST /api/login`, email-OTP send/verify, MFA completion, forgot/reset password, and logout remain available to permit admin recovery. `GET /api/news` and CORS preflight remain available so the UI can explain maintenance, and `/version.json` remains unchanged. Other non-admin API operations, including candidate creation and location punches, are blocked during maintenance.
6. `backend/public/index.php` installs the middleware within the existing CORS response wrapper and correctly converts native/PostgreSQL boolean flag values for `/api/news`. Maintenance **OFF** leaves existing API route behavior unchanged.

## CI evidence

`.github/workflows/sec020.yml` runs synthetic two-job checks:

- **Frontend production build:** compile with `npm ci && npm run build`, verify no hardcoded developer password, old bypass `localStorage` key, or developer unlock UI remains in the built `frontend/dist/assets/*.js`. Existing MFA/frontend login reset security tests also run.
- **Isolated PostgreSQL authorization:** a destructive fixture is guarded to accept **only** `sec020_test` with synthetic-only signing secrets. It verifies maintenance toggles without restart, normal OFF mode, non-admin 503 for reads and writes, administrative role + active account verification, forged/admin-claim/demoted/disabled/MFA-pending token rejection, recovery routes during maintenance, safe 503 JSON, and database-error fail-closed behavior. It does not touch a live Render or production database.

## GitHub merge and automated evidence — 2026-11-14

- [PR #35](https://github.com/Kondapaneni/HRMS/pull/35) merged to `main` as commit `f7da70caa752a4b074d4b0abc0b3b59a25a79b54`.
- Seven PR checks passed: dedicated SEC-020 synthetic DB middleware tests and full frontend build/bundle-secret scan; SEC-007 security headers and CORS; SEC-008 MFA and frontend regression; SEC-009 real HTTP authorization. The synthetic SEC-008 and SEC-009 fixture schemas were updated to model the already existing live `maintenance_mode` column, preserving fail-closed behavior rather than bypassing it.
- At the time PR #35 merged, this was **source/CI evidence only**; live validation was subsequently performed and confirmed by the owner as documented below.
- [PR #37](https://github.com/Kondapaneni/HRMS/pull/37) merged as commit `683e2763e19b5a9d6ff12168e03515f6b657bb7` after correcting the initial live-test UX defects. Both its focused SEC-020 PR checks passed, including synthetic backend authorization and frontend production build/policy checks. The owner confirmed deployment on Render before the successful retest.

## Critical scope and operational caveats

- **Enabling maintenance in the live Admin Settings intentionally interrupts employee/candidate APIs, including attendance punch/location tracking.** Test on disposable staging where possible. Do not switch live maintenance ON while employees are actively working without an approved maintenance window and communication to users.
- The PHP maintenance middleware gates **PHP `/api/*` endpoints**. It does not claim to block direct **Supabase** SDK/storage network requests or already-open browser screens, nor is it a database-wide write lock. Supabase storage/RLS, other input validations and session lifecycle remain governed by separately tracked issues. A UI overlay is informational, not an authorization barrier.
- Historical repository commits and the audit report still contain the exposed former password. Removing the secret from current frontend source and compiled JavaScript does **not** delete Git history. Rotate the former password **anywhere else it might have been reused**.
- Existing normal Admin authentication and MFA must remain functional both before and during maintenance; no new developer password or hidden admin override is introduced.

## SEC-020 first live test — UI regression observed (2026-11-14)

The owner confirmed **Step 1 PASS** after Render deployment with Maintenance OFF: Admin Dashboard, Admin → Settings, Admin → Feature Access, and Employee Dashboard all functioned. During the approved maintenance ON window (Step 2A), Admin remained signed in and could save Maintenance ON. In Step 2B, an already logged-in employee encountered two frontend UX problems:

- Loan/Sales/Branch Operations and delegated Admin Features pages did **not** show the maintenance overlay because they use separate route layouts that do not inherit EmployeeLayout.
- Clicking the original maintenance "Refresh" performed a full page reload; the employee's `/api/me` then correctly returned 503 under the server maintenance policy, but the frontend lost its in-memory profile and redirected to the login page. Regular employee access during maintenance being denied is **expected**; losing the maintenance notice or seeming to sign out on status check is not.

**Follow-up UI remediation** (this change): `MaintenanceGate` is mounted once above all routes and related UI components in `App.jsx`, using publicly readable `/api/news` status instead of any client bypass flag. A protected route with an existing session is held until the maintenance status check completes, so a 503 during `/api/me` no longer races with the route's login redirect. The shared maintenance overlay covers all employee business modules, delegated Admin Features, candidate pages, and standalone screens. Its Refresh action rechecks the public status **without a full browser reload** and rehydrates `/api/me` after the maintenance toggle returns to OFF before restoring protected routes. Public login/recovery pages remain accessible so an authorized Admin can sign in; they show an informative maintenance banner. Admin remains exempt from the frontend overlay only with a server-fetched Admin profile; PHP enforces the actual authorization.

These changes have additional coverage in `tests/sec020_maintenance_ui_test.mjs` (business/role route matrix, missing profile during maintenance, Admin recovery and OFF-state behavior) and the frontend bundle build CI. **The initial Step 2B failed; the corrected owner-led retest passed all steps listed below.** The owner approved each live maintenance window and confirmed the setting returned to OFF.

## Completed owner-led live verification and closure — 2026-11-14

The owner confirmed PR #35 and PR #37 were deployed to Render before the applicable tests. This is **reported live verification**, not independently rerun privileged testing or a complete security assessment of direct Supabase calls.

- **Normal mode / first deployment:** With maintenance OFF, Admin Dashboard, Admin Settings, Feature Access and Employee Dashboard functioned. Initial maintenance ON exposed the UI defects recorded above; the owner restored maintenance OFF and the employee could log in and access the dashboard. PR #37 corrected those defects, passed its focused CI and was confirmed deployed.
- **Corrected retest, Step 2B-1:** Existing development employee at Loan Origination → Applications showed Scheduled maintenance notice after Admin enabled maintenance in an explicitly approved, no-active-tracking window.
- **Step 2B-2:** Clicking **Check again / Refresh** left the notice visible with **no full reload or redirect to Login**.
- **Step 2B-3:** Read-only development employee `GET /api/employee/profile` returned **HTTP 503** while maintenance was ON.
- **Step 2B-4:** Sales Origination and Branch Operations both showed the maintenance notice.
- **Step 2B-5:** Admin Dashboard and Settings remained accessible while ON; Admin disabled maintenance successfully.
- **Step 2B-6:** The existing employee session resumed without login once maintenance was OFF.
- **Step 3A:** With maintenance OFF, the owner set the **old, now-obsolete browser localStorage bypass flag** to `true` in the development employee browser solely for a negative test.
- **Step 3B–3C:** After explicitly reconfirming a safe maintenance window, Admin switched maintenance ON. The maintenance notice **still appeared** despite the old bypass flag being `true`; no frontend bypass was observed. Server-side 503 was independently established in Step 2B-3 and synthetic CI, but a second 503 request with the legacy flag set was **not separately reported**.
- **Step 3D:** Admin switched maintenance OFF and confirmed Dashboard and Settings still worked.
- **Step 3E:** Employee session and business application resumed **without login**; the temporary old localStorage flag was removed.

**Closure decision:** SEC-020 **CLOSED** based on merged remediation, green CI, owner-confirmed deployment, safe live employee 503 enforcement, cross-module maintenance display, refresh/session recovery, Admin access and successful legacy-flag negative UI test. Maintenance **OFF** was the last owner-confirmed setting. Do not assume future maintenance windows are safe without new approval.

**Residual limitations:** The server middleware gates PHP `/api/*` routes, not direct Supabase SDK/storage requests or a database-wide write lock. A separate live candidate authorization test, administrator MFA completion during maintenance, and a paired second 503 with the old flag were **not reported**; corresponding protection was covered by synthetic CI/source review as applicable. The formerly exposed hardcoded credential still exists in historical audit/Git revisions and needs rotation anywhere reused. Outstanding findings, including SEC-012, SEC-017, SEC-021 and SEC-022, remain independently tracked. Whole-HRMS release clearance is **not** implied.

## Safe live verification plan — one step at a time

1. After the new Render deployment, with maintenance **OFF**, test normal Admin Dashboard, Admin → Settings, Admin → Feature Access, and employee dashboard. Confirm the maintenance notice is absent. **Do not activate live maintenance in Step 1.**
2. Use an approved staging environment or an explicitly agreed short, low-traffic maintenance window. Admin enables maintenance via Admin → Settings; a test employee sees the maintenance notice and receives `503` for a protected API request. Do not run attendance punches or edit live records.
3. In the same approved test window, verify setting the old browser bypass flag no longer hides the notice and does not change the protected API `503` response; no secret/password should be entered or shared.
4. Verify active authenticated Admin can access Admin Dashboard / Admin → Settings while maintenance is active, and MFA completion still works if applicable. Admin then disables maintenance immediately.
5. Verify employee API and normal dashboard access recover after maintenance OFF, with no unexpected `401`, `403` or `503`; confirm the notice disappears. Keep the total live maintenance interval minimal.

**Closure gate — MET on 2026-11-14:** Merged source and cross-issue CI, owner-confirmed deployment, maintenance OFF/ON behavior, active Admin access and OFF recovery, employee protected API 503, and legacy bypass-flag resistance. Any future revalidation of candidate flows or additional operating environments should use an explicitly authorized low-traffic window. Do not treat this closure as complete HRMS production security clearance.
