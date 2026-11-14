import { Capacitor } from '@capacitor/core';
import { NativeLocationTracker } from '../plugins/NativeLocationTracker';

// SEC-012: Native refresh credentials never enter WebView localStorage.
// Their only JS exposure is the just-authenticated login HTTP response;
// transfer immediately to Android Keystore before using the access JWT.
export const isAndroidSession = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export async function saveNativeSession(data) {
  if (!isAndroidSession) return;
  if (!data?.token || !data?.refreshToken) {
    throw new Error('This Android app requires a renewed secure login session.');
  }
  await NativeLocationTracker.saveSession({
    accessToken: data.token,
    refreshToken: data.refreshToken,
  });
}

export async function getNativeAccessToken() {
  if (!isAndroidSession) return null;
  try {
    const result = await NativeLocationTracker.getSessionAccessToken();
    return result?.accessToken || null;
  } catch {
    return null;
  }
}

export async function refreshNativeSession() {
  if (!isAndroidSession) throw new Error('Not a native Android session.');
  const result = await NativeLocationTracker.refreshSession();
  if (!result?.token) throw new Error('Secure Android refresh failed.');
  return result.token;
}

export async function clearNativeSession() {
  if (!isAndroidSession) return;
  await NativeLocationTracker.clearSession();
}
