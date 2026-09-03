import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Download, Sparkles, ArrowUpCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import api, { REMOTE_ORIGIN } from '../api/axios';

export default function UpdateOverlay() {
  const location = useLocation();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Suppress update overlay if employee is writing an assessment or in exam instructions/session
  const isAssessmentActive = 
    location.pathname.includes('/assessments/session') ||
    location.pathname.includes('/assessments/instructions') ||
    (typeof window !== 'undefined' && (
      sessionStorage.getItem('active_assessment_in_progress') === 'true' ||
      window.__ACTIVE_ASSESSMENT_SESSION__ === true
    ));

  const { data: newsData } = useQuery({
    queryKey: ['newsHeadlines'],
    queryFn: async () => {
      try {
        const res = await api.get('/news');
        return res.data;
      } catch (e) {
        return { news_headlines: [], maintenance_mode: false, maintenance_message: '' };
      }
    },
    refetchInterval: 15000, // Poll every 15 seconds for near-instant maintenance mode detection
    staleTime: 10000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const rawMaintMode = newsData?.maintenance_mode;
  const isMaintenanceMode = rawMaintMode === true || rawMaintMode === 'true' || rawMaintMode === 1 || rawMaintMode === '1';

  useEffect(() => {
    const checkVersion = async () => {
      // If assessment is active, suppress version update notifications completely
      if (isAssessmentActive) {
        setUpdateAvailable(false);
        return;
      }

      const isDevBypassed = typeof window !== 'undefined' && localStorage.getItem('dev_bypass_maintenance_session') === 'true';
      const rawMode = newsData?.maintenance_mode;
      const isMaint = rawMode === true || rawMode === 'true' || rawMode === 1 || rawMode === '1';

      // If maintenance mode is active AND dev bypass is NOT active, don't show update modal
      if (isMaint && !isDevBypassed) {
        setUpdateAvailable(false);
        return;
      }

      try {
        const isLocalhost = typeof window !== 'undefined' && (window.location.origin.includes('localhost') || window.location.origin.includes('capacitor://'));
        const versionUrl = (isLocalhost && REMOTE_ORIGIN)
          ? `${REMOTE_ORIGIN}/version.json?t=${new Date().getTime()}`
          : `/version.json?t=${new Date().getTime()}`;

        // Cache buster parameter to avoid getting a cached version.json
        const res = await fetch(versionUrl, {
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          // VITE_APP_VERSION is injected by Vite at build time
          const currentVersion = Number(import.meta.env.VITE_APP_VERSION);

          if (data.version && currentVersion && Number(data.version) > currentVersion) {
            setUpdateAvailable(true);
          }
        }
      } catch (e) {
        console.error('Version check failed:', e);
      }
    };

    // Check version immediately on mount or data change
    checkVersion();

    // Check when window regains focus or storage updates
    const handleCheck = () => checkVersion();
    window.addEventListener('focus', handleCheck);
    window.addEventListener('storage', handleCheck);

    // Periodically check version every 15 seconds
    const interval = setInterval(checkVersion, 15 * 1000);

    return () => {
      window.removeEventListener('focus', handleCheck);
      window.removeEventListener('storage', handleCheck);
      clearInterval(interval);
    };
  }, [newsData, isAssessmentActive]);

  const handleUpdate = () => {
    setIsUpdating(true);
    // Attempt to clear caches if any exist (PWA/ServiceWorker caches)
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach(name => caches.delete(name));
      });
    }
    // Delay reload slightly to let the updating animation play
    setTimeout(() => {
      const isLocalhost = typeof window !== 'undefined' && (window.location.origin.includes('localhost') || window.location.origin.includes('capacitor://'));
      if (isLocalhost && REMOTE_ORIGIN) {
        window.location.href = REMOTE_ORIGIN;
      } else {
        window.location.reload(true);
      }
    }, 800);
  };

  const isDevBypassedNow = typeof window !== 'undefined' && localStorage.getItem('dev_bypass_maintenance_session') === 'true';
  const shouldShowUpdate = updateAvailable && (!isMaintenanceMode || isDevBypassedNow) && !isAssessmentActive;

  return (
    <AnimatePresence>
      {shouldShowUpdate && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-[#e0e3e7] relative overflow-hidden"
          >
            {/* Top 4-Color Gradient Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

            {/* Icon Container */}
            <div className="w-16 h-16 bg-[#e8f0fe] border border-[#d2e3fc] rounded-2xl flex items-center justify-center text-[#1a73e8] mb-4 shadow-2xs relative mt-1">
              <RefreshCw size={28} className={isUpdating ? "animate-spin" : ""} />
              <div className="absolute -bottom-1.5 -right-1.5 bg-[#34A853] text-white rounded-full p-1 shadow-2xs border-2 border-white">
                <Sparkles size={12} />
              </div>
            </div>

            {/* 4 Google Colors Accent */}
            <div className="flex items-center justify-center gap-1 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-1">
                Workspace Update
              </span>
            </div>

            <h2 className="text-xl font-bold text-[#1f1f1f] mb-1.5 tracking-tight">
              New Update Available
            </h2>

            <p className="text-[#5f6368] text-xs mb-6 leading-relaxed px-1">
              A newer version of Acme HRMS is ready. Please update now to receive the latest features, security enhancements, and UI updates.
            </p>

            <button
              type="button"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full py-3.5 px-6 rounded-full text-white text-sm font-bold transition-all cursor-pointer shadow-xs active:scale-95 bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Updating Workspace...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Update &amp; Reload</span>
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
