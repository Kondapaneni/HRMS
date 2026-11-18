import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api, { restoreSession, setAccessToken, clearSessionAccess } from '../api/axios';
import { saveNativeSession, clearNativeSession } from '../api/nativeSession';
import SplashScreen from '../components/SplashScreen';

const AuthContext = createContext({});

const PUBLIC_ROUTES = [
  '/',
  '/candidate/login',
  '/candidate/activate',
  '/forgot-password',
  '/reset-password',
];

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [hasSession, setHasSession] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const fetchInProgress = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (fetchInProgress.current) return;
    
    fetchInProgress.current = true;
    setProfileLoading(true);
    try {
      const access = await restoreSession();
      if (!access) throw new Error('No token found');
      setHasSession(true);
      const response = await api.get('/me');
      setProfile(response.data);
      setUser({ email: response.data.email, id: response.data.id });
    } catch (error) {
      if (error.message === 'No token found' || (error.response && (error.response.status === 401 || error.response.status === 403))) {
        // User is simply not logged in or session expired
        clearSessionAccess();
        setHasSession(false);
        setProfile(null);
        setUser(null);
      } else {
        // A transient outage must not erase valid login or expose private error objects.
      }
    } finally {
      setProfileLoading(false);
      fetchInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    if (isInitialized) return;

    // A page reload restores web access through its HttpOnly refresh cookie,
    // or Android access through the Keystore. No bearer token is read from disk.
    const initializeAuth = async () => {
      const startTime = Date.now();
      await fetchProfile();
      // Preserve the existing protected-route splash without delaying public login.
      if (!PUBLIC_ROUTES.includes(location.pathname)) {
        const remaining = 1200 - (Date.now() - startTime);
        if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
      }
      setLoading(false);
      setIsInitialized(true);
    };
    initializeAuth();
  }, [fetchProfile, isInitialized, location.pathname]);

  const signIn = async (email, password) => {
    const response = await api.post('/login', { email, password });
    if (response.data?.mfaRequired) {
      return {
        mfaRequired: true,
        mfaToken: response.data.mfaToken,
        email: response.data.email,
      };
    }
    const { token, user: userData } = response.data;
    if (token) {
      await saveNativeSession(response.data);
      setAccessToken(token);
      setHasSession(true);
    }
    await fetchProfile();
    return userData;
  };

  const verifyMfa = async (mfaToken, code, isBackupCode = false) => {
    const response = await api.post('/auth/mfa/verify', { mfaToken, code, isBackupCode });
    const { token, user: userData } = response.data;
    if (token) {
      await saveNativeSession(response.data);
      setAccessToken(token);
      setHasSession(true);
    }
    await fetchProfile();
    return userData;
  };

  const sendLoginOtp = async (email) => {
    const response = await api.post('/auth/otp/send', { email });
    return response.data;
  };

  const signInWithOtp = async (email, otp) => {
    const response = await api.post('/auth/otp/verify', { email, otp });
    // SEC-008: Email OTP is only the first factor when TOTP MFA is active.
    // Never persist the pending challenge token as an authenticated session.
    if (response.data?.mfaRequired) {
      return {
        mfaRequired: true,
        mfaToken: response.data.mfaToken,
        email: response.data.email,
      };
    }
    const { token, user: userData } = response.data;
    if (token) {
      await saveNativeSession(response.data);
      setAccessToken(token);
      setHasSession(true);
    }
    await fetchProfile();
    return userData;
  };

  const signOut = async (options = {}) => {
    // SEC-012 account-wide revocation remains server-authoritative.
    // Offline failures are not reported as successful remote revocation.
    if (!options?.localOnly) {
      try {
        await api.post('/logout');
      } catch {
        // If the network is down, do not silently restore the old cookie
        // on the next reload; server-side revocation remains unconfirmed.
        try { sessionStorage.setItem('hrms_block_session_restore', '1'); } catch { /* denied */ }
      }
    } else {
      try { sessionStorage.setItem('hrms_block_session_restore', '1'); } catch { /* denied */ }
    }
    try {
      await clearNativeSession();
    } catch {
      // Platform secure store errors must not expose native credentials.
    }
    clearSessionAccess();
    setHasSession(false);
    setProfile(null);
    setUser(null);
    queryClient.clear();
    try { localStorage.setItem('hrms_session_event', String(Date.now())); } catch { /* denied */ }
  };

  useEffect(() => {
    const syncLogout = event => {
      if (event.key !== 'hrms_session_event') return;
      clearSessionAccess();
      setHasSession(false);
      setUser(null);
      setProfile(null);
      queryClient.clear();
    };
    window.addEventListener('storage', syncLogout);
    return () => window.removeEventListener('storage', syncLogout);
  }, [queryClient]);

  const value = {
    user,
    hasSession,
    profile,
    loading,
    profileLoading,
    isInitialized,
    signIn,
    verifyMfa,
    sendLoginOtp,
    signInWithOtp,
    signOut,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <SplashScreen /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
