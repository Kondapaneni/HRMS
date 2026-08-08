import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export default function UpdateOverlay() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: newsData } = useQuery({
    queryKey: ['newsHeadlines'],
    queryFn: async () => {
      const res = await api.get('/news');
      return res.data;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const rawMaintMode = newsData?.maintenance_mode;
  const isMaintenanceMode = rawMaintMode === true || rawMaintMode === 'true' || rawMaintMode === 1 || rawMaintMode === '1';

  useEffect(() => {
    const checkVersion = async () => {
      const isDevBypassed = typeof window !== 'undefined' && localStorage.getItem('dev_bypass_maintenance_session') === 'true';
      const rawMode = newsData?.maintenance_mode;
      const isMaint = rawMode === true || rawMode === 'true' || rawMode === 1 || rawMode === '1';

      // If maintenance mode is active AND dev bypass is NOT active, don't show update modal
      if (isMaint && !isDevBypassed) {
        setUpdateAvailable(false);
        return;
      }

      try {
        // Cache buster parameter to avoid getting a cached version.json
        const res = await fetch(`/version.json?t=${new Date().getTime()}`, {
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
  }, [newsData]);

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
      window.location.reload(true);
    }, 800);
  };

  const isDevBypassedNow = typeof window !== 'undefined' && localStorage.getItem('dev_bypass_maintenance_session') === 'true';
  const shouldShowUpdate = updateAvailable && (!isMaintenanceMode || isDevBypassedNow);

  return (
    <AnimatePresence>
      {shouldShowUpdate && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[24px] p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-slate-100"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-5 ring-8 ring-blue-50 relative">
              <RefreshCw size={28} className={isUpdating ? "animate-[spin_2s_linear_infinite]" : ""} />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                <Download size={14} className="text-blue-500" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 tracking-tight">
              Update Available
            </h2>

            <p className="text-slate-500 text-sm mb-8 leading-relaxed px-2">
              A New Version of Acme HRMS is ready. You must Update to Continue Using the Application Securely.
            </p>

            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2"
            >
              {isUpdating ? 'Updating...' : 'Update Now'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
