# SEC-012 — Session revocation, password verification and JWT lifetime

**Severity:** HIGH. **Status:** IN PROGRESS / OPEN. **Stage 1 + Stage 2 code:** [PR #39](https://github.com/Kondapaneni/HRMS/pull/39) (**open, not merged, not deployed**; release requires owner-approved migration and Android rollout).

## Scope of original finding

[AUDIT_REPORT.md](../AUDIT_REPORT.md#issue-id-sec-012) identifies (1) ten-year JWTs under `session_timeout=never`, (2) logout that did not revoke tokens, (3) password changes without proof of the current password, and (4) plaintext email OTP verifier codes in `users.otp_code`.

## Stage 1 changes in PR #39

- Read-only connected schema inspection confirmed `public.users.token_version` **already exists** with integer default `0`. **No production DB changes were made.**
- All password, email-OTP, MFA-completed and candidate sign-in paths include signed `tv` (token_version). Live `AuthMiddleware` compares `tv` with the current user record on **every** protected request and confirms current role/active state. Direct private-file proxy auth and the Admin maintenance exception apply the same revocation check.
- Stage 1 accepts a legacy JWT without `tv` only when database version is 0; **Stage 2 additionally rejects all signed JWTs whose `exp - iat` exceeds 8 hours**. This includes existing ten-year tokens, requiring re-login immediately after rollout and a signed updated Android APK first.
- `POST /api/logout` now requires a real session and **atomically bumps** `users.token_version`; this revokes that account's sessions **on all devices**, not just the current browser. If the DB cannot perform revocation, it returns failure, not a misleading success. The browser clears its local state even if revocation fails; an administrator must be able to force reauthentication in that case.
- `PUT /api/change-password` now requires `currentPassword`, checks it under a row lock, rejects reuse of the old password, hashes the replacement, clears mandatory-change flag and bumps the version in the same transaction. The UI requires current-password entry and sends the user to Login after server-side revocation. This also affects mandatory first-login password changes and must be tested with a synthetic development employee.
- `POST /api/reset-password` bumps `token_version` alongside credential replacement, invalidating tokens issued before password recovery.
- Newly issued email codes are stored as **HMAC-SHA256 keyed by the server secret**, protecting a six-digit code from simple offline database enumeration. The pre-deployment plaintext verifier may still be accepted **during its existing ten-minute expiry**, then is cleared. The outbound `email_queue` subject and body still contain the delivered code; that separate at-rest exposure must be addressed in SEC-015.

## Stage 1 test and rollout boundaries

- Isolated `sec012_test` PostgreSQL schema (synthetic IDs and credentials only), HTTP login/logout/replay, current-password denial and credential-change revocation, password reset token burn, candidate logout, and OTP send/verify/digest tests. No test reads real employee records or changes live passwords.
- Prior SEC-008/009/010/011/020 security tests run on dedicated synthetic databases; fixtures include the existing production `token_version` column.
- **Behavior change requiring owner approval:** logging out from one device revokes sessions on *every device*, including Android background tracking sessions. Reauthentication is necessary on affected devices; enable only in an agreed safe window and test with development devices first.
- **Do not deploy/merge PR #39 just because stage 1 checks are green.** Review staged rollout and all relevant CI results; coordinate Android users and attendance check-ins. A database field is present, but current behavior is not yet a complete session redesign.

## Stage 2 code added to PR #39 — access caps and refresh rotation

- `AccessToken.php` replaces ten-year JWTs with 15-minute to 8-hour access tokens, interpreting the live `session_timeout=never` setting as **one-hour access**. Normal API authorization, private files, Admin maintenance authorization and file-view cookie minting reject overlong signed JWTs.
- `supabase/migrations/20261114_sec012_refresh_sessions.sql` creates a **server-only** refresh table containing SHA-256 digests of 256-bit random secrets, per-session identifiers, live token versions, a 14-day absolute expiry, UUID user foreign keys, row-level security and revoked Data API grants. **Migration has not been applied to live Supabase.**
- `RefreshSessions.php` rotates a refresh secret inside a database row lock; replay of a previously used secret revokes that refresh session. Logout and password changes invalidate all refresh sessions for the account via existing `token_version`.
- Web logins store the refresh credential in a `Secure; HttpOnly; SameSite=Strict` cookie scoped to `/api/auth/refresh`. The browser has single-flight 401 recovery and a required custom anti-CSRF header; refresh also checks Origin. Refresh tokens are never put in web localStorage, although web **access** JWT storage remains an independent SEC-021 risk.
- Android login responses can carry a native refresh credential; the Capacitor bridge immediately stores the access/refresh pair in **AndroidKeystore-backed AES-GCM** preferences. Synchronized native Java refresh serves both WebView and `LocationTrackerService`, including when the UI is closed. Before attendance punches, expired tokens are refreshed; only rejected HTTP 401 punches may be retried once, without resetting the tracking interval. A transient refresh outage does not automatically stop the schedule.
- `X-HRMS-Client: android` is a client-format hint, **not device attestation**. All original login/MFA requirements and API authorization still apply.
- Isolated CI tests cover login/logout/replay, reset/password-change, MFA and candidate flows, bounded JWTs, cookie flags, refresh rotation/replay, expiry and CSRF. SEC-006 additionally builds Android code. These tests cannot establish real Android 14/Doze behavior without owner device verification.

## Gates before merge, deployment, and SEC-012 closure

1. **Keep PR #39 unmerged until coordinated rollout approval.** Old APKs do not know how to refresh and will lose access when existing long-lived tokens are rejected. Build the new signed APK with the same release key and test upgrading a development device, including Android 14 screen-off/background tracking.
2. Apply the committed refresh-session SQL migration **before** deploying new PHP login routes; check UUID schema, indexes, RLS and grants. No live DDL was executed by this work.
3. Deploy backend/frontend together in a safe window; existing users must reauthenticate and older APKs must upgrade. The current `session_timeout=never` setting changes to a one-hour access JWT with 14-day rotating refresh while the new backend runs.
4. Owner-led live verification one step at a time: employee/password/OTP/MFA and candidate sign-in; logout/JWT replay; current-password denial and update; reset revocation; refresh at access expiry; private files and Admin maintenance; Android check-in, multiple background punches across expiry, Doze, app swiped away, check-out, and notification cleanup.
5. Review intended cross-device logout semantics: current stage-1 implementation increments the account token version and revokes **all** sessions, even on another device. The 14-day refresh period is absolute and requires fresh sign-in afterward.
6. **SEC-012 remains OPEN until migration, coordinated deployment, real Android tracking and owner-confirmed tests pass.**
**Production status:** The overall HRMS is not production-cleared; this document does not change the historical audit baseline or close other findings.
