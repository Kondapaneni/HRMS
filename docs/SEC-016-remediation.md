# SEC-016 — Google Maps and Geocoding Key Separation

## Finding

The original `GET /api/employee/geofences` endpoint returned the server's `GOOGLE_GEOCODING_API_KEY` in a `googleMapsApiKey` JSON field. Admin attendance location responses similarly returned the backend's `GOOGLE_MAPS_API_KEY`. A browser is an untrusted client: server-side geocoding credentials must never be provided to it. A Google Maps JavaScript key **cannot** be hidden from browser users; it must instead be a **separate, purpose-limited** browser key.

## Source changes (PR — see GitHub)

- Employee geofences now keep `GOOGLE_GEOCODING_API_KEY` server-side, as already done during server attendance reverse geocoding. The endpoint returns only a deliberately public `googleMapsBrowserKey` from `GOOGLE_MAPS_JS_BROWSER_KEY`.
- Admin attendance location returns the same browser-only field; never `GOOGLE_MAPS_API_KEY`.
- Both React map screens load Maps JavaScript using `googleMapsBrowserKey` and show an unavailable state if it is unset. Attendance and geofencing behavior is unchanged.
- Render runtime `docker-entrypoint.sh` and `render.yaml` introduce `GOOGLE_MAPS_JS_BROWSER_KEY`. The old `GOOGLE_MAPS_API_KEY` is deprecated, and there is **no fallback** to a server key.

A runtime browser-key field is intentional: this application serves React both as a deployed website and in Android packaging. Injecting a different Vite build-time key into only one output could break the other. The browser key is **not confidential**; the hard security boundary is its independent restrictions and ensuring the server-side key is absent from all browser payloads.

## Required Google Cloud configuration — manual, prior to deployment

1. In the correct Google Cloud project, create a **new, separate Maps JavaScript API browser key**. Under *Application restrictions*, choose **Websites** and allow the actual HRMS HTTPS origins, e.g. `https://hrms-qwv3.onrender.com/*` (and any verified custom domain). Under *API restrictions*, allow **Maps JavaScript API only** unless a JavaScript service used by HRMS genuinely requires another API.
2. Validate the browser key in the **actual Android WebView** too: some local/protocol WebViews omit `Referer`, and website restrictions can block map loading. Do not weaken the browser key to unrestricted as a workaround; adjust the supported native map integration if the WebView origin cannot be restricted safely.
3. Store this separate public browser key as `GOOGLE_MAPS_JS_BROWSER_KEY` in the correct Render development service's environment. Its value will appear in the browser and is expected to be public. Keep `GOOGLE_GEOCODING_API_KEY` server-only and constrained to the Geocoding API, with an IP restriction if your deployment has a stable allowlistable egress IP.
4. After a review and approved deployment, verify map appearance for an Employee and Admin, plus the Geofences and Attendance Location API response shapes. **Never copy API keys, JWTs, raw session tokens or customer GPS data into chat or logs.** Only report field names, HTTP status codes, whether the keys match the expected type, and whether the map works.
5. Rotate and revoke prior exposed server keys in Google Cloud once you have verified no remaining server usage. Check key restrictions, quotas and billing alerts. Old keys may be retained in historical logs and client caches.
6. Preserve a rollback plan: the old frontend and backend must be deployed together; a missing browser key intentionally disables map display, not geofence enforcement. Revert the code only with an accompanying safe key plan. Existing tracking and attendance writes must remain functional while maps are temporarily unavailable.

## Verification

- `tests/sec016_policy_test.php`: no server key in either API, no legacy field in clients, explicit browser key and runtime config.
- `tests/sec016_http_test.mjs`: isolated authenticated employee Geofences response contains a dummy public browser key but neither a dummy server Geocoding key nor a legacy server key; anonymous access is rejected.
- CI compiles the frontend and lints changed PHP. Final closure also requires Render development deployment and owner-confirmed browser/Android map and API checks.

## Audit state

**OPEN — Fix prepared on a branch.** Do not mark closed until configuration, CI, deployment and live verification succeed. This does not claim that Google Cloud key restrictions have been inspected or that previously exposed keys have been rotated.
