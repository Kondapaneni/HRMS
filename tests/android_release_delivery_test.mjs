import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAndroidRelease, ANDROID_RELEASE_MANIFEST_URL } from '../frontend/src/utils/androidRelease.js';

const valid = {
  versionCode: 42,
  versionName: '1.0.42',
  sha256: 'a'.repeat(64),
  downloadUrl: 'https://jtgqkkhqyzfbupiqwkgf.supabase.co/storage/v1/object/public/app_builds/android/releases/42/acme-hrms.apk?download=Acme%20HRMS.apk',
};

test('release metadata points to the configured public app_builds bucket', () => {
  assert.equal(ANDROID_RELEASE_MANIFEST_URL, 'https://jtgqkkhqyzfbupiqwkgf.supabase.co/storage/v1/object/public/app_builds/android/latest.json');
  assert.equal(parseAndroidRelease(valid).versionCode, 42);
});

test('rejects malformed or untrusted download information', () => {
  assert.throws(() => parseAndroidRelease({ ...valid, versionCode: 43 }));
  assert.throws(() => parseAndroidRelease({ ...valid, downloadUrl: 'https://evil.example/app.apk' }));
  assert.throws(() => parseAndroidRelease({ ...valid, sha256: 'not-a-checksum' }));
  assert.throws(() => parseAndroidRelease({ ...valid, versionCode: 0 }));
  assert.throws(() => parseAndroidRelease({ ...valid, versionName: '<script>' }));
});
