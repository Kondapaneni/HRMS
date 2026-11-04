import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Download, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import api, { REMOTE_ORIGIN, isNativeApp } from '../api/axios';
import Button from './ui/Button';

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
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const rawMaintMode = newsData?.maintenance_mode;
  const isMaintenanceMode = rawMaintMode === true || rawMaintMode === 'true' || rawMaintMode === 1 || rawMaintMode === '1';

  useEffect(() => {
    const checkVersion = async () => {
      if (import.meta.env.DEV) {
        setUpdateAvailable(false);
        return;
      }

      if (isAssessmentActive) {
        setUpdateAvailable(false);
        return;
      }

      const isDevBypassed = typeof window !== 'undefined' && localStorage.getItem('dev_bypass_maintenance_session') === 'true';
      const rawMode = newsData?.maintenance_mode;
      const isMaint = rawMode === true || rawMode === 'true' || rawMode === 1 || rawMode === '1';

      if (isMaint && !isDevBypassed) {
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
  }, [newsData, isAssessmentActive]);

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

  const isDevBypassedNow = typeof window !== 'undefined' && localStorage.getItem('dev_bypass_maintenance_session') === 'true';
  const shouldShowUpdate = updateAvailable && (!isMaintenanceMode || isDevBypassedNow) && !isAssessmentActive;

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
            className="bg-[var(--surface)] text-[var(--text)] rounded-[24px] p-6 sm:p-7 max-w-sm w-full shadow-[var(--shadow-modal)] flex flex-col items-center text-center border border-[var(--line)]/50 relative overflow-hidden"
          >
            {/* Icon Container */}
            <div className="w-14 h-14 bg-[var(--brand-tint)] text-[var(--brand-deep)] rounded-[14px] flex items-center justify-center mb-4 relative">
              <RefreshCw size={24} className={isUpdating ? 'animate-spin' : ''} strokeWidth={1.7} />
              <div className="absolute -bottom-1 -right-1 bg-[var(--brand)] text-[var(--ink)] rounded-full p-1 shadow-sm border-2 border-[var(--surface)]">
                <Sparkles size={11} strokeWidth={2} />
              </div>
            </div>

            <h2 className="text-[18px] font-medium text-[var(--text)] mb-1 leading-snug">
              Update available
            </h2>

            <p className="text-[13px] text-[var(--muted)] mb-6 leading-relaxed">
              A newer version of Acme HRMS is ready. Please update now to receive the latest features, security fixes, and design updates.
            </p>

            <Button
              variant="primary"
              size="md"
              onClick={handleUpdate}
              disabled={isUpdating}
              isLoading={isUpdating}
              leftIcon={!isUpdating ? Download : undefined}
              className="w-full"
            >
              {isUpdating ? 'Updating workspace...' : 'Update & reload'}
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
