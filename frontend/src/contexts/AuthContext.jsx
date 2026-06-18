import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

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
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">Acme HRMS</h1>
          <p className="text-sm font-medium text-slate-500 animate-pulse">Loading Workspace...</p>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
