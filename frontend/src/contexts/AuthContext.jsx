import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { saveNativeSession, clearNativeSession, isAndroidSession } from '../api/nativeSession';
import { eraseLegacySensitiveStorage, hasBrowserSessionCookie } from '../api/browserPrivacy';
import SplashScreen from '../components/SplashScreen';

const AuthContext = createContext({});

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/candidate/login',
  '/candidate/activate',
  '/forgot-password',
  '/reset-password',
];

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [user, setUser] = useState(null);
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
      const response = await api.get('/me');
      setProfile(response.data);
      setUser({ email: response.data.email, id: response.data.id });
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        // User is simply not logged in or session expired
        eraseLegacySensitiveStorage();
        queryClient.clear();
        setProfile(null);
        setUser(null);
      } else {
        if (import.meta.env.DEV) console.error('Profile request failed (status only):', error.response?.status || 'network');
      }
    } finally {
      setProfileLoading(false);
      fetchInProgress.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    if (isInitialized) return;
    const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);
    // The CSRF cookie is only a non-sensitive session hint; the server
    // still authenticates every request and enforces current permissions.
    if (isPublicRoute && !hasBrowserSessionCookie() && !isAndroidSession) {
      setLoading(false);
      setIsInitialized(true);
      return;
    }

    const initializeAuth = async () => {
      const started = Date.now();
      await fetchProfile();
      // Preserve splash UX without delaying anonymous public sign-in.
      const minDelay = isPublicRoute ? 0 : 1200;
      const remaining = minDelay - (Date.now() - started);
      if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
      setLoading(false);
      setIsInitialized(true);
    };
    initializeAuth();
  }, [fetchProfile, isInitialized, location.pathname]);

  useEffect(() => {
    const clearClientState = () => {
      eraseLegacySensitiveStorage();
      queryClient.clear();
      setProfile(null);
      setUser(null);
    };
    const onExpired = () => clearClientState();
    window.addEventListener('hrms-session-expired', onExpired);
    const channel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('hrms-auth') : null;
    if (channel) channel.onmessage = event => {
      if (event.data === 'signed-out') clearClientState();
    };
    return () => {
      window.removeEventListener('hrms-session-expired', onExpired);
      channel?.close();
    };
  }, [queryClient]);

  const signIn = async (email, password) => {
    const response = await api.post('/login', { email, password });
    if (response.data?.mfaRequired) {
      return {
        mfaRequired: true,
        mfaToken: response.data.mfaToken,
        email: response.data.email,
      };
    }
    const { user: userData } = response.data;
    // Web sessions are already set through HttpOnly cookies in this response.
    // Native credentials go directly into the Android Keystore.
    if (isAndroidSession) await saveNativeSession(response.data);
    queryClient.clear();
    eraseLegacySensitiveStorage();
    await fetchProfile();
    return userData;
  };

  const verifyMfa = async (mfaToken, code, isBackupCode = false) => {
    const response = await api.post('/auth/mfa/verify', { mfaToken, code, isBackupCode });
    const { user: userData } = response.data;
    // Web sessions are already set through HttpOnly cookies in this response.
    // Native credentials go directly into the Android Keystore.
    if (isAndroidSession) await saveNativeSession(response.data);
    queryClient.clear();
    eraseLegacySensitiveStorage();
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
    const { user: userData } = response.data;
    // Web sessions are already set through HttpOnly cookies in this response.
    // Native credentials go directly into the Android Keystore.
    if (isAndroidSession) await saveNativeSession(response.data);
    queryClient.clear();
    eraseLegacySensitiveStorage();
    await fetchProfile();
    return userData;
  };

  const signOut = async (options = {}) => {
    let revocationUnconfirmed = false;
    try {
      if (options?.localOnly) {
        // Change Password has already revoked the JWT in the database.
        if (!isAndroidSession) await api.post('/auth/clear-session');
      } else {
        await api.post('/logout');
      }
    } catch {
      // Never claim a failed server revocation was successful.
      revocationUnconfirmed = !options?.localOnly;
    } finally {
      try {
        await clearNativeSession();
      } catch {
        revocationUnconfirmed = true;
      }
      eraseLegacySensitiveStorage();
      setProfile(null);
      setUser(null);
      queryClient.clear();
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('hrms-auth');
        channel.postMessage('signed-out');
        channel.close();
      }
    }
    if (revocationUnconfirmed) {
      throw new Error('Server logout could not be confirmed. Reconnect and sign out again before using a shared device.');
    }
  };

  const value = {
    user,
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
