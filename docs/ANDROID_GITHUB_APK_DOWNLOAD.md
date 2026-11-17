# HRMS Android APK download through GitHub + existing Employee Profile

The mobile browser's HRMS Employee Profile already links to
`/downloads/Acme%20HRMS.apk`. Vite copies the file from
`frontend/public/downloads/Acme HRMS.apk` into the deployed website.
Employees never need GitHub access to download it.

## How the workflow works

1. GitHub Actions uses Java 17 to run the SEC-006 tests and builds the Android
   debug APK and optimized unsigned release APK.
2. GitHub Actions artifacts store the debug APK (7 days, for testers) and
   unsigned release APK (2 days, for the signing job).
3. On a successful `main` run, if the permanent signing secrets are configured,
   the release job signs the optimized release APK, verifies the package,
   signing certificate and increasing version code.
4. Only a compatible signed APK is copied to the existing GitHub file at
   `frontend/public/downloads/Acme HRMS.apk` and committed by GitHub Actions.
   The HRMS website must redeploy to make that file available to employees.
5. On Android, an employee opens HRMS in the mobile browser → Profile →
   Download Mobile App (APK), then confirms installation with Android.

## Minimum required one-time setup: 2 secrets, not 5

You must create a **permanent** Android keystore and back it up privately.
You cannot make Android accept changing signatures for existing installed apps.
GitHub runners' random debug keys are not suitable for ongoing app updates.

The workflow uses a fixed signing alias `hrms-release` and uses the same
password for keystore and key (compatible with PKCS#12). Add these secrets
under GitHub repository → Settings → Secrets and variables → Actions:

- `HRMS_ANDROID_RELEASE_KEYSTORE_BASE64` — Base64 of your permanent PKCS#12
  `hrms-release.p12` keystore.
- `HRMS_ANDROID_RELEASE_STORE_PASSWORD` — password for that keystore.

Generate the keystore **locally on your trusted computer** using:
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -alias hrms-release -keyalg RSA -keysize 3072 -validity 10000 -storetype PKCS12 -keystore "$env:USERPROFILE\Documents\hrms-release.p12" -dname "CN=Acme HRMS, OU=IT, O=Acme"
```
Keytool will prompt for a password; use a strong unique password. Store
a secure, offline backup of the keystore and password.

To add the Base64 secret without printing it in your terminal:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\Documents\hrms-release.p12")) | Set-Clipboard
```
Paste the clipboard into the first GitHub secret and clear the clipboard
afterward. Enter the password in the second GitHub secret. Never share the
keystore, Base64 contents or password in chat, code, source control or logs.

## One-time migration for existing Android installations

**Already distributed older HRMS APKs may have a different signing key.**
The current `frontend/public/downloads/Acme HRMS.apk` certificate differs
from the local `C:\Users\HP\.android\debug.keystore` certificate.
The newly installed GitHub debug build is also not necessarily signed with
the permanent key. A new permanent signing key will not support an in-place
upgrade over those installations.

To *retain* in-place update compatibility, you must use the original matching
signing keystore. Otherwise, the first permanent-key release is a **migration**:
employees must check out, back up any unsynced data, uninstall their existing
app, install the newly signed APK and log in again. Do not start migration
before communicating this interruption.

For safety, a mismatched certificate is **never** automatically published.
When a migration is explicitly approved, open GitHub Actions →
SEC-006 Android native security regression → Run workflow on `main` and check
`allow_signer_migration`. This is the only path that intentionally replaces
the website APK with a different signer. All later automatic builds use the
same permanent signing secrets and should update in place.

## Rollout checks

- Review and merge the workflow PR to main.
- Set the two secrets in the repository, or note the publish job will safely
  skip and the existing web APK will remain unchanged.
- For first new-signer release, coordinate with employees and explicitly run
  the migration workflow.
- Inspect GitHub Actions logs for successful signing, compatibility verification
  and Git commit; verify the website redeployed the changed download file.
- On an Android test phone download from the browser's Employee Profile,
  install, sign in, confirm the two-minute SEC-006 background location tracker
  continues across app closes/reopens, and check out.
- Run a subsequent release to confirm *in-place updates* without an uninstall.

**Caution:** The APK is ~70MB; versioning it in Git increases Git history
size significantly. This simple GitHub-only approach is practical for
occasional updates, but for frequent APK releases use an artifact storage
service. Website deployments may have size/runtime limits.
