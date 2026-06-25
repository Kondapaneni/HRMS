import React from 'react';
import { motion } from 'framer-motion';

const SplashScreen = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden z-[9999]">
      {/* Background accent blobs - Subtle gradients that don't overpower */}
      <motion.div 
        className="absolute top-[-15%] left-[-10%] w-96 h-96 bg-blue-100/40 dark:bg-blue-900/20 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.05, 1], 
          opacity: [0.3, 0.5, 0.3],
          x: [0, 20, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-[-15%] right-[-10%] w-[35rem] h-[35rem] bg-indigo-100/40 dark:bg-indigo-900/20 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.1, 1], 
          opacity: [0.3, 0.6, 0.3],
          x: [0, -20, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <motion.div 
        className="relative z-10 flex flex-col items-center w-full max-w-sm px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Animated Vector Illustration */}
        <motion.div variants={itemVariants} className="w-64 h-56 mb-6 relative flex items-end justify-center">
          <svg viewBox="0 0 200 150" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
            
            {/* --- Environment Elements --- */}
            
            {/* Window/Background Element */}
            <motion.rect x="30" y="10" width="140" height="70" rx="8" className="fill-slate-100 dark:fill-slate-800"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            />
            {/* Sun/Light */}
            <motion.circle cx="140" cy="35" r="12" className="fill-amber-100 dark:fill-amber-900/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            />
            {/* Cloud */}
            <motion.path d="M120 40 Q120 35 125 35 Q130 30 135 35 Q145 35 140 45 L120 45 Z" className="fill-white dark:fill-slate-700"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 1 }}
            />

            {/* --- Desk Elements --- */}

            {/* Desk Surface */}
            <motion.rect 
              x="10" y="120" width="180" height="8" rx="4" 
              className="fill-slate-200 dark:fill-slate-700"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            
            {/* Desk Legs */}
            <motion.path 
              d="M30 128 L25 150 M170 128 L175 150" 
              className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="6" strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            />
            
            {/* Monitor Stand Base & Neck */}
            <motion.rect x="85" y="116" width="30" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            />
            <motion.path d="M100 116 L100 95" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="6" strokeLinecap="round" 
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.3 }}
            />

            {/* Main Monitor */}
            <motion.rect 
              x="45" y="45" width="110" height="70" rx="6" 
              className="fill-slate-800 dark:fill-slate-900 shadow-lg"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            {/* Monitor Screen Area */}
            <motion.rect 
              x="50" y="50" width="100" height="55" rx="3" 
              className="fill-white dark:fill-slate-800"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            />
            
            {/* --- Screen Content (UI Abstraction) --- */}
            <motion.rect x="58" y="58" width="30" height="6" rx="3" className="fill-blue-500" 
              initial={{ width: 0 }} animate={{ width: 30 }} transition={{ delay: 0.8, duration: 0.4 }}
            />
            <motion.rect x="58" y="72" width="60" height="4" rx="2" className="fill-slate-200 dark:fill-slate-600" 
              initial={{ width: 0 }} animate={{ width: 60 }} transition={{ delay: 0.9, duration: 0.4 }}
            />
            <motion.rect x="58" y="82" width="45" height="4" rx="2" className="fill-slate-200 dark:fill-slate-600" 
              initial={{ width: 0 }} animate={{ width: 45 }} transition={{ delay: 1.0, duration: 0.4 }}
            />
            
            {/* UI Dashboard Graphic (e.g. bar chart) */}
            <motion.rect x="125" y="86" width="6" height="12" rx="2" className="fill-indigo-400" 
              initial={{ height: 0, y: 98 }} animate={{ height: 12, y: 86 }} transition={{ delay: 1.1 }}
            />
            <motion.rect x="135" y="78" width="6" height="20" rx="2" className="fill-blue-500" 
              initial={{ height: 0, y: 98 }} animate={{ height: 20, y: 78 }} transition={{ delay: 1.2 }}
            />

            {/* --- Accessories --- */}

            {/* Plant */}
            <motion.g initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 15 }}>
              <path d="M25 120 Q30 90 45 100 Q35 110 30 120 Z" className="fill-emerald-400 dark:fill-emerald-500" />
              <path d="M30 120 Q20 100 15 105 Q20 115 25 120 Z" className="fill-emerald-500 dark:fill-emerald-600" />
              <path d="M28 120 L28 105" className="stroke-emerald-600" strokeWidth="1.5" strokeLinecap="round" />
            </motion.g>
            {/* Plant Pot */}
            <motion.path d="M20 120 L36 120 L32 105 L24 105 Z" className="fill-amber-600 dark:fill-amber-700" 
              initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            />
            
            {/* Coffee Cup */}
            <motion.rect x="155" y="105" width="12" height="15" rx="2" className="fill-white dark:fill-slate-300 drop-shadow-sm" 
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            />
            <motion.path d="M167 110 Q172 110 172 113 Q172 116 167 116" className="stroke-white dark:stroke-slate-300" fill="none" strokeWidth="2.5" 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            />
            {/* Animated Steam */}
            <motion.path d="M158 100 Q161 95 158 90" className="stroke-slate-300 dark:stroke-slate-500" strokeWidth="1.5" strokeLinecap="round" fill="none" 
              animate={{ y: [0, -6], opacity: [0, 0.7, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 1 }}
            />
            <motion.path d="M162 102 Q165 97 162 92" className="stroke-slate-300 dark:stroke-slate-500" strokeWidth="1.5" strokeLinecap="round" fill="none" 
              animate={{ y: [0, -6], opacity: [0, 0.7, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear", delay: 1.5 }}
            />
          </svg>
        </motion.div>

        {/* Branding & Loading Text */}
        <motion.div variants={itemVariants} className="text-center flex flex-col items-center w-full">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2">Acme HRMS</h1>
          
          <div className="flex flex-col items-center w-full space-y-6">
            <div className="flex items-center space-x-2">
              <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400">Loading Workspace</p>
              <div className="flex space-x-1 mt-1">
                <motion.div 
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                  animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                />
                <motion.div 
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                  animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
                />
                <motion.div 
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                  animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                />
              </div>
            </div>
            
            {/* Elegant Progress Indicator */}
            <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                 initial={{ width: "0%" }}
                 animate={{ width: "100%" }}
                 transition={{ duration: 3, ease: [0.4, 0, 0.2, 1] }}
               />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
