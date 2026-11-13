# GitHub-only Android APK build and download

The mobile HRMS Employee Profile already links to `/downloads/Acme%20HRMS.apk`.
Vite copies `frontend/public/downloads/Acme HRMS.apk` into the deployed website,
so employees don't need access to the private GitHub repository.

`.github/workflows/sec006.yml` now:
1. Runs SEC-006 security tests, builds the Android APK on GitHub Actions with Java 17.
2. Saves a seven-day `hrms-android-debug-apk` GitHub Actions artifact for testing.
3. On successful main-branch runs, checks the new APK signing certificate and
   versionCode against the existing website APK before updating the file in GitHub.
4. If compatible, commits the APK to `frontend/public/downloads/Acme HRMS.apk`
   and relies on the configured HRMS website redeployment to serve the new file.

**No GitHub repository signing or Supabase secret configuration is needed just to
build and save a test APK in Actions.**

**Important limitation:** Android cannot update an existing installation using
an APK signed with a different certificate. GitHub hosted runners generate
different debug signing keys, so the update-in-repo step is deliberately blocked
when the certificate does not match. The current local `debug.keystore`
certificate differs from the existing distributed APK. The private signing
keystore used on that original APK must be recovered for safe in-place updates.
A new signing key requires an explicit migration/reinstall plan and then
stable signed builds for later upgrades. Do not publish an incompatible debug
build to employees pretending it is an in-place update.

The existing repo stores a roughly 70MB APK. Repeated commits of an APK this
size will increase Git history substantially. A release asset host is preferable
at higher deployment frequency.

## Validation

- Confirm security + APK build jobs succeed in GitHub Actions.
- Download the test APK from the Actions run's Artifacts section.
- Inspect the publish job. A certificate mismatch should emit a warning and
  leave the deployed employee APK unchanged.
- When signing is compatible, verify a commit updates the tracked APK; then
  confirm the Render/HRMS site actually deploys it and that Profile downloads
  the updated APK on a test phone.
