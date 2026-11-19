import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRefreshControl } from '../state/remote.js';
import api, { restoreSession, setAccessToken, clearSessionAccess } from '../api/axios';
import { saveNativeSession, clearNativeSession } from '../api/nativeSession';
import SplashScreen from '../components/SplashScreen';
import { primeInitialMaintenanceStatus } from '../performance/initialMaintenanceStatus';
import { prepareAuthenticatedLanding, waitForMinimumSplash } from '../performance/dashboardBoot';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const refreshControl = useRefreshControl();
  const [user, setUser] = useState(null);
  const [hasSession, setHasSession] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const initialSplashStartedAt = useRef(Date.now());
  const bootstrapStarted = useRef(false);
  // Share the same in-flight bootstrap across StrictMode mount effects and
  // concurrent profile requests. Don't accidentally resolve a second caller early.
  const fetchPromise = useRef(null);

  const fetchProfile = useCallback(async () => {
    if (fetchPromise.current) return fetchPromise.current;
    const work = (async () => {
      setProfileLoading(true);
      try {
        const access = await restoreSession();
        if (!access) throw new Error('No token found');
        setHasSession(true);
        const response = await api.get('/me');
        setProfile(response.data);
        setUser({ email: response.data.email, id: response.data.id });
        return response.data;
      } catch (error) {
        if (error.message === 'No token found'
            || [401, 403].includes(error.response?.status)) {
          clearSessionAccess();
          setHasSession(false);
          setProfile(null);
          setUser(null);
        }
        // Network/maintenance outage is not proof of revocation.
        return null;
      } finally {
        setProfileLoading(false);
      }
    })();
    fetchPromise.current = work;
    try { await work; } finally { fetchPromise.current = null; }
  }, []);

  const prepareForDashboard = useCallback(async (verifiedProfile, statusPromise) => {
    if (!verifiedProfile) return;
    // Only use a positive public maintenance check for employee data warmup.
    // MaintenanceGate remains the authoritative UI gate and checks status
    // again if this bootstrap response has expired.
    let maintenanceMode = null;
    try {
      const status = await statusPromise;
      maintenanceMode = status.data?.maintenance_mode ?? null;
    } catch {
      // No private prefetch if public maintenance status is unknown.
    }
    try {
      await prepareAuthenticatedLanding(verifiedProfile, maintenanceMode);
    } catch {
      // Navigation must still recover from transient module/API errors.
      // The route's own query/error state handles failed loads.
    }
  }, [refreshControl]);

  useEffect(() => {
    // React StrictMode can replay mount effects: bootstrap only once.
    if (isInitialized || bootstrapStarted.current) return;
    bootstrapStarted.current = true;

    // Restore the secure session from HttpOnly cookie or Android Keystore.
    // The 3s splash and the authorized landing-page data load run in parallel.
    const initializeAuth = async () => {
      const statusPromise = primeInitialMaintenanceStatus();
      try {
        const verifiedProfile = await fetchProfile();
        await prepareForDashboard(verifiedProfile, statusPromise);
      } finally {
        await waitForMinimumSplash(initialSplashStartedAt.current);
        setLoading(false);
        setIsInitialized(true);
      }
    };
    void initializeAuth();
  }, [fetchProfile, isInitialized, prepareForDashboard]);

  const finishVerifiedLogin = async (responseData) => {
    const { token, user: userData } = responseData;
    if (!token) return userData;
    const splashStartedAt = Date.now();
    setTransitioning(true);
    try {
      await saveNativeSession(responseData);
      refreshControl.clear(); // No previous-account private queries may cross a login.
      setAccessToken(token);
      setHasSession(true);
      const verifiedProfile = await fetchProfile();
      await prepareForDashboard(verifiedProfile, primeInitialMaintenanceStatus());
    } finally {
      await waitForMinimumSplash(splashStartedAt);
      setTransitioning(false);
    }
    return userData;
  };

  const signIn = async (email, password) => {
    const response = await api.post('/login', { email, password });
    if (response.data?.mfaRequired) {
      return {
        mfaRequired: true,
        mfaToken: response.data.mfaToken,
        email: response.data.email,
      };
    }
    return finishVerifiedLogin(response.data);
  };

  const verifyMfa = async (mfaToken, code, isBackupCode = false) => {
    const response = await api.post('/auth/mfa/verify', { mfaToken, code, isBackupCode });
    return finishVerifiedLogin(response.data);
  };

  const sendLoginOtp = async (email) => {
    const response = await api.post('/auth/otp/send', { email });
    return response.data;
  };

  const signInWithOtp = async (email, otp) => {
    const response = await api.post('/auth/otp/verify', { email, otp });
    // SEC-008: An OTP is only the first factor when TOTP MFA is active.
    // Never persist the pending challenge as an authenticated session.
    if (response.data?.mfaRequired) {
      return {
        mfaRequired: true,
        mfaToken: response.data.mfaToken,
        email: response.data.email,
      };
    }
    return finishVerifiedLogin(response.data);
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
    setTransitioning(false);
    refreshControl.clear();
    try { localStorage.setItem('hrms_session_event', String(Date.now())); } catch { /* denied */ }
  };

  useEffect(() => {
    const syncLogout = event => {
      if (event.key !== 'hrms_session_event') return;
      try { sessionStorage.setItem('hrms_block_session_restore', '1'); } catch { /* denied */ }
      clearSessionAccess();
      setHasSession(false);
      setUser(null);
      setProfile(null);
      refreshControl.clear();
    };
    window.addEventListener('storage', syncLogout);
    return () => window.removeEventListener('storage', syncLogout);
  }, [refreshControl]);

  const value = {
    user,
    hasSession,
    profile,
    loading,
    profileLoading,
    isInitialized,
    transitioning,
    signIn,
    verifyMfa,
    sendLoginOtp,
    signInWithOtp,
    signOut,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <SplashScreen /> : <>{children}{transitioning && <SplashScreen />}</>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
