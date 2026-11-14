import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const manifest = read('frontend/android/app/src/main/AndroidManifest.xml');
const extraction = read('frontend/android/app/src/main/res/xml/data_extraction_rules.xml');
const capacitor = JSON.parse(read('frontend/capacitor.config.json'));
const gradle = read('frontend/android/app/build.gradle');
const service = read('frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerService.java');
const plugin = read('frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerPlugin.java');
const tokenStore = read('frontend/android/app/src/main/java/com/example/acmehrms/TrackerTokenStore.java');

test('disable Android app backup including Android 12+ transfers', () => {
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:dataExtractionRules="@xml\/data_extraction_rules"/);
  assert.match(extraction, /<cloud-backup>[\s\S]*?<exclude domain="root" path="\."/);
  assert.match(extraction, /<device-transfer>[\s\S]*?<exclude domain="root" path="\."/);
});

test('SEC-006 Android Axios login uses the standard WebView XMLHttpRequest', () => {
  // Browser login succeeds; the optional CapacitorHttp XHR override caused
  // the Android-only setRequestHeader InvalidStateError.
  assert.equal(capacitor.plugins.CapacitorHttp.enabled, false);
  assert.equal(capacitor.server.url, 'https://hrms-qwv3.onrender.com');
  const axios = read('frontend/src/api/axios.js');
  const auth = read('frontend/src/contexts/AuthContext.jsx');
  assert.match(axios, /axios\.create\(/);
  assert.match(auth, /api\.post\('\/login'/);
  assert.match(capacitor.server.url, /^https:\/\//);
  assert.equal(capacitor.server.cleartext, false);
});

test('reopening HRMS cannot postpone an already-scheduled native tracker punch', () => {
  // WebView lifecycle restarts can call startTracking repeatedly. The native
  // service must not cancel the pending Handler tick for the same interval.
  const start = service.slice(
    service.indexOf('public int onStartCommand('),
    service.indexOf('private void startForegroundServiceNotification()')
  );
  assert.match(start, /final long previousIntervalMs = intervalMs;/);
  const duplicate = start.slice(start.indexOf('// Idempotent START:'));
  assert.match(duplicate, /if \(intervalMs != previousIntervalMs\) \{/);
  assert.match(duplicate, /if \(intervalMs != previousIntervalMs\) \{[\s\S]*?bgHandler\.removeCallbacks\(punchTickRunnable\);[\s\S]*?bgHandler\.postDelayed\(punchTickRunnable, intervalMs\);[\s\S]*?scheduleNextPunchAlarm\(\);/);
  const sameInterval = duplicate.slice(duplicate.indexOf('// Also avoid needlessly'));
  assert.doesNotMatch(sameInterval, /postDelayed\(punchTickRunnable/);
  assert.doesNotMatch(sameInterval, /updateNotification\(/);
});

test('all native cleartext HTTP transports are disabled', () => {
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.equal(capacitor.server.cleartext, false);
  assert.match(capacitor.server.url, /^https:\/\//);
  assert.match(tokenStore, /"https"\.equalsIgnoreCase\(uri\.getScheme\(\)\)/);
  assert.match(tokenStore, /"hrms-qwv3\.onrender\.com"\.equalsIgnoreCase\(uri\.getHost\(\)\)/);
  assert.match(plugin, /TrackerTokenStore\.trustedEndpoint\(serverUrl\)/);
  assert.match(service, /TrackerTokenStore\.trustedEndpoint\(serverUrl\)/);
  assert.equal((service.match(/setInstanceFollowRedirects\(false\)/g) ?? []).length, 2);
});

test('native service JWT is AES-GCM encrypted using non-exportable AndroidKeyStore', () => {
  assert.match(tokenStore, /AndroidKeyStore/);
  assert.match(tokenStore, /AES\/GCM\/NoPadding/);
  assert.match(tokenStore, /setRandomizedEncryptionRequired\(true\)/);
  assert.match(tokenStore, /GCMParameterSpec\(128, iv\)/);
  assert.match(tokenStore, /\.remove\(LEGACY_KEY\)\.commit\(\)/);
  assert.match(service, /TrackerTokenStore\.save\(this, authToken\)/);
  assert.match(service, /TrackerTokenStore\.load\(this\)/);
  assert.match(service, /TrackerTokenStore\.clear\(this\)/);
  assert.doesNotMatch(service, /putString\(["']auth_token["']/);
  assert.doesNotMatch(service, /getString\(["']auth_token["']/);
});

test('release build minifies bytecode and filters diagnostics', () => {
  assert.match(gradle, /minifyEnabled true/);
  assert.match(gradle, /shrinkResources true/);
  assert.match(gradle, /buildConfig true/);
  for (const [source, name] of [[service, 'service'], [plugin, 'plugin']]) {
    const leaks = source.split('\n').filter(line => /\bLog\.[diwev]\(/.test(line) && !line.includes('if (BuildConfig.DEBUG)'));
    assert.deepEqual(leaks, [], 'Unprotected Log call in ' + name);
  }
  assert.doesNotMatch(service, /Log\.[diwev]\([^\n]*(getLatitude|getLongitude|response|respStr)/);
});

test('employee APK download uses a verified current signed release', () => {
  const profile = read('frontend/src/pages/EmployeeMobileProfile.jsx');
  const workflow = read('.github/workflows/sec006.yml');

  assert.ok(profile.includes('/downloads/android-release.json'));
  assert.ok(profile.includes("cache: 'no-store'"));
  assert.ok(profile.includes('androidRelease.versionCode'));
  assert.ok(profile.includes('androidRelease ? ('));
  assert.ok(profile.includes('Android APK update is pending verified signing'));
  assert.ok(!profile.includes("VITE_APP_VERSION || '1'"));

  // Source changes rebuild Android; published APK/metadata commits do not
  // loop back into a self-triggered Android rebuild.
  assert.ok(workflow.includes("'frontend/src/**'"));
  assert.ok(workflow.includes("'!frontend/public/downloads/Acme HRMS.apk'"));
  assert.ok(workflow.includes("'!frontend/public/downloads/android-release.json'"));
  assert.ok(workflow.includes('verify --print-certs'));
  assert.ok(workflow.includes('ALLOW_SIGNER_MIGRATION'));
  assert.ok(workflow.includes('git add "$existing" frontend/public/downloads/android-release.json'));
  assert.ok(workflow.includes('sha256sum "$signed"'));
});
