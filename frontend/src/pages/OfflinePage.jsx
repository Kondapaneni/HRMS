import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCcw } from 'lucide-react';
import FuzzyText from '../components/FuzzyText';

const OfflinePage = () => {
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

    // Simulate a brief check for UX feedback
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
          className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col items-center justify-center p-4 overflow-hidden"
        >
          <div className="h-48 mb-4 relative flex items-center justify-center w-full max-w-2xl">
            <FuzzyText
              baseIntensity={0.2}
              hoverIntensity={0.5}
              enableHover
              color="#0f172a"
              fontSize="4.5rem"
              fontWeight={900}
            >
              OFFLINE
            </FuzzyText>
          </div>

          <h1 className="text-3xl font-bold text-slate-800 mb-4 text-center">You are Offline !</h1>
          <p className="text-slate-500 mb-8 max-w-md text-center leading-relaxed">
            It looks like your internet connection has dropped. Please check your network to continue using Acme HRMS.
          </p>

          <button
            onClick={handleTryAgain}
            disabled={isChecking}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-70 cursor-pointer"
          >
            <RefreshCcw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Try Again'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflinePage;
