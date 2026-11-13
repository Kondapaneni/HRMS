# Android APK updates from Employee Mobile Profile

This is the **Android browser** download flow for HRMS. It does not silently install
updates on phones. Users download a signed APK and confirm installation in Android.

## Architecture

- The existing `.github/workflows/sec006.yml` runs security regression tests and
  builds Android debug and optimized release APKs using Java 17.
- Debug APK artifacts are for testers only. **Never** publish debug APKs to employees.
- On successful pushes to `main` or a manual run on `main`, the native build
  signs the optimized release APK with the configured release key, validates its
  signing certificate against the older APK, uploads the versioned APK to the
  public Supabase Storage bucket `app_builds`, and only then updates
  `android/latest.json`.
- `frontend/src/pages/EmployeeMobileProfile.jsx` reads the public release
  manifest when opened in an Android browser and shows a versioned
  **Download / Update Android App** link. No GitHub login is required.
- The existing static `frontend/public/downloads/Acme HRMS.apk` file is **not**
  the release source after migration. Do not re-enable a fallback to it: it
  predates the latest SEC-006 Android security fixes.

## Required one-time GitHub repository secrets

In `Settings → Secrets and variables → Actions → New repository secret`, set:

1. `HRMS_ANDROID_RELEASE_KEYSTORE_BASE64` — base64-encoded keystore containing
   the signing certificate **already used by installed HRMS APKs**.
2. `HRMS_ANDROID_RELEASE_STORE_PASSWORD` — keystore password.
3. `HRMS_ANDROID_RELEASE_KEY_ALIAS` — signing key alias.
4. `HRMS_ANDROID_RELEASE_KEY_PASSWORD` — signing key password.
5. `HRMS_SUPABASE_RELEASE_SECRET_KEY` — server-only Supabase
   secret/service-role key with permission to upload files to `app_builds`.

Do not commit or paste signing keystores, passwords, or privileged Supabase
keys into source code, a web page, browser environment variables, or CI logs.
The Supabase project URL and bucket path are public information.

You can base64-encode a **known existing** JKS locally using PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\\path\\to\\existing-release.jks'))
```
Store the result in the GitHub repository secret; never share it in chat.

**Signing-key compatibility is mandatory for in-place Android updates.**
Check the installed/previously distributed APK with Android SDK
`apksigner verify --print-certs "Acme HRMS.apk"`, and confirm you still
possess the matching keystore. If the old APK used a different Android
Studio debug key and it is lost, you **cannot** upgrade that installation
in place using a new key. Plan a controlled migration with employee
communication instead. The workflow blocks publishing when signatures
differ from the current bundled APK.

The `app_builds` bucket is already public and currently configured for
100 MB per file; APK uploads larger than that will fail and require a
separate storage limit or distribution arrangement. Public means anyone
with the release link can download the APK, even without a GitHub account.
Do not use this bucket for private documents.

## First release verification

1. Confirm the five secrets exist and the existing release keystore matches
   the previously installed APK. Use an appropriately protected release key.
2. Merge the reviewed workflow/profile change to `main`.
3. Open GitHub Actions → **SEC-006 Android native security regression** and
   choose `Run workflow` for `main` if a new build is needed.
4. Confirm the security and native jobs pass, including signature verification,
   successful APK upload, and success of the `android/latest.json` upload.
5. Inspect the public manifest URL:
   `https://jtgqkkhqyzfbupiqwkgf.supabase.co/storage/v1/object/public/app_builds/android/latest.json`
6. On an Android phone, open the HRMS website in the mobile browser, sign in
   as a test employee, open **Profile**, and tap **Download / Update Android
   App**. Verify the APK download, OS installation prompt, installed version,
   login and 2-minute SEC-006 background location test.
7. Confirm any necessary Android `Install unknown apps` permission prompts,
   and that an installed app preserves data when updated.

The workflow uses an increasing GitHub Actions run number for Android
`versionCode` (and `1.0.<run_number>` for `versionName`). Every production
build must use the same signing key and an increasing version code. Release
metadata and APK are published only on `main`, never from pull requests.

## Limitations

- GitHub Actions build artifacts are temporary and require a GitHub account;
  the employee link uses **Supabase public object storage**, not artifacts.
- Merging this change **alone does not publish a signed APK**; GitHub secrets
  must be correctly configured and a successful release run must occur.
- Clicking a download link does **not silently install or auto-update** Android
  apps. Android asks users to approve installing the APK.
- Every build of the web frontend is not necessarily a new Android binary.
  The native workflow triggers on Android-related changes and manual dispatch.
