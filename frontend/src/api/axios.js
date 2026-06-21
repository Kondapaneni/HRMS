import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api', // Always use /api relative path since frontend and backend are hosted together
  headers: {
    'Content-Type': 'application/json',
  },
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

// Add a request interceptor to automatically inject the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    convertDates(response.data);
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 403) {
      if (error.response.data?.error === 'Your account has been deactivated. Please contact your administrator.') {
        localStorage.removeItem('token');
        if (window.location.pathname !== '/') {
          toast.error(error.response.data.error, { duration: 5000 });
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      }
    } else if (error.response && error.response.status === 429) {
      // 429 errors are now handled directly by the components to show inline countdowns
    }
    return Promise.reject(error);
  }
);

export default api;
