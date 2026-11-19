# SEC-012: Idempotent page restoration (2026-11-18)

## Incident
Owner reproduced intermittent logout in **both regular Chrome and Incognito**
after two or three full reloads. Render logs show overlapping `POST /api/auth/refresh`
requests (a 200 followed by 401s) and PostgreSQL reported six sessions
revoked within three seconds of a prior rotation. This is consistent with
single-use credential replay during reload, but individual requests cannot
be conclusively attributed to a specific user without private cookies.

## Root failure mode
Existing `restoreSession()` always called `renewAccess()` after page load.
Web tokens are intentionally memory-only (SEC-021), so every F5 consumes
the one-use HttpOnly refresh cookie. A reload can cancel the previous page
before its replacement `Set-Cookie` response is applied, and another
reload may resend the spent credential. SEC-018 correctly revokes the
single session family when a known consumed credential is replayed.

## Resolution
Add `POST /api/auth/refresh/restore` under the *existing*
`Path=/api/auth/refresh` cookie scope. A browser navigation uses this
endpoint to validate the current hashed cookie credential against
PostgreSQL and the live user's active flag, session version, expiry and
session revocation state, then issue a bounded access JWT **without
rotating or setting the cookie**. The endpoint is POST, requires the
existing `X-HRMS-Refresh: 1` header, and verifies same-origin HTTPS.
Known reused credentials *still revoke the session family immediately*;
unknown guesses never revoke.

When an already-loaded page needs to renew its expired access JWT, it
still uses `POST /api/auth/refresh` to rotate the single-use credential.
Native Android Keystore refresh and attendance tracking are unchanged.
No DB schema migration or new long-lived cookie is introduced.

## Safety and limitations
- Protected APIs still check live session versions and feature rights.
- No token or private data is written to localStorage/sessionStorage.
- Cookies remain HttpOnly, Secure, SameSite=Strict, scoped to /api/auth/refresh.
- Refresh-family replay revocation remains immediate. No replay grace window.
- Existing token-version changes, password reset, account deactivation,
  logout, and maintenance still fail closed.
- A page reload concurrently racing with another tab's *actual rotation*,
  or a previously revoked session, cannot be recovered by restoration.
- The repeated-F5 failure should be retested with a **new login** after
  deployment; a revoked session cannot be resurrected.
- Deployment requires user-approved safe window; CI alone is not proof
  of the live browser outcome.
