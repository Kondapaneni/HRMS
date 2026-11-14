# SEC-020 — Remove hardcoded maintenance bypass and enforce server-side maintenance

**Severity:** CRITICAL. **Status:** PARTIAL — [PR #35](https://github.com/Kondapaneni/HRMS/pull/35) merged to `main` (2026-11-14), all seven PR checks passed including isolated database authorization, production bundle scan, MFA/CORS/role regressions. Render deployment and owner-approved safe live maintenance verification remain unconfirmed; do not mark closed.

## Original audit finding

[`AUDIT_REPORT.md` SEC-020](../AUDIT_REPORT.md#issue-id-sec-020) identified a static developer password inside `MaintenanceOverlay.jsx` and a persistent `localStorage` bypass flag trusted by the Employee and Candidate layouts. Anyone with browser DevTools or the public JavaScript bundle could activate the maintenance bypass. There was no server-side maintenance check in front of protected PHP API endpoints. The historical audit contains the previously exposed password; it is **not a usable secret** and must never be reused for any other service.

## Remediation

1. `frontend/src/components/MaintenanceOverlay.jsx`: removed the static developer password, hidden click trigger, developer authentication form and `onBypassSuccess` callback. The notice now displays only maintenance text and a refresh button.
2. `frontend/src/components/EmployeeLayout.jsx`, `CandidateLayout.jsx`, `UpdateOverlay.jsx`: removed the persistent browser bypass flag, unlock callbacks and badge. Maintenance visibility follows public `/api/news` data; forcing a `localStorage` entry cannot authorize access.
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
- This is **source/CI evidence**, not confirmation that Render has deployed this revision or that a live production maintenance window is safe/complete.
- The current audit tracker marks SEC-020 **PARTIAL / OPEN** until live verification. Do not enable maintenance in a business-critical period without owner approval.

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

These changes have additional coverage in `tests/sec020_maintenance_ui_test.mjs` (full business/role route matrix, refresh with absent profile, Admin recovery, maintenance OFF) and the frontend bundle build CI. **Step 2B remains NOT PASSED** until the owner safely repeats the overlay and `503` check after this UI change deploys. Do not turn maintenance ON again until the owner confirms an approved low-traffic window. Return the live maintenance setting to OFF as soon as the issue is observed.

## Safe live verification plan — one step at a time

1. After the new Render deployment, with maintenance **OFF**, test normal Admin Dashboard, Admin → Settings, Admin → Feature Access, and employee dashboard. Confirm the maintenance notice is absent. **Do not activate live maintenance in Step 1.**
2. Use an approved staging environment or an explicitly agreed short, low-traffic maintenance window. Admin enables maintenance via Admin → Settings; a test employee sees the maintenance notice and receives `503` for a protected API request. Do not run attendance punches or edit live records.
3. In the same approved test window, verify setting the old browser bypass flag no longer hides the notice and does not change the protected API `503` response; no secret/password should be entered or shared.
4. Verify active authenticated Admin can access Admin Dashboard / Admin → Settings while maintenance is active, and MFA completion still works if applicable. Admin then disables maintenance immediately.
5. Verify employee API and normal dashboard access recover after maintenance OFF, with no unexpected `401`, `403` or `503`; confirm the notice disappears. Keep the total live maintenance interval minimal.

**Closure gate:** merged change and green cross-issue CI, deployment verified, and owner-confirmed maintenance OFF/ON, Admin recovery and employee denial/recovery tests. If a live maintenance window is inappropriate, keep SEC-020 **PARTIAL** and rely on isolated CI plus non-disruptive live regression testing rather than misrepresenting full live verification.
