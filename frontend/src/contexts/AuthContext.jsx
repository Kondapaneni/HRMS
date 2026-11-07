import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import SplashScreen from '../components/SplashScreen';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const hasInitialToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
  const [loading, setLoading] = useState(hasInitialToken);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(!hasInitialToken);
  const fetchInProgress = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (fetchInProgress.current) return;
    
    fetchInProgress.current = true;
    setProfileLoading(true);
    try {
      if (!localStorage.getItem('token')) {
        throw new Error('No token found');
      }
      const response = await api.get('/me');
      setProfile(response.data);
      setUser({ email: response.data.email, id: response.data.id });
    } catch (error) {
      if (error.message === 'No token found' || (error.response && (error.response.status === 401 || error.response.status === 403))) {
        // User is simply not logged in or session expired
        localStorage.removeItem('token');
        queryClient.clear();
        setProfile(null);
        setUser(null);
      } else {
        console.error('Failed to fetch profile:', error);
      }
    } finally {
      setProfileLoading(false);
      fetchInProgress.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    if (isInitialized) return;

    const initializeAuth = async () => {
      const startTime = Date.now();
      await fetchProfile();

      const elapsed = Date.now() - startTime;
      const minDelay = 1200;
      if (elapsed < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
      }

      setLoading(false);
      setIsInitialized(true);
    };

    initializeAuth();
  }, [fetchProfile, isInitialized]);

  const signIn = async (email, password) => {
    const response = await api.post('/login', { email, password });
    const { token, user: userData } = response.data;
    if (token) {
      localStorage.setItem('token', token);
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
    const { token, user: userData } = response.data;
    if (token) {
      localStorage.setItem('token', token);
    }
    await fetchProfile();
    return userData;
  };

  const signOut = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout error', err);
    }
    localStorage.removeItem('token');
    setProfile(null);
    setUser(null);
    queryClient.clear();
  };

  const value = {
    user,
    profile,
    loading,
    profileLoading,
    isInitialized,
    signIn,
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

// eslint-disable-next-line react-refresh/only-export-components -- Context hook is intentionally exported with its provider.
export const useAuth = () => {
  return useContext(AuthContext);
};
