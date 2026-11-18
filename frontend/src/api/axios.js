import axios from 'axios';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { getNativeAccessToken, refreshNativeSession, isAndroidSession } from './nativeSession';
import { clearPrivateSessionStorage } from './browserStorage';

const DEACTIVATED_ACCOUNT_MESSAGE = 'Your account has been deactivated. Please contact your administrator.';
let deactivationRedirectScheduled = false;

export const isNativeApp = Capacitor.isNativePlatform();
export const isIOS = (() => {
  if (typeof window === 'undefined') return false;
  if (Capacitor.getPlatform() === 'ios') return true;
  const ua = window.navigator.userAgent || window.navigator.vendor || window.opera || '';
  const platform = window.navigator.platform || '';
  const isApple = (/iPad|iPhone|iPod/i.test(ua) || /iPad|iPhone|iPod/i.test(platform)) && !window.MSStream;
  const isIPadOS = (platform === 'MacIntel' || /Macintosh/i.test(ua)) && window.navigator.maxTouchPoints > 1;
  return Boolean(isApple || isIPadOS);
})();
export const REMOTE_API_URL = import.meta.env.VITE_API_URL || (import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api');
export const REMOTE_ORIGIN = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export const getAssetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = isNativeApp ? REMOTE_ORIGIN : window.location.origin;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const api = axios.create({
  baseURL: isNativeApp ? REMOTE_API_URL : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Web access JWTs exist in module memory only. The rotating refresh secret
// stays in an HttpOnly/Secure/SameSite=Strict cookie, never Web Storage.
// Android keeps both credentials in the OS Keystore via the native bridge.
let webAccessToken = null;
export const getAccessToken = () => webAccessToken;
export function setAccessToken(token) {
  if (!isAndroidSession) webAccessToken = token || null;
  if (token && typeof window !== 'undefined') {
    try { window.sessionStorage.removeItem('hrms_block_session_restore'); } catch { /* denied */ }
  }
}
export function clearSessionAccess() {
  webAccessToken = null;
  clearPrivateSessionStorage();
}

api.interceptors.request.use(async (config) => {
  if (isAndroidSession && [
    '/login', '/candidate/login', '/auth/otp/verify', '/auth/mfa/verify',
  ].includes(config.url)) {
    config.headers['X-HRMS-Client'] = 'android';
  }
  const token = isAndroidSession ? await getNativeAccessToken() : webAccessToken;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper to recursively convert Postgres timestamps to ISO UTC format
const isPostgresTimestamp = (value) => {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value);
};

const convertDates = (obj) => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (isPostgresTimestamp(obj[i])) {
        // Postgres returns IST (because we changed DB timezone), so append +05:30
        obj[i] = obj[i].replace(' ', 'T') + '+05:30';
      } else if (typeof obj[i] === 'object') {
        convertDates(obj[i]);
      }
    }
  } else {
    for (const key of Object.keys(obj)) {
      if (isPostgresTimestamp(obj[key])) {
        obj[key] = obj[key].replace(' ', 'T') + '+05:30';
      } else if (typeof obj[key] === 'object') {
        convertDates(obj[key]);
      }
    }
  }
  return obj;
};

// One refresh at a time across simultaneous 401 responses, preventing an
// accidental reuse of a rotated one-time credential.
let sharedRefresh = null;
const publicAuthPaths = [
  '/login', '/candidate/login', '/auth/otp/send', '/auth/otp/verify',
  '/auth/mfa/verify', '/auth/refresh', '/forgot-password', '/reset-password',
];
const isPublicAuthCall = (url = '') =>
  publicAuthPaths.some(p => url.split('?')[0] === p || url.endsWith('/api' + p));

function isUnexpiredToken(token) {
  try {
    const segment = token.split('.')[1];
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(padded));
    return Number.isFinite(claims.exp) && claims.exp > Date.now() / 1000 + 30;
  } catch {
    return false;
  }
}

async function renewAccess(staleToken) {
  if (isAndroidSession) return refreshNativeSession();
  const rotate = async () => {
    // Serialize cookie rotation across tabs where the Web Locks API exists.
    // The browser sends its latest shared HttpOnly refresh cookie automatically.
    if (webAccessToken && webAccessToken !== staleToken && isUnexpiredToken(webAccessToken)) {
      return webAccessToken;
    }
    const res = await axios.post('/api/auth/refresh', {}, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json', 'X-HRMS-Refresh': '1' },
    });
    if (!res.data?.token) throw new Error('Missing renewed access token');
    setAccessToken(res.data.token);
    return res.data.token;
  };
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('hrms-refresh-session', rotate);
  }
  return rotate();
}

/**
 * Called on startup, including a full-page reload, before showing protected UI.
 * A 401 means no active session; a 503/network outage is NOT a revocation.
 */
export async function restoreSession() {
  if (typeof window !== 'undefined') {
    try { if (window.sessionStorage.getItem('hrms_block_session_restore') === '1') return null; } catch { /* denied */ }
  }
  if (isAndroidSession) {
    const native = await getNativeAccessToken();
    if (native) return native;
  } else if (webAccessToken && isUnexpiredToken(webAccessToken)) {
    return webAccessToken;
  }
  if (!sharedRefresh) {
    sharedRefresh = renewAccess(webAccessToken).finally(() => { sharedRefresh = null; });
  }
  try {
    return await sharedRefresh;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403
      || (isAndroidSession && error.code === 'AUTH_REVOKED')) {
      setAccessToken(null);
      return null;
    }
    throw error;
  }
}

api.interceptors.response.use(
  (response) => {
    convertDates(response.data);
    return response;
  },
  async (error) => {
    const request = error.config;
    if (error.response?.status === 401
      && request && !request._sec012Retried
      && !isPublicAuthCall(request.url)) {
      request._sec012Retried = true;
      if (!sharedRefresh) {
        sharedRefresh = renewAccess(request.headers.Authorization?.replace(/^Bearer\s+/i, '') || webAccessToken).finally(() => { sharedRefresh = null; });
      }
      try {
        const token = await sharedRefresh;
        setAccessToken(token);
        request.headers.Authorization = `Bearer ${token}`;
        return api(request);
      } catch (refreshError) {
        const permanent = [401, 403].includes(refreshError.response?.status)
          || (isAndroidSession && refreshError.code === 'AUTH_REVOKED');
        if (permanent) {
          setAccessToken(null);
        } else {
          // A 503, offline network or transient native Keystore fault is NOT
          // a revocation. Let the caller retry later rather than log out.
          return Promise.reject(refreshError);
        }
      }
    }

    if (error.response?.status === 401) {
      return Promise.reject(error);
    }
    if (error.response?.status === 403) {
      if (error.response.data?.error === DEACTIVATED_ACCOUNT_MESSAGE) {
        if (window.location.pathname !== '/' && !deactivationRedirectScheduled) {
          deactivationRedirectScheduled = true;
          toast.error(DEACTIVATED_ACCOUNT_MESSAGE, { id: 'account-deactivated', duration: 5000 });
          setTimeout(() => { window.location.href = '/'; }, 1500);
        }
      }
    } else if (error.response?.status !== 429) {
      // Deliberately avoid logging AxiosError: it contains request headers and private response data.
    }
    return Promise.reject(error);
  }
);

export default api;
