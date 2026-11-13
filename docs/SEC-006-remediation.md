# SEC-006 — Android native backup, TLS, token storage, and logging

**Audit severity:** High. **Status:** Code fix staged; must pass CI and actual Android-device verification before closing. This change is specific to the native Android APK, not the web application.

## Threats remediated

- `AndroidManifest.xml` now sets `android:allowBackup="false"` and `android:usesCleartextTraffic="false"`. Android 12+ `dataExtractionRules` explicitly exclude app data from cloud backup and device-to-device transfer.
- Capacitor `server.cleartext` is false and the packaged app loads `https://hrms-qwv3.onrender.com`.
- Foreground tracking accepts only the HTTPS `hrms-qwv3.onrender.com/api/employee/attendance/punch` endpoint (no query/user info/redirects). This deliberate host allowlist must be updated when the app moves to a custom domain.
- The service no longer writes a plaintext `auth_token` preference. `TrackerTokenStore` uses Android Keystore non-exportable AES-GCM credentials with a random 96-bit IV and authentication tag. First use migrates an existing plaintext preference; on cryptographic error it fails closed and requires a new session. Stop tracking deletes encrypted and old plaintext preferences.
- Native GPS coordinate and raw HTTP response Logcat lines are removed. Other diagnostic Log calls are gated on `BuildConfig.DEBUG`, with `buildFeatures.buildConfig` explicitly enabled (AGP 8+).
- Release build uses R8 optimization (`minifyEnabled true`, `shrinkResources true`) and retains the reflection-discovered Capacitor plugin.
- The new `tests/sec006_android_security_test.mjs` checks policy and token/logging safeguards. `.github/workflows/sec006.yml` synchronizes Capacitor, compiles debug and release APKs, and verifies release minification mapping.

## Android-only login regression (13 Nov 2026)

On a freshly installed SEC-006 debug APK, the user confirmed that the HRMS
website login works in Chrome on the **same Android phone**, but the APK's login
failed with:

`Failed to execute 'setRequestHeader' on 'XMLHttpRequest': The object's state must be OPENED.`

The native Capacitor config had `plugins.CapacitorHttp.enabled=true`, which
overrides WebView `XMLHttpRequest` and `fetch` in Capacitor. The HRMS login
uses Axios XHR, so the unnecessary native override was disabled by setting
`CapacitorHttp.enabled=false`; standard WebView HTTPS XHR remains enabled.
The secure `server.url`, `server.cleartext=false`, Android TLS restrictions,
AndroidKeyStore token encryption and native location tracking are unchanged.
A regression assertion checks both the source config and the config generated
by `npx cap sync android`.

**Device validation is still required.** The user must run
`npm.cmd run cap:sync` from `frontend/`, then
`.\\gradlew.bat assembleDebug` from `frontend/android/`, install/update
`app-debug.apk` on the test phone and verify password login works. Do not
claim a successful native login until that test passes. Do not use the previous
APK; its Capacitor configuration is packaged and will remain unchanged by a
backend-only deployment.

## Android 14 tracker interval regression (13 Nov 2026)

A real Android 14 device continued submitting location punches even after
HRMS was removed from recent apps and its notification was swiped away.
However, with the test interval set to two minutes, a punch at **10:47**
was followed by a punch at **10:50** after the user reopened HRMS at
**10:48**. The next punch would ordinarily have been due at about **10:49**.

Cause: after the WebView remounted, `BackgroundLocationTracker.jsx` sent
another `NativeLocationTracker.startTracking()` call. The Android service
unconditionally cancelled its existing `punchTickRunnable` and scheduled
a full interval from that second call, even though the interval was
unchanged.

Fix: in `LocationTrackerService.onStartCommand`, compare the newly
requested interval with the interval already running. If unchanged,
preserve the pending Handler tick and AlarmManager watchdog, and do not
repost a notification merely because the UI reopened. If the admin
actually changes the interval, update the notification and reschedule.

**Device retest required:** install a rebuilt debug APK, set a two-minute
interval, check in, observe a recorded punch, reopen the app between
scheduled punches, and confirm the following punch remains close to the
original due time. Android OS scheduling, GPS availability, and server
response time can still produce small timing variation. Confirm tracker
entries using the authorized Admin Attendance location view. Then check
out and ensure no further punches are recorded.

## How to verify on an Android test device

1. Rebuild and **install a new APK from the patched source**. The APK currently committed at `frontend/public/downloads/Acme HRMS.apk` is an older binary and is **not automatically updated** by these source changes.
2. Sign in with a development employee test account, check in, and permit foreground/background location as required. Confirm the tracking notification appears and the backend receives expected telemetry at the configured interval.
3. Force close/restart the UI without stopping the foreground service; confirm tracking resumes correctly after Android restarts the service. Reinstall an updated APK over a pre-SEC-006 installation and confirm any old plain token migrates and is no longer present in `hrms_tracker_prefs.xml`.
4. Check out or stop the tracker; confirm background tracking stops and both token preferences are cleared.
5. With a **release** APK, inspect `adb logcat` while tracking: no GPS coordinates, HTTP response bodies or JWTs should appear from the tracker. Debug logs are not a substitute for production verification.
6. Inspect the rebuilt release manifest and APK using Android Studio / `apkanalyzer` / MobSF. Confirm backup is disabled, no cleartext allowed, and DEX code is R8-minified. Check for cleartext or embedded secrets in third-party plugins.
7. Check that the rest of the mobile app's login, attendance, downloads, and camera functions continue to work.

## Limitations and rollout requirements

- This work protects the **native location service's persisted token**. The React WebView still uses `localStorage` for HRMS JWT, which is tracked separately as **SEC-021**. Full app token protection requires that separate change.
- Some third-party Capacitor plugins might require extra R8 keep rules; compilation alone does not guarantee runtime reflection works.
- Credential migration after Android Keystore loss intentionally fails closed. The user must authenticate again rather than restore an unreadable token.
- The mobile APK hosted in the web app has **not** been rebuilt, re-signed or replaced. Do not distribute it as if SEC-006 were fixed. Publish a new signed APK after device tests; update the existing link or release distribution process without breaking compatibility.
- If the production API host changes, update both the Capacitor URL and the native HTTPS host allowlist and rebuild the APK.
- No production database, Supabase buckets, or Render configuration is modified by this native fix.

**Closure gate:** CI green + rebuilt APK installed and tested on Android (including resumed service, Logcat, and cleartext/backup checks) + publication of updated APK before actual users.
