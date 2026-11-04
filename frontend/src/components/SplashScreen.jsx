import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const LOADING_STEPS = [
  'Loading workspace...',
  'Synchronizing secure profile...',
  'Preparing dashboard...'
];

/**
 * SplashScreen component
 * Spec from Section 4.4:
 *  - Background #131315
 *  - White logo with Inter typography
 *  - #8AADDB progress bar
 */
const SplashScreen = () => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#131315] text-white overflow-hidden z-[9999] select-none">
      {/* Soft Pastel Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#8AADDB]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#E3B9DF]/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm"
      >
        {/* Brand Logo / Monogram Icon */}
        <div className="w-14 h-14 rounded-[18px] bg-[#1F1F23] border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
          <div className="w-6 h-6 rounded-[8px] bg-[#8AADDB] flex items-center justify-center">
            <span className="text-[#131315] font-bold text-sm">A</span>
          </div>
        </div>

        {/* Wordmark in Inter Typography */}
        <h1 className="text-2xl font-medium tracking-tight text-white mb-1">
          Acme <span className="text-[#8AADDB]">HRMS</span>
        </h1>
        <p className="text-[13px] text-[#8B8B95] font-normal mb-8">
          Enterprise Human Resource & Workspace
        </p>

        {/* Progress Bar in #8AADDB */}
        <div className="w-48 h-1 bg-[#1F1F23] rounded-full overflow-hidden relative mb-4">
          <motion.div
            className="h-full bg-[#8AADDB] rounded-full"
            animate={{
              x: ['-100%', '100%'],
              width: ['40%', '60%', '40%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.6,
              ease: 'easeInOut',
            }}
          />
        </div>

        {/* Step Indicator */}
        <p className="text-[12px] text-[#8B8B95] tracking-wide font-normal">
          {LOADING_STEPS[stepIndex]}
        </p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
