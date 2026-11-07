import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const LOADING_STEPS = [
  'Loading workspace...',
  'Synchronizing secure profile...',
  'Preparing dashboard...'
];

const SplashScreen = () => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col justify-between items-center bg-[#ECEEEA] text-[#131315] overflow-hidden z-[9999] select-none p-6 sm:p-10 font-sans">
      {/* Subtle green ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#E2F2DE]/60 rounded-full blur-3xl pointer-events-none" />

      <div />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm"
      >
        {/* Brand Logo */}
        <img
          src="/logo.png"
          alt="Acme HRMS"
          className="w-16 h-16 rounded-2xl object-contain mb-6 shadow-xl"
        />

        {/* Wordmark */}
        <h1 className="text-3xl font-bold tracking-tight text-[#131315] mb-1">
          Acme <span className="text-[#2F6B38]">HRMS</span>
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 font-normal mb-8">
          Enterprise Human Resource &amp; Workspace
        </p>

        {/* Progress Bar */}
        <div className="w-48 h-1.5 bg-neutral-200 rounded-full overflow-hidden relative mb-4 shadow-inner">
          <motion.div
            className="h-full bg-black rounded-full"
            animate={{
              x: ['-100%', '100%'],
              width: ['40%', '60%', '40%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeInOut',
            }}
          />
        </div>

        {/* Step Indicator */}
        <p className="text-xs text-neutral-600 font-medium tracking-wide">
          {LOADING_STEPS[stepIndex]}
        </p>
      </motion.div>

      {/* Footer Credits */}
      <footer className="relative z-10 text-center space-y-1 pt-4">
        <p className="text-xs text-neutral-500 font-medium">
          Acme HRMS Enterprise System
        </p>
        <p className="text-[11px] text-neutral-400 font-normal">
          Designed and developed by{' '}
          <span className="text-neutral-700 font-semibold">Gowtham Chowdary Kondapaneni</span>
        </p>
      </footer>
    </div>
  );
};

export default SplashScreen;
