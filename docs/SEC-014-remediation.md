# SEC-014 — Server-side attendance geofence and non-spoofable rate-limit identity

**Severity:** MEDIUM. **Status:** CODE IMPLEMENTED / FOCUSED SYNTHETIC CI PASSED / OWNER-LED LIVE DEVELOPMENT VERIFICATION PENDING. **Scope:** Development security remediation; not production penetration testing.

## Finding and policy

[AUDIT_REPORT.md](../AUDIT_REPORT.md#issue-id-sec-014) found that `POST /api/employee/attendance/punch` accepted client-computed geofence decisions without independent server distance checks, and `RateLimiter::getClientIp()` used attacker-supplied `X-Forwarded-For`/Client-IP headers for login, OTP, reset and map quotas. This could enable offsite attendance and header-rotated rate-limit bypasses.

The app's **existing product policy** is: employee `geoFenceEnabled` controls **check-in/check-out**, while Android's **interval background punches** are allowed outside a worksite to follow approved travel/field operations. SEC-014 preserves that distinction. For geofence-enabled staff, server evaluates the latitude/longitude *supplied with a request* (never a client-provided `insideGeofence` flag) against the current admin-managed `geofences` table with a Haversine calculation in meters. Requests with missing/malformed/non-finite/out-of-bounds coordinates, without a configured valid office geofence, or outside all office radii are rejected before geocoding or writing attendance. Disabled geofence staff retain explicitly permitted remote check-in/out. Missing employee profile or DB verification error fails closed.

**Important limits:** The current `geofences` table is a shared company-wide list, not a branch-to-geofence assignment table. This implements the **existing shared-office policy**, not strict per-branch enforcement. A malicious client can still claim plausible coordinates: Haversine verification ensures an alleged point is within a permitted area but **does not prove device GPS provenance or physical presence**. Stronger device location integrity/attestation and per-branch assignment require separate design and validation.

## Rate-limit changes

`RateLimiter::getClientIp()` uses only validated `REMOTE_ADDR` (the direct TCP peer) and ignores all unverified forwarding HTTP headers. No application-assumed trust in Render headers. Credential routes `/api/login`, `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/forgot-password` enforce an **account-wide keyed limit** using normalized lowercased/trimmed email hashed in `rate_limits.ip_address`, independently of an elevated **trusted-peer spray threshold** (`max(30, 10 × per-account max)`). A successful password/OTP login clears only that account's attempts, not the shared peer's failure history. Different employees behind one office NAT are not locked out together after the default five account failures. New rate keys contain no cleartext login emails.

The authenticated map endpoints `GET /api/employee/geofences` and `GET /api/employee/maps-rate-limit-status` now use the same hashed **authenticated user ID** key; the latter requires an employee token. Rotating forwarding headers cannot reset the map quota. DB-backed shared counters work across application processes/instances, assuming a shared PostgreSQL database. Existing `rate_limits` schema is reused; no migration required.

## Isolated CI validation and rollout safeguards

`.github/workflows/sec014.yml` provisions a disposable PostgreSQL `sec014_test`, runs policy tests (Haversine, missing fences/coordinates, employee controls, remote interval behavior, spoofed XFF), then real authenticated HTTP exercises:
- 5 invalid password logins for a synthetic non-existent account + rotated XFF, then 429 on sixth; another account is not blocked behind same peer.
- 5 invalid synthetic OTP send requests then 429; 6 invalid OTP verification attempts then 429; 3 synthetic password-reset requests then 429. No real account or outbound email is used.
- Geofence-enabled check-in far from office 403, no-GPS 403, malformed location 400; valid office check-in 200; outside checkout 403; remote interval background `punch` 200; valid office checkout 200. Geofence-OFF staff can check in/out remotely.
- Map status unauthorized 401 and per-user map loads throttle after 5 views despite rotated XFF; other employee unaffected.
- Postconditions assert no unauthorized attendance rows or offsite check-in/out coordinates, expected legitimate records and interval punch, no queued emails, and no attacker-controlled XFF or cleartext emails in rate-limit keys.
- PHP lint, JS syntax, Vite production build. Seed/postcondition scripts strictly refuse any database other than `sec014_test`.

Do not run brute force tests against a real HRMS account, trigger real OTP/reset email deliveries, delete genuine rate-limit rows, or alter real employee attendance in connected development/production. To verify live without making employee punches, first check Admin attendance/geofence configuration with a dedicated dev employee account (preferably with no attendance active), then use benign invalid synthetic-coordinate **check-in** requests that must be denied before writes. For allowed check-in/out or roaming background behavior, obtain explicit approval for a designated development-only day/employee and then perform each action safely. A failed/denied response is not proof of physical location validation if the employee's `geoFenceEnabled` flag is disabled; inspect it before interpreting results.

**CI evidence:** [SEC-014 focused real HTTP/PostgreSQL and frontend build — PASSED](https://github.com/Kondapaneni/HRMS/actions/runs/43682233703). The first iterations exposed missing test-schema columns and an unbound authenticated user ID in the map-status route; both were corrected before the final green run. The final run confirmed PHP lint, policy/Haversine tests, rotated-forwarded-header authentication abuse checks, authorized/denied attendance and map status, no unauthorized data mutations, and the frontend production build.

## Closure gates

1. CI green, PR merged and current Render development commit confirmed live.
2. Owner-reported Admin geofence configuration and employee geofence-enabled status verified; safe out-of-range/no-coordinate **denial** on synthetic employee confirmed with no attendance changes.
3. Owner-reported legitimate inside-radius check-in/out and configured remote/Android interval behavior on approved synthetic test account *only if safe*, otherwise rely on isolated CI and record live limitation.
4. Rate-limit abuse tests are covered in isolated CI, not live login/OTP flooding. One read-only admin config/status check suffices for live connectivity.
5. Temporary dev config/attendance fixture cleaned or restored, and Admin/Employee Dashboard regression checked. Close SEC-014 only when owner reports scoped live results and environment restoration.

**Independent open findings:** SEC-015, SEC-018, SEC-021, SEC-022 and other audit items remain separately scoped. Closing SEC-014 does not clear HRMS for real-user production.
