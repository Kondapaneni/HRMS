import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FuzzyText from './FuzzyText';

const OfflineOverlay = () => {
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
          <div className="h-32 md:h-48 mb-2 relative flex items-center justify-center w-full max-w-2xl">
            <FuzzyText 
              baseIntensity={0.2}
              hoverIntensity={0.5}
              enableHover
              color="#0f172a"
              fontSize="clamp(3.5rem, 12vw, 6rem)"
              fontWeight={900}
            >
              OFFLINE
            </FuzzyText>
          </div>
          
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-10 h-10" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-800 mb-4 text-center">Connection Lost</h1>
          <p className="text-slate-500 mb-8 max-w-md text-center leading-relaxed">
            It looks like your internet connection has dropped. Please check your network to continue using Acme HRMS.
          </p>
          
          <button 
            onClick={handleTryAgain}
            disabled={isChecking}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-70"
          >
            <RefreshCcw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Try Again'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineOverlay;
