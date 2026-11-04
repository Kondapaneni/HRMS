import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, WifiOff } from 'lucide-react';
import AuthSideCarousel from '../components/AuthSideCarousel';

const Offline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTryAgain = () => {
    setIsChecking(true);
    setTimeout(() => {
      if (navigator.onLine) {
        setIsOnline(true);
      }
      setIsChecking(false);
    }, 600);
  };

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-[#ECEEEA] flex flex-col items-center justify-start sm:justify-center overflow-y-auto p-4 sm:p-6 lg:p-10 font-sans antialiased text-[#131315] select-none"
        >
          {/* Main 2-Column Card matching Login page */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="my-auto w-full max-w-md sm:max-w-lg lg:max-w-[1080px] bg-white rounded-[28px] sm:rounded-[36px] shadow-xl border border-neutral-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shrink-0"
          >
            {/* ============================================================
                LEFT COLUMN: Offline Notice
                ============================================================ */}
            <div className="lg:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 max-w-md mx-auto w-full text-center sm:text-left">
              <div>
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    A
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B38]">
                    Acme HRMS
                  </span>
                </div>

                <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-5 shadow-xs">
                  <WifiOff size={28} />
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-[#131315] tracking-tight mb-2">
                  You are offline
                </h1>

                <p className="text-xs sm:text-sm text-neutral-500 mb-8 leading-relaxed max-w-xs font-normal">
                  Your internet connection appears to have disconnected. Check your network or Wi-Fi settings to continue using Acme HRMS.
                </p>

                <button
                  type="button"
                  onClick={handleTryAgain}
                  disabled={isChecking}
                  className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
                  <span>{isChecking ? 'Checking connection...' : 'Try again'}</span>
                </button>
              </div>

              {/* Footer Support & Credits */}
              <div className="text-center space-y-2.5 pt-6">
                <p className="text-xs text-neutral-500 font-medium">
                  Don't have Access?{' '}
                  <a
                    href="mailto:hr@acme.com?subject=HRMS%20Access%20Request"
                    className="text-[#2F6B38] hover:text-[#1E4D27] hover:underline font-semibold transition-colors"
                  >
                    Contact HR Admin
                  </a>
                </p>
                <p className="text-[11px] text-neutral-400 font-normal">
                  Designed and developed by{' '}
                  <span className="text-neutral-700 font-semibold">Gowtham Chowdary Kondapaneni</span>
                </p>
              </div>
            </div>

            {/* ============================================================
                RIGHT COLUMN: Calming Sage Green Interactive HRMS Carousel
                ============================================================ */}
            <AuthSideCarousel />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Offline;
