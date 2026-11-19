import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Download, Sparkles } from 'lucide-react';
import { useRemoteData } from '../state/remote.js';
import { useLocation } from 'react-router-dom';
import api, { REMOTE_ORIGIN, isNativeApp } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/candidate/login',
  '/candidate/activate',
  '/forgot-password',
  '/reset-password',
];

export default function UpdateOverlay() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const isAuthenticated = Boolean(user && profile);
  const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);

  // Suppress update overlay if employee is writing an assessment or in exam instructions/session
  const isAssessmentActive = 
    location.pathname.includes('/assessments/session') ||
    location.pathname.includes('/assessments/instructions') ||
    (typeof window !== 'undefined' && (
      sessionStorage.getItem('active_assessment_in_progress') === 'true' ||
      window.__ACTIVE_ASSESSMENT_SESSION__ === true
    ));

  const { data: newsData } = useRemoteData({
    scope: ['newsHeadlines'],
    load: async () => {
      try {
        const res = await api.get('/news');
        return res.data;
      } catch (e) {
        return { news_headlines: [], maintenance_mode: false, maintenance_message: '' };
      }
    },
    enabled: isAuthenticated && !isPublicRoute,
    pollEveryMs: 15000,
    reloadOnFocus: false,
    retry: false,
  });

  const rawMaintMode = newsData?.maintenance_mode;
  const isMaintenanceMode = rawMaintMode === true || rawMaintMode === 'true' || rawMaintMode === 1 || rawMaintMode === '1';

  useEffect(() => {
    const checkVersion = async () => {
      if (!isAuthenticated || isPublicRoute) {
        setUpdateAvailable(false);
        return;
      }

      if (import.meta.env.DEV) {
        setUpdateAvailable(false);
        return;
      }

      if (isAssessmentActive) {
        setUpdateAvailable(false);
        return;
      }

      const rawMode = newsData?.maintenance_mode;
      const isMaint = rawMode === true || rawMode === 'true' || rawMode === 1 || rawMode === '1';

      if (isMaint) {
        setUpdateAvailable(false);
        return;
      }

      try {
        const versionUrl = (isNativeApp && REMOTE_ORIGIN)
          ? `${REMOTE_ORIGIN}/version.json?t=${Date.now()}`
          : `/version.json?t=${Date.now()}`;

        const res = await fetch(versionUrl, {
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          const currentVersion = Number(import.meta.env.VITE_APP_VERSION);

          if (data.version && currentVersion && Number(data.version) > currentVersion) {
            setUpdateAvailable(true);
          }
        }
      } catch (e) {
        // Gracefully ignore version check failures
      }
    };

    checkVersion();

    const handleCheck = () => checkVersion();
    window.addEventListener('focus', handleCheck);
    window.addEventListener('storage', handleCheck);
    const interval = setInterval(checkVersion, 15 * 1000);

    return () => {
      window.removeEventListener('focus', handleCheck);
      window.removeEventListener('storage', handleCheck);
      clearInterval(interval);
    };
  }, [newsData, isAssessmentActive, isAuthenticated, isPublicRoute]);

  const handleUpdate = () => {
    setIsUpdating(true);
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach(name => caches.delete(name));
      });
    }
    setTimeout(() => {
      if (isNativeApp && REMOTE_ORIGIN) {
        window.location.href = REMOTE_ORIGIN;
      } else {
        window.location.reload(true);
      }
    }, 800);
  };

  const shouldShowUpdate = isAuthenticated && !isPublicRoute &&
    updateAvailable && !isMaintenanceMode && !isAssessmentActive;

  return (
    <AnimatePresence>
      {shouldShowUpdate && (
        <div className="fixed inset-0 z-[9999] bg-[#131315]/45 backdrop-blur-[2px] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            className="bg-white text-[#131315] rounded-[32px] sm:rounded-[36px] p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-neutral-200/70 relative overflow-hidden"
          >
            {/* Icon Container */}
            <div className="w-16 h-16 bg-[#F3F9F1] border border-neutral-200 text-[#2F6B38] rounded-full flex items-center justify-center mb-4 relative shadow-xs">
              <RefreshCw size={26} className={isUpdating ? 'animate-spin' : ''} strokeWidth={1.8} />
              <div className="absolute -bottom-1 -right-1 bg-black text-white rounded-full p-1 shadow-sm border-2 border-white">
                <Sparkles size={11} strokeWidth={2} />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#131315] mb-2 tracking-tight">
              Update available
            </h2>

            <p className="text-xs sm:text-sm text-neutral-500 mb-6 leading-relaxed max-w-xs font-normal">
              A newer version of Acme HRMS is ready. Please update now to receive the latest features, security fixes, and design updates.
            </p>

            <button
              type="button"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {isUpdating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Updating workspace...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Update &amp; reload</span>
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
