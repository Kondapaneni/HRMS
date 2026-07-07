import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import SplashScreen from '../components/SplashScreen';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await api.get('/me');
      setProfile(response.data);
      setUser({ email: response.data.email, id: response.data.id });
    } catch (error) {
      if (!error.response || error.response.status !== 401) {
        console.error('Failed to fetch profile:', error);
      }
      // Only log the user out if the server responded with an authentication error (401/403)
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        setProfile(null);
        setUser(null);
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load - Ensure splash screen shows for at least 2.5 seconds for animation
    Promise.all([
      fetchProfile(),
      new Promise(resolve => setTimeout(resolve, 2500))
    ]).then(() => {
      setLoading(false);
    });
  }, [fetchProfile]);

  const signIn = async (email, password) => {
    const response = await api.post('/login', { email, password });
    const { user: userData } = response.data;

    // Fetch the full profile (which includes the avatar from the employees table)
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
    signIn,
    signOut,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <SplashScreen />
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
