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
    const token = localStorage.getItem('token');
    if (!token) {
      setProfile(null);
      setUser(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const response = await api.get('/me');
      setProfile(response.data);
      setUser({ email: response.data.email, id: response.data.id });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Only log the user out if the server responded with an authentication error (401/403)
      // If there's no response (network error/offline) or a 500 error, keep them logged in
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        setProfile(null);
        setUser(null);
        localStorage.removeItem('token');
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    fetchProfile().then(() => {
      setLoading(false);
    });
  }, [fetchProfile]);

  const signIn = async (email, password) => {
    const response = await api.post('/login', { email, password });
    const { token, user: userData } = response.data;

    localStorage.setItem('token', token);

    // Fetch the full profile (which includes the avatar from the employees table)
    // fetchProfile will set both user and profile state together
    await fetchProfile();

    return userData;
  };

  const signOut = async () => {
    setProfile(null);
    setUser(null);
    localStorage.removeItem('token');
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
