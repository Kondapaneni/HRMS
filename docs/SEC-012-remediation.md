# SEC-012 — Session revocation, password verification and JWT lifetime

**Severity:** HIGH. **Status:** IN PROGRESS / OPEN. **Stage 1:** [PR #39](https://github.com/Kondapaneni/HRMS/pull/39) (review/CI; **not safe to deploy or close yet**).

## Scope of original finding

[AUDIT_REPORT.md](../AUDIT_REPORT.md#issue-id-sec-012) identifies (1) ten-year JWTs under `session_timeout=never`, (2) logout that did not revoke tokens, (3) password changes without proof of the current password, and (4) plaintext email OTP verifier codes in `users.otp_code`.

## Stage 1 changes in PR #39

- Read-only connected schema inspection confirmed `public.users.token_version` **already exists** with integer default `0`. **No production DB changes were made.**
- All password, email-OTP, MFA-completed and candidate sign-in paths include signed `tv` (token_version). Live `AuthMiddleware` compares `tv` with the current user record on **every** protected request and confirms current role/active state. Direct private-file proxy auth and the Admin maintenance exception apply the same revocation check.
- Pre-deployment signed JWTs lacking `tv` are accepted **only when** the stored version is `0` so that a staged rollout can avoid immediately invalidating existing users. After logout or password change/reset, those old tokens become invalid.
- `POST /api/logout` now requires a real session and **atomically bumps** `users.token_version`; this revokes that account's sessions **on all devices**, not just the current browser. If the DB cannot perform revocation, it returns failure, not a misleading success. The browser clears its local state even if revocation fails; an administrator must be able to force reauthentication in that case.
- `PUT /api/change-password` now requires `currentPassword`, checks it under a row lock, rejects reuse of the old password, hashes the replacement, clears mandatory-change flag and bumps the version in the same transaction. The UI requires current-password entry and sends the user to Login after server-side revocation. This also affects mandatory first-login password changes and must be tested with a synthetic development employee.
- `POST /api/reset-password` bumps `token_version` alongside credential replacement, invalidating tokens issued before password recovery.
- Newly issued email codes are stored as **HMAC-SHA256 keyed by the server secret**, protecting a six-digit code from simple offline database enumeration. The pre-deployment plaintext verifier may still be accepted **during its existing ten-minute expiry**, then is cleared. The outbound `email_queue` subject and body still contain the delivered code; that separate at-rest exposure must be addressed in SEC-015.

## Stage 1 test and rollout boundaries

- Isolated `sec012_test` PostgreSQL schema (synthetic IDs and credentials only), HTTP login/logout/replay, current-password denial and credential-change revocation, password reset token burn, candidate logout, and OTP send/verify/digest tests. No test reads real employee records or changes live passwords.
- Prior SEC-008/009/010/011/020 security tests run on dedicated synthetic databases; fixtures include the existing production `token_version` column.
- **Behavior change requiring owner approval:** logging out from one device revokes sessions on *every device*, including Android background tracking sessions. Reauthentication is necessary on affected devices; enable only in an agreed safe window and test with development devices first.
- **Do not deploy/merge PR #39 just because stage 1 checks are green.** Review staged rollout and all relevant CI results; coordinate Android users and attendance check-ins. A database field is present, but current behavior is not yet a complete session redesign.

## Remaining required before SEC-012 closure (stage 2)

- Replace the ten-year `session_timeout=never` JWT with access tokens capped at **8 hours or less**, regardless of administrator-configured values.
- Introduce safely **rotated, individually revocable short-lived refresh sessions**; store only hashes of refresh tokens server-side. For web use Secure, HttpOnly, SameSite cookies and CSRF safeguards; for Android use Android Keystore-backed token storage plus refresh handling within `LocationTrackerService` so attendance punches continue for intended active shifts.
- Explicitly test expiry, refresh rotation/replay, MFA enrollment/login, multi-device signout and candidate flows, forgotten-password and forced-password change, private file cookies, maintenance Admin access, and in-flight active Android tracking.
- Arrange a safe migration from existing 10-year JWTs to bounded tokens and an agreed token revocation strategy; any temporary legacy support must have a definite end date and must not silently perpetuate the original risk.
- Owner-confirmed low-impact live testing after deployment. **Keep SEC-012 OPEN until all are implemented and verified.**

**Production status:** The overall HRMS is not production-cleared; this document does not change the historical audit baseline or close other findings.
