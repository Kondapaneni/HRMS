import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCcw, WifiOff, Globe } from 'lucide-react';
import FuzzyText from '../components/FuzzyText';

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
          className="fixed inset-0 z-[9999] bg-[#f8fafd] flex flex-col items-center justify-center p-6 overflow-hidden select-none"
        >
          {/* Background Ambient Glow Blobs */}
          <motion.div 
            className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-[#EA4335]/10 rounded-full blur-3xl pointer-events-none"
            animate={{ 
              scale: [1, 1.1, 1], 
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-[-10%] right-[-10%] w-[32rem] h-[32rem] bg-[#4285F4]/10 rounded-full blur-3xl pointer-events-none"
            animate={{ 
              scale: [1, 1.15, 1], 
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />

          <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center">
            
            {/* Animated Large OFFLINE text */}
            <div className="h-28 sm:h-36 mb-3 relative flex items-center justify-center w-full">
              <FuzzyText
                baseIntensity={0.15}
                hoverIntensity={0.4}
                enableHover
                color="#EA4335"
                fontSize="4.2rem"
                fontWeight={900}
              >
                OFFLINE
              </FuzzyText>
            </div>

            {/* 4 Google Colors Accent Dots */}
            <div className="flex items-center justify-center gap-1 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-1">
                Network Status • Acme HRMS
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#1f1f1f] mb-2 tracking-tight">
              You are Offline
            </h1>
            
            <p className="text-[#5f6368] text-xs sm:text-sm mb-8 max-w-sm leading-relaxed">
              Your internet connection appears to have disconnected. Please check your network or Wi-Fi settings to continue using Acme HRMS.
            </p>

            <button
              type="button"
              onClick={handleTryAgain}
              disabled={isChecking}
              className="inline-flex items-center gap-2 py-3.5 px-8 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-full transition-all shadow-xs disabled:opacity-70 cursor-pointer active:scale-98"
            >
              <RefreshCcw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking Connection...' : 'Reconnect & Try Again'}</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Offline;
