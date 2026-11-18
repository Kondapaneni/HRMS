import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import MaintenanceOverlay from './MaintenanceOverlay';
import {
  isMaintenanceEnabled,
  isPublicMaintenanceRoute,
  shouldShowMaintenanceNotice,
} from './maintenancePolicy';

/**
 * SEC-020: Present maintenance status above *all* employee/candidate routes:
 * Employee Dashboard, Loan Origination, Sales Origination, Branch Operations,
 * Admin Features delegated to employees, and standalone documents/assessments.
 *
 * The server still enforces maintenance authorization on every protected API.
 * This component only keeps the UX consistent and permits valid Admin login.
 */
export default function MaintenanceGate({ children }) {
  const { profile, fetchProfile, hasSession } = useAuth();
  const { pathname } = useLocation();
  const profileRef = useRef(profile);
  const [status, setStatus] = useState({
    ready: false,
    mode: 'checking',
    message: '',
  });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const checkMaintenance = useCallback(async () => {
    setChecking(true);
    try {
      // The endpoint is public, so a locked-out employee can check status
      // without accessing protected APIs. Avoid persisted/stale query cache.
      const response = await api.get('/news', {
        params: { maintenance_check: Date.now() },
        headers: { 'Cache-Control': 'no-cache' },
      });
      const enabled = isMaintenanceEnabled(response.data?.maintenance_mode);

      // A full browser refresh during maintenance may have left a valid
      // employee token without a profile, because /api/me returned 503.
      // Rehydrate that profile BEFORE restoring protected routes when OFF.
      if (!enabled && hasSession && !profileRef.current) {
        await fetchProfile();
      }

      setStatus({
        ready: true,
        mode: enabled ? 'on' : 'off',
        message: response.data?.maintenance_message || '',
      });
    } catch {
      // If maintenance status cannot be checked, don't navigate an existing
      // employee session into protected modules on an ambiguous response.
      setStatus({
        ready: true,
        mode: 'unavailable',
        message: 'The service status cannot be confirmed right now. Please check again shortly.',
      });
    } finally {
      setChecking(false);
    }
  }, [fetchProfile, hasSession]);

  useEffect(() => {
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 15000);
    window.addEventListener('focus', checkMaintenance);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkMaintenance);
    };
  }, [checkMaintenance]);

  const publicRoute = isPublicMaintenanceRoute(pathname);
  const hasToken = hasSession;

  // Hold protected routes until the public maintenance status is checked.
  // Otherwise /api/me may fail with 503 on browser refresh and ProtectedRoute
  // could redirect to login before the maintenance notice becomes visible.
  if (!status.ready && !publicRoute && hasToken && profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECEEEA] text-neutral-700 text-sm" role="status">
        Checking service availability...
      </div>
    );
  }

  if (status.ready && shouldShowMaintenanceNotice({
    maintenanceStatus: status.mode,
    pathname,
    role: profile?.role,
    hasToken,
  })) {
    return (
      <MaintenanceOverlay
        message={status.message}
        onCheckAgain={checkMaintenance}
        checking={checking}
      />
    );
  }

  return (
    <>
      {status.ready && status.mode === 'on' && publicRoute && (
        <div
          role="status"
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[10000] w-[min(96%,640px)] rounded-xl bg-amber-50 border border-amber-300 text-amber-950 shadow-lg px-4 py-3 text-center text-sm"
        >
          Scheduled maintenance is active. Employee and Candidate workspaces are temporarily unavailable.
          Administrators may sign in to manage maintenance.
        </div>
      )}
      {children}
    </>
  );
}
