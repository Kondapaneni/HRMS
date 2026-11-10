import axios from 'axios';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';

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

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
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

api.interceptors.response.use(
  (response) => {
    convertDates(response.data);
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // 401s are expected authentication states. We pass the rejection down 
      // so AuthContext can handle it silently without generic error logging.
      return Promise.reject(error);
    } else if (error.response && error.response.status === 403) {
      if (error.response.data?.error === DEACTIVATED_ACCOUNT_MESSAGE) {
        if (window.location.pathname !== '/' && !deactivationRedirectScheduled) {
          deactivationRedirectScheduled = true;
          toast.error(DEACTIVATED_ACCOUNT_MESSAGE, {
            id: 'account-deactivated',
            duration: 5000,
          });
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      }
    } else if (error.response && error.response.status === 429) {
      // 429 errors are now handled directly by the components to show inline countdowns
    } else {
      // Log unexpected errors (500s, network failures, etc.)
      console.error('API Error:', error);
    }
    return Promise.reject(error);
  }
);

export default api;
