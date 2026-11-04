import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCcw, WifiOff } from 'lucide-react';
import Button from '../components/ui/Button';

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
          className="fixed inset-0 z-[9999] bg-[var(--bg)] flex flex-col items-center justify-center p-6 select-none"
        >
          <div className="w-full max-w-md bg-[var(--surface)] rounded-[32px] p-8 sm:p-10 text-center shadow-[0_24px_60px_rgba(19,19,21,0.08)]">
            {/* Icon Tile */}
            <div className="w-14 h-14 rounded-2xl bg-[#FDE8EA] text-[#D64550] flex items-center justify-center mx-auto mb-5">
              <WifiOff size={28} />
            </div>

            <h1 className="text-xl sm:text-2xl font-medium text-[var(--text)] tracking-tight mb-2">
              You are offline
            </h1>

            <p className="text-xs sm:text-sm text-[var(--muted)] mb-8 leading-relaxed max-w-xs mx-auto">
              Your internet connection appears to have disconnected. Check your network or Wi-Fi settings to continue using Acme HRMS.
            </p>

            <Button
              type="button"
              variant="primary"
              onClick={handleTryAgain}
              disabled={isChecking}
              loading={isChecking}
              className="w-full h-11 rounded-[12px] font-medium text-xs justify-center"
            >
              <RefreshCcw size={14} className={isChecking ? 'animate-spin' : ''} />
              <span>{isChecking ? 'Checking connection...' : 'Try again'}</span>
            </Button>
          </div>

          <footer className="mt-8 text-center text-xs text-[var(--muted)]">
            Acme HRMS &bull; Network connection monitor
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Offline;
