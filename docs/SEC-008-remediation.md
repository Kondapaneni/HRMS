# SEC-008 — Email OTP cannot bypass authenticator MFA

**Original severity:** Critical. **Status:** Implemented in source; requires CI, deployment and live testing before closure.

## Original vulnerability

`POST /api/login` correctly challenged users who had both `users."mfaEnabled"` enabled and a confirmed `mfa_secrets` record, but `POST /api/auth/otp/verify` ignored that setup and returned a full administrator/employee JWT after email verification alone. That entirely bypassed the Authenticator second factor.

## Fix

1. **Single MFA decision:** `sec008MfaRequired(PDO $conn, array $user)` is shared between password login and email OTP login. Both challenge accounts with enabled AND confirmed MFA, preserving first-time enrollment for users who have been authorized but have not yet confirmed TOTP.
2. **First-factor-only email OTP:** A correct, unexpired email OTP is invalidated before any session is issued. Confirmed MFA accounts receive only a 5-minute JWT with `type=mfa_pending`, an ID and email, no `role`, and a `mfaRequired` response. `/api/auth/mfa/verify` requires a TOTP or approved unused backup code before issuing a full session.
3. **No token confused with a session:** `AuthMiddleware` rejects MFA-pending JWTs on protected routes, even `new AuthMiddleware()` routes without explicit role restrictions. Existing normal JWTs remain valid for compatibility; `SEC-009` separately tracks missing role policies.
4. **Frontend compatibility:** `AuthContext.signInWithOtp` never stores a pending MFA token in `localStorage`. `Login.jsx` displays the existing Authenticator/backup-code form after the email OTP step. Non-MFA OTP logins continue to work.
5. **No production database changes:** The fix does not require a schema migration and will deploy with the usual Render frontend/backend build.

## Verification

GitHub Actions `.github/workflows/sec008.yml` performs:
- PHP syntax checks and shared MFA policy tests for enabled/disabled/unconfirmed users.
- Scoped pre-auth token expiry/claims tests and a real `AuthMiddleware` rejection check.
- Real Slim API integration on an isolated, synthetic PostgreSQL database with two invented test users:
  - Incorrect email OTP rejected.
  - Correct admin email OTP returns `mfaRequired` and NO privileged JWT.
  - Pending token rejected on a protected endpoint.
  - Used email OTP cannot be replayed.
  - Incorrect Authenticator code rejected.
  - Correct Authenticator code returns authorized admin JWT.
  - Password login still requires MFA.
  - Non-MFA employee email OTP still returns an ordinary session.
- Production frontend build plus static regression assertions.

## Live verification after deploying

Use **development/test accounts only**; do not share email OTPs, TOTP codes, backup codes, passwords or JWTs in chat.

1. **MFA-enabled test admin, email OTP method:** Sign out, choose "Sign in with Email OTP", receive an email OTP, enter it. HRMS MUST display a second-step **Authenticator code** prompt and MUST NOT open Admin Dashboard yet.
2. **Invalid TOTP:** Enter an incorrect Authenticator code. It must reject the code, with no dashboard access.
3. **Valid TOTP:** Enter a current code from the test admin's Authenticator app. Admin Dashboard should open normally.
4. **Password login with MFA:** Sign out, log in with password. It must still require Authenticator MFA.
5. **Non-MFA test employee:** Sign out, log in with email OTP using a test account that does not have confirmed MFA. It should sign in successfully without the second-step prompt.
6. **Android APK:** If mobile login is used, verify that a fresh Android WebView login follows these same rules (backend endpoints are identical; old native APK loads the hosted site).

**Never disable MFA on an existing privileged real account merely to test a bypass.**

## Residual independent audit issues

- **SEC-012:** This patch does NOT hash email `otp_code` values stored in the database, replace the 10-year `session_timeout='never'` option, or implement session revocation. OTP storage hardening and JWT lifecycle are tracked there and require a coordinated database migration, so they were intentionally not mixed into an emergency MFA-bypass fix.
- **SEC-015:** The email queue contains OTP message content and other emailed credentials, independently tracked.
- **SEC-009:** Full RBAC/feature enforcement remains separate from this pre-auth token safeguard.

**Closure gate:** GitHub CI green, Render deployment confirmed, and MFA-enabled email OTP → TOTP challenge → full login plus non-MFA login tested live.
