import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
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
  }, []);

  useEffect(() => {
    if (isInitialized) return;

    // Check if the current route is exactly a public route
    const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);
    const hasToken = !!localStorage.getItem('token');

    if (isPublicRoute && !hasToken) {
      // Don't fetch on public routes if no token exists, finish initialization immediately
      setLoading(false);
      setIsInitialized(true);
      return;
    }

    // On protected routes or if returning with a token, fetch profile with minimum 1200ms splash delay
    const initializeAuth = async () => {
      if (!hasToken) {
        setLoading(false);
        setIsInitialized(true);
        return;
      }

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
  }, [fetchProfile, isInitialized, location.pathname]);

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
