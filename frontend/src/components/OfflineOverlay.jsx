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
          className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 max-w-sm w-full text-center overflow-hidden"
          >
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <WifiOff className="w-10 h-10" />
            </div>
            
            <div className="h-20 mb-2 -mx-4">
              <FuzzyText 
                baseIntensity={0.2}
                hoverIntensity={0.5}
                enableHover
                color="#0f172a"
                fontSize="3.5rem"
                fontWeight={800}
              >
                OFFLINE
              </FuzzyText>
            </div>
            
            <p className="text-slate-500 mb-8 leading-relaxed">
              It looks like your internet connection has dropped. Please check your network to continue using Acme HRMS.
            </p>
            
            <button 
              onClick={handleTryAgain}
              disabled={isChecking}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl h-12 font-medium hover:bg-slate-800 transition-colors disabled:opacity-70"
            >
              <RefreshCcw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Try Again'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineOverlay;
