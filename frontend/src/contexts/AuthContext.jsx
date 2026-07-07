import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
      const response = await api.get('/me');
      setProfile(response.data);
      setUser({ email: response.data.email, id: response.data.id });
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        // User is simply not logged in or session expired
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

    if (isPublicRoute) {
      // Don't fetch on public routes, finish initialization immediately
      setLoading(false);
      setIsInitialized(true);
      return;
    }

    // On protected routes, fetch profile with minimum 1200ms splash delay
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
  }, [fetchProfile, isInitialized, location.pathname]);

  const signIn = async (email, password) => {
    const response = await api.post('/login', { email, password });
    const { user: userData } = response.data;
    await fetchProfile();
    return userData;
  };

  const signOut = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout error', err);
    }
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
