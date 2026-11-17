# SEC-016 — Separate Google Maps browser and server Geocoding API keys

**Severity:** MEDIUM. **Status:** CLOSED for owner-verified development security-remediation scope (2026-11-15). **No production clearance.**

## Original exposure and owner-verified baseline

The owner confirmed in development that Admin Attendance Location loaded correctly (Step 1A), and an authenticated `GET /api/admin/attendance/location/{id}` returned a nonempty `googleMapsApiKey` field (Step 1B), without copying its value. Source code also exposed `GOOGLE_GEOCODING_API_KEY` in `GET /api/employee/geofences`. An existing mixed-use Maps Platform API key was configured with **no application restrictions** and access to five Google APIs. The owner created distinct restricted DEV keys (browser key subsequently staged in Render development; backend key not yet activated):
- **Browser:** `https://hrms-qwv3.onrender.com` website referrers; Maps JavaScript API only.
- **Backend:** Render shared outbound CIDR ranges; Geocoding API only. Render IP ranges are shared with other services; protect the key and configure quotas.

## Prepared code remediation

- Attendance and geofence JSON no longer carry any Google API key. The backend continues address reverse geocoding using `GOOGLE_GEOCODING_API_KEY` and must never emit it in payloads.
- A dedicated authenticated `GET /api/maps/browser-config` exposes only `mapsJavaScriptApiKey` from the **new** `GOOGLE_MAPS_BROWSER_API_KEY`. Browser Maps JavaScript keys are necessarily public and must be tightly restricted in Google Cloud. This intentionally visible browser value is **not** a server credential. No attendance coordinates or other business records appear in the config response.
- `MapsConfig::browserKey` fails closed (503) when the browser key is missing or equals `GOOGLE_GEOCODING_API_KEY` or the legacy `GOOGLE_MAPS_API_KEY`; no server/mixed-use fallback. All configuration requests require an active Admin, Employee, HR, or Manager session. Candidate sessions are denied. The HR/Manager roles are required for existing employee attendance map access; the frontend route permits both roles.
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

## Development closure evidence — 2026-11-15

- **Code/deployment:** [PR #51](https://github.com/Kondapaneni/HRMS/pull/51) merged. Owner confirmed Render DEV deployed with independent `GOOGLE_MAPS_BROWSER_API_KEY` and updated `GOOGLE_GEOCODING_API_KEY`; subsequently removed `GOOGLE_MAPS_API_KEY` from Render DEV and deleted the legacy unrestricted Google Cloud `Maps Platform API Key` after finding no post-removal traffic. The new dedicated browser and backend keys were retained.
- **No server credential exposure:** Owner verified `GET /api/admin/attendance/location/{id}` returned 200 with record/employee/punches and no Google key fields, and `GET /api/employee/geofences` returned 200 with the geofences array and `geoFenceEnabled` but no Maps or Geocoding keys. Anonymous `GET /api/maps/browser-config` returned 401; authenticated Admin received 200 with only a nonempty `mapsJavaScriptApiKey` and `Cache-Control: no-store`.
- **Map regression:** Owner verified Admin Attendance Location, Employee Web location map and Android 14 remote WebView map, including current-location markers/geofence circles where applicable, and repeated all three regression checks after removing the legacy Render key and after deleting the original Google Cloud legacy key. No Maps authorization errors or employee attendance mutations were observed.
- **Key restrictions:** Owner verified new Maps JavaScript browser key is limited to the DEV HRMS website and Maps JavaScript API; backend Geocoding key limited to Geocoding API and `74.220.52.0/24` plus `74.220.60.0/24`, matching Render service outbound ranges. These Render CIDR ranges are shared with other services. Google Cloud Geocoding API is enabled.
- **Controlled Geocoding runtime test:** During an owner-confirmed no-check-in/no-tracking DEV window, a single synthetic `POST /api/employee/attendance/punch` request with public coordinates, `action=punch`, and no provided address received 400 (`Cannot punch without checking in first.`). The owner verified the attendance history was unchanged. Current server source attempts Geocoding before that attendance-state denial. Google Cloud metrics for the **new restricted backend credential** showed a `2xx` Geocoding request at the test time and `grpc_status_code=0` (OK), confirming Google API acceptance from the deployed backend. Avoid repeating the synthetic request against actual attendance records.
- **Usage limit:** Owner set Geocoding v3 daily quota to **1,000 requests/day** (previously unlimited). Evaluate this limit before scale-up; it is a project/API quota, not per-key isolation.
- **Residual boundary:** HTTP/gRPC success and safe attendance rejection do **not** directly prove that the PHP application parsed a returned `formatted_address` or persisted it for a successful attendance action. That functional check remains a documented, separate owner-approved test and is **not** represented as passed. No independent production security clearance, production rollout approval or blanket Maps billing-safety guarantee is claimed. This closes only the scoped **secret exposure and key separation** finding.
