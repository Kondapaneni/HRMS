# SEC-012 — Session revocation, password verification and JWT lifetime

**Severity:** HIGH. **Status:** CLOSED for the verified development scope on **2026-11-14** after deployed web and Android 14 owner-confirmed tests, read-only Supabase checks and passing CI. **Implementation:** [PR #39](https://github.com/Kondapaneni/HRMS/pull/39) (session hardening) and [PR #40](https://github.com/Kondapaneni/HRMS/pull/40) (Admin/Employee password-navigation regression). **Production release:** not approved by this closure.

## Scope of original finding

[AUDIT_REPORT.md](../AUDIT_REPORT.md#issue-id-sec-012) identifies (1) ten-year JWTs under `session_timeout=never`, (2) logout that did not revoke tokens, (3) password changes without proof of the current password, and (4) plaintext email OTP verifier codes in `users.otp_code`.

## Stage 1 changes in PR #39

- Connected schema inspection confirmed `public.users.token_version` already exists with integer default `0`. The Acme HRMS **development** Supabase project now has the SEC-012 refresh-session table. No users, passwords, or attendance records were modified by this migration.
- All password, email-OTP, MFA-completed and candidate sign-in paths include signed `tv` (token_version). Live `AuthMiddleware` compares `tv` with the current user record on **every** protected request and confirms current role/active state. Direct private-file proxy auth and the Admin maintenance exception apply the same revocation check.
- Stage 1 accepts a legacy JWT without `tv` only when database version is 0; **Stage 2 additionally rejects all signed JWTs whose `exp - iat` exceeds 8 hours**. This includes existing ten-year tokens, requiring re-login immediately after rollout and a signed updated Android APK first.
- `POST /api/logout` now requires a real session and **atomically bumps** `users.token_version`; this revokes that account's sessions **on all devices**, not just the current browser. If the DB cannot perform revocation, it returns failure, not a misleading success. The browser clears its local state even if revocation fails; an administrator must be able to force reauthentication in that case.
- `PUT /api/change-password` now requires `currentPassword`, checks it under a row lock, rejects reuse of the old password, hashes the replacement, clears mandatory-change flag and bumps the version in the same transaction. The UI requires current-password entry and sends the user to Login after server-side revocation. This also affects mandatory first-login password changes and must be tested with a synthetic development employee.
- `POST /api/reset-password` bumps `token_version` alongside credential replacement, invalidating tokens issued before password recovery.
- Newly issued email codes are stored as **HMAC-SHA256 keyed by the server secret**, protecting a six-digit code from simple offline database enumeration. The pre-deployment plaintext verifier may still be accepted **during its existing ten-minute expiry**, then is cleared. The outbound `email_queue` subject and body still contain the delivered code; that separate at-rest exposure must be addressed in SEC-015.

## Stage 1 tests and rollout decisions

- Isolated `sec012_test` PostgreSQL schema (synthetic IDs and credentials only), HTTP login/logout/replay, current-password denial and credential-change revocation, password reset token burn, candidate logout, and OTP send/verify/digest tests. No test reads real employee records or changes live passwords.
- Prior SEC-008/009/010/011/020 security tests run on dedicated synthetic databases; fixtures include the existing production `token_version` column.
- **Accepted development behavior:** logging out from one device revokes sessions on *every device*, including Android background tracking sessions, because the server increments the account-wide token version. Reauthentication is necessary on affected devices. Cross-device behavior was covered in source/synthetic checks; not separately demonstrated with two simultaneously logged-in physical devices during this closure.
- **Historical pre-merge gate satisfied (2026-11-14):** PR #39 was merged and deployed to the development site after the database migration and green CI. Owner subsequently confirmed web login/revocation and Android refresh/attendance tests. No production rollout is implied.

## Stage 2 code added to PR #39 — access caps and refresh rotation

- `AccessToken.php` replaces ten-year JWTs with 15-minute to 8-hour access tokens, interpreting the live `session_timeout=never` setting as **one-hour access**. Normal API authorization, private files, Admin maintenance authorization and file-view cookie minting reject overlong signed JWTs.
- `supabase/migrations/20261114_sec012_refresh_sessions.sql` creates a **server-only** refresh table containing SHA-256 digests of 256-bit random secrets, per-session identifiers, live token versions, a 14-day absolute expiry, UUID user foreign keys, row-level security and revoked Data API grants. **Migration was applied to the connected development Acme HRMS Supabase project on 2026-11-14.** Read-only post-migration checks confirmed UUID columns, RLS enabled and forced, and no `SELECT` grants for `anon` or `authenticated`. The table initially had zero rows.
- `RefreshSessions.php` rotates a refresh secret inside a database row lock; replay of a previously used secret revokes that refresh session. Logout and password changes invalidate all refresh sessions for the account via existing `token_version`.
- Web logins store the refresh credential in a `Secure; HttpOnly; SameSite=Strict` cookie scoped to `/api/auth/refresh`. The browser has single-flight 401 recovery and a required custom anti-CSRF header; refresh also checks Origin. Refresh tokens are never put in web localStorage, although web **access** JWT storage remains an independent SEC-021 risk.
- Android login responses can carry a native refresh credential; the Capacitor bridge immediately stores the access/refresh pair in **AndroidKeystore-backed AES-GCM** preferences. Synchronized native Java refresh serves both WebView and `LocationTrackerService`, including when the UI is closed. Before attendance punches, expired tokens are refreshed; only rejected HTTP 401 punches may be retried once, without resetting the tracking interval. A transient refresh outage does not automatically stop the schedule.
- `X-HRMS-Client: android` is a client-format hint, **not device attestation**. All original login/MFA requirements and API authorization still apply.
- Isolated CI tests cover login/logout/replay, reset/password-change, MFA and candidate flows, bounded JWTs, cookie flags, refresh rotation/replay, expiry and CSRF. SEC-006 additionally builds Android code. These tests cannot establish real Android 14/Doze behavior without owner device verification.

## Development closure evidence (2026-11-14)

**Status of the finding: CLOSED in the audit tracker for the deployed development environment.** The owner approved the development-only rollout and reported each live result; the CI and SQL evidence listed below was independently inspected. There were no real employee shifts or real end users during the tests. Passing these checks does **not** constitute an independent production penetration test.

### Source, build, and database evidence

- [PR #39](https://github.com/Kondapaneni/HRMS/pull/39) merged (commit `435b3209d479eafe90250b3c4a650d74f6d7810e`), [SEC-012 isolated PostgreSQL auth/RLS/frontend CI](https://github.com/Kondapaneni/HRMS/actions/runs/43611896100) passed, and [Android debug APK build](https://github.com/Kondapaneni/HRMS/actions/runs/43611896172) passed.
- [PR #40](https://github.com/Kondapaneni/HRMS/pull/40) merged (commit `3362c84f4d44dec996007ea7d30a4d155f063963`), providing Admin Settings and Employee desktop/mobile Profile navigation to Change Password; [navigation and frontend regression CI](https://github.com/Kondapaneni/HRMS/actions/runs/43613698624) passed.
- The `20261114_sec012_refresh_sessions.sql` migration was applied to connected **development** Supabase. Read-only checks confirmed required columns, forced RLS, no `anon`/`authenticated` Data API table access, HMAC-formatted pending OTPs rather than six-digit plaintext, and a fresh native refresh-session rotation matching the user's current `token_version`.
- Owner reported that the development Render website served the updated backend/frontend; live API behavior and Android native refresh corroborated effective deployment. No new schema or authentication code was changed as part of documentation closure.

### Owner-confirmed live web verification

- **Steps 1–3:** Development Admin Dashboard, logout revocation, saved old-JWT replay `/api/me` **401**; missing current password **400**, wrong current password **403**, authenticated session retained.
- **Steps 4A–4D:** Admin Settings and Employee Profile expose Change Password. Correct password change logged out, rejected old password, accepted new password, and denied replay of pre-change JWT with **401**.
- **Steps 5A–5C:** Web session recovered automatically after a rejected access token; two sequential secure browser refreshes returned **200**; `hrms_refresh` cookie is `HttpOnly; Secure; SameSite=Strict` scoped to `/api/auth/refresh`, with no refresh secret in JSON. Missing required `X-HRMS-Refresh` header returned **403**; normal authenticated `/api/me` worked.
- **Steps 6A–6E:** Read-only SQL showed one pending `hmac-sha256:` OTP and zero plaintext six-digit records; successful email OTP required Authenticator MFA before Dashboard, invalid MFA was rejected and valid MFA accepted, and reused email OTP returned **400**. Database check after consumption showed zero stored/active OTPs.
- **Steps 7A–7D:** The owner preserved the old JWT before requesting password recovery; reset succeeded, replayed pre-reset JWT returned **401**, old password failed, and new password plus MFA opened Employee Dashboard.
- **Steps 8A–8B:** Live access JWT had `session` type, integer token-version claim and bounded 15–480-minute lifetime; an actually expired JWT returned **401** (not a modified/invalidly signed token). The CI suite separately proves signed ten-year legacy JWTs are denied.
- **Step 10A:** With an authenticated development Employee, `/api/me` returned **200**, anonymous access to a private Resume proxy returned **401**, and access to a nonexistent/unowned synthetic Resume path returned **403**. This is negative authorization evidence, **not** a complete live matrix for all file types or positive owned-file downloads.

### Owner-confirmed Android 14 verification

- **Steps 9A–9C:** The owner downloaded and installed the GitHub Actions **debug APK** containing SEC-012 after uninstalling an older APK with a signing-certificate conflict; password login + MFA, Employee Dashboard/Profile, and session persistence after force stop/reopen worked.
- **Steps 9D–9F:** Admin temporarily configured **15-minute access JWTs** with **2-minute** location-punch intervals. After a fresh Android login/MFA, the phone stayed in the background with screen OFF for 20 minutes; Admin Attendance showed punches before and after the access-token expiry without reopening HRMS. Read-only Supabase inspection corroborated a **current-session native refresh rotation** during the test.
- **Steps 9G–9H:** Android checkout succeeded; the tracking notification disappeared and **zero** new location punches were observed over six minutes after checkout.
- **Step 9I (restored settings, independently reconfirmed by read-only SQL):** `session_timeout = never` means **1-hour access JWT plus 14-day secure refresh**; `tracking_interval_minutes = 2`; `maintenance_mode = false`. Newly minted JWTs use the restored lifetime.

### Evidence limits and remaining release risks

- **Development scope only:** Candidate logout, chain-replay revocation, absolute 14-day expiry, signed 10-year token rejection, certain cross-device cases, and account-role/denial cases were exercised in synthetic CI/source checks rather than every scenario being repeated on live Android and browser clients. There was no exhaustive independent penetration test.
- **APK distribution outstanding:** The GitHub Actions debug APK was validated on Android 14. The existing Employee Profile/website-hosted APK was **not** confirmed updated and signed with the permanent release certificate; future in-place distribution requires an appropriately signed build, with package/version/signature compatibility verified. Installation of the debug APK required uninstalling an older signed app. The previous SEC-006 security scope remains closed independently.
- **SEC-015 remains OPEN:** Email queue records still contain delivered OTP/reset material; this closure only establishes secure storage of OTP *verifiers* in `users.otp_code`. **SEC-021 remains OPEN:** Browser access JWTs and other data still use WebView/browser `localStorage` and require their own hardening. Other open security, performance, and quality findings remain unchanged.
- **Cross-device revocation behavior:** Logout/password changes/reset revoke existing session versions account-wide, including other active attendance devices. This is an intentional change, and other devices must sign in again after revocation. Refresh expiry is an absolute 14 days and then a new sign-in is required.
- **Production status:** HRMS is **not production-cleared** by closing SEC-012; complete outstanding issues, release signing/distribution requirements and broader readiness gates before real-user use.

## Verified development database state (2026-11-14)

- Supabase project: Acme HRMS (development environment); migration `sec012_refresh_sessions` reported success.
- Post-migration inspection: `public.hrms_refresh_sessions` exists, with `relrowsecurity=true`, `relforcerowsecurity=true`, and `anon`/`authenticated` have no `SELECT` privilege.
- Initial refresh rows: 0. Existing user session-version values were all present and non-negative. No synthetic fixture was inserted in the connected database.
- [PR #39](https://github.com/Kondapaneni/HRMS/pull/39) supplied session/backend/native changes, and [PR #40](https://github.com/Kondapaneni/HRMS/pull/40) supplied password-navigation updates. Corresponding isolated auth/RLS/frontend CI and Android build passed; owner-confirmed live Android 14 and web checks were subsequently recorded above. CI coverage and owner reports are not a substitute for an independent penetration test.
- The Supabase advisor flags `rls_enabled_no_policy` on this private table; that is intentional because it is server-only with revoked Data API grants. Other advisor notices are tracked independently.
