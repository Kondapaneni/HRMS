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
