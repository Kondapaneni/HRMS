import axios from 'axios';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { getNativeAccessToken, refreshNativeSession, isAndroidSession } from './nativeSession';

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

// Native tracker may rotate the access JWT while the WebView is closed.
// Read only the Keystore-protected current access token, never the refresh secret.
api.interceptors.request.use(async (config) => {
  if (isAndroidSession && [
    '/login', '/candidate/login', '/auth/otp/verify', '/auth/mfa/verify',
  ].includes(config.url)) {
    config.headers['X-HRMS-Client'] = 'android';
  }
  if (isAndroidSession) {
    const current = await getNativeAccessToken();
    if (current && current !== localStorage.getItem('token')) {
      localStorage.setItem('token', current);
    }
  }
  const token = localStorage.getItem('token');
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
    // Other browser tabs share the latest access token in localStorage.
    // If a prior tab already refreshed, never submit its obsolete cookie again.
    const latest = localStorage.getItem('token');
    if (latest && latest !== staleToken && isUnexpiredToken(latest)) return latest;
    const res = await axios.post('/api/auth/refresh', {}, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json', 'X-HRMS-Refresh': '1' },
    });
    if (!res.data?.token) throw new Error('Missing renewed access token');
    localStorage.setItem('token', res.data.token);
    return res.data.token;
  };

  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('hrms-refresh-session', rotate);
  }
  return rotate();
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
        sharedRefresh = renewAccess(request.headers.Authorization?.replace(/^Bearer\\s+/i, '') || localStorage.getItem('token')).finally(() => { sharedRefresh = null; });
      }
      try {
        const token = await sharedRefresh;
        localStorage.setItem('token', token);
        request.headers.Authorization = `Bearer ${token}`;
        return api(request);
      } catch (refreshError) {
        const permanent = [401, 403].includes(refreshError.response?.status)
          || (isAndroidSession && refreshError.code === 'AUTH_REVOKED');
        if (permanent) {
          localStorage.removeItem('token');
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
      console.error('API Error:', error);
    }
    return Promise.reject(error);
  }
);

export default api;
