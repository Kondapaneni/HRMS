# SEC-016 — Separate Google Maps browser and server Geocoding API keys

**Severity:** MEDIUM. **Status:** PREPARED ON FEATURE BRANCH; CI, Render configuration, deployment and owner live verification pending. **No production clearance.**

## Original exposure and owner-verified baseline

The owner confirmed in development that Admin Attendance Location loaded correctly (Step 1A), and an authenticated `GET /api/admin/attendance/location/{id}` returned a nonempty `googleMapsApiKey` field (Step 1B), without copying its value. Source code also exposed `GOOGLE_GEOCODING_API_KEY` in `GET /api/employee/geofences`. An existing mixed-use Maps Platform API key was configured with **no application restrictions** and access to five Google APIs. The owner created (but has not deployed) distinct restricted DEV keys:
- **Browser:** `https://hrms-qwv3.onrender.com` website referrers; Maps JavaScript API only.
- **Backend:** Render shared outbound CIDR ranges; Geocoding API only. Render IP ranges are shared with other services; protect the key and configure quotas.

## Prepared code remediation

- Attendance and geofence JSON no longer carry any Google API key. The backend continues address reverse geocoding using `GOOGLE_GEOCODING_API_KEY` and must never emit it in payloads.
- A dedicated authenticated `GET /api/maps/browser-config` exposes only `mapsJavaScriptApiKey` from the **new** `GOOGLE_MAPS_BROWSER_API_KEY`. Browser Maps JavaScript keys are necessarily public and must be tightly restricted in Google Cloud. This intentionally visible browser value is **not** a server credential. No attendance coordinates or other business records appear in the config response.
- `MapsConfig::browserKey` fails closed (503) when the browser key is missing or equals `GOOGLE_GEOCODING_API_KEY` or the legacy `GOOGLE_MAPS_API_KEY`; no server/mixed-use fallback. All configuration requests require an active Admin or Employee session.
- Both `AdminAttendanceLocation` and `EmployeeMobileMap` use the same runtime browser-config hook. Capacitor Android loads the remote `https://hrms-qwv3.onrender.com` site from `server.url`. A new APK is not required solely for the web map change, but Android regression testing is mandatory.
- Render entrypoint and blueprint accept `GOOGLE_MAPS_BROWSER_API_KEY` as a runtime backend environment variable. This is deliberately **not** a Vite build-time variable.
- Focused CI tests exercise fail-closed key policy, authenticated runtime config, absence of Geocoding/mixed-use keys in geofence responses, source-level Admin response and both frontend map consumers, plus the production Vite build. Only disposable PostgreSQL and synthetic test values are used.

## Rollout sequence — do not reorder

1. Browser-only and server-only DEV keys with appropriate Google Cloud restrictions created; old key remains unchanged while old application serves maps.
2. **Before merging**, set only `GOOGLE_MAPS_BROWSER_API_KEY` in the Render development service to the newly created **browser-only** key. Preserve current `GOOGLE_MAPS_API_KEY` and `GOOGLE_GEOCODING_API_KEY`; check map regression after Render redeploy, if it happens.
3. After focused CI passes and owner reviews, merge and confirm the new Render deploy. Verify browser-config returns **only** the dedicated browser key (never print it), both attendance responses omit key fields, and the Admin and Employee web/Android maps load/mark correctly. No real attendance mutation without approved test window.
4. **Only after** map smoke tests, update `GOOGLE_GEOCODING_API_KEY` to the new restricted server key. Validate server reverse geocoding through owner-approved synthetic test action.
5. Confirm Google Cloud referrer restrictions, Render CIDRs, API restrictions and quotas. Only once no clients depend on it, rotate or revoke the old unrestricted/mixed-use key. Shared outbound IP restrictions reduce exposure but do not make the key exclusive to this Render service.
6. Finish owner-confirmed scoped live verification and cleanup before closing issue in the tracker. Never claim production approval from this development test.

**Rollback:** Restore the previous working app release together with its matching old key setup if deployment fails. Never introduce a new-code fallback to the Geocoding key or old mixed-use key.
