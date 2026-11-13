// Public release metadata only. Never put Supabase secret keys in browser code.
const STORAGE_ORIGIN = 'https://jtgqkkhqyzfbupiqwkgf.supabase.co';
const RELEASE_APK_PATH = /^\/storage\/v1\/object\/public\/app_builds\/android\/releases\/(\d+)\/acme-hrms\.apk$/;

export const ANDROID_RELEASE_MANIFEST_URL = STORAGE_ORIGIN + '/storage/v1/object/public/app_builds/android/latest.json';

export function parseAndroidRelease(raw) {
  if (!raw || typeof raw !== 'object' || !Number.isSafeInteger(raw.versionCode) || raw.versionCode <= 0) {
    throw new Error('Invalid Android release version');
  }
  if (typeof raw.versionName !== 'string' || !/^\d+\.\d+(?:\.\d+)*$/.test(raw.versionName)) {
    throw new Error('Invalid Android release name');
  }
  if (typeof raw.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.sha256)) {
    throw new Error('Invalid APK checksum');
  }
  const url = new URL(raw.downloadUrl);
  const path = url.pathname.match(RELEASE_APK_PATH);
  if (url.origin !== STORAGE_ORIGIN || url.protocol !== 'https:' || !path || Number(path[1]) !== raw.versionCode) {
    throw new Error('Unexpected APK download location');
  }
  return {
    versionCode: raw.versionCode,
    versionName: raw.versionName,
    sha256: raw.sha256,
    downloadUrl: url.toString(),
  };
}
