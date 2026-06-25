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
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 overflow-hidden z-[9999]">
      {/* Background accent blobs - Subtle gradients that don't overpower */}
      <motion.div 
        className="absolute top-[-15%] left-[-10%] w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.05, 1], 
          opacity: [0.3, 0.5, 0.3],
          x: [0, 20, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-[-15%] right-[-10%] w-[35rem] h-[35rem] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.1, 1], 
          opacity: [0.3, 0.6, 0.3],
          x: [0, -20, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <motion.div 
        className="relative z-10 flex flex-col items-center w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-3xl px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Animated Vector Illustration */}
        <motion.div variants={itemVariants} className="w-full max-w-[20rem] sm:max-w-[24rem] md:max-w-[28rem] lg:max-w-[36rem] mb-8 lg:mb-12 relative flex items-end justify-center">
          <svg viewBox="0 0 200 150" className="w-full h-auto drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
            
            {/* --- Environment Elements --- */}
            
            {/* Window/Background Element */}
            <motion.rect x="30" y="10" width="140" height="70" rx="8" className="fill-slate-100"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            />
            {/* Sun/Light */}
            <motion.circle cx="140" cy="35" r="12" className="fill-amber-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            />
            {/* Cloud */}
            <motion.path d="M120 40 Q120 35 125 35 Q130 30 135 35 Q145 35 140 45 L120 45 Z" className="fill-white"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 1 }}
            />

            {/* --- Desk Elements --- */}

            {/* Desk Surface */}
            <motion.rect 
              x="10" y="120" width="180" height="8" rx="4" 
              className="fill-slate-200"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            
            {/* Desk Legs */}
            <motion.path 
              d="M30 128 L25 150 M170 128 L175 150" 
              className="stroke-slate-300" strokeWidth="6" strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            />
            
            {/* Monitor Stand Base & Neck */}
            <motion.rect x="85" y="116" width="30" height="4" rx="2" className="fill-slate-300" 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            />
            <motion.path d="M100 116 L100 95" className="stroke-slate-300" strokeWidth="6" strokeLinecap="round" 
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.3 }}
            />

            {/* Main Monitor */}
            <motion.rect 
              x="45" y="45" width="110" height="70" rx="6" 
              className="fill-slate-800 shadow-lg"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            {/* Monitor Screen Area */}
            <motion.rect 
              x="50" y="50" width="100" height="55" rx="3" 
              className="fill-white"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            />
            
            {/* --- Screen Content (UI Abstraction) --- */}
            <motion.rect x="58" y="58" width="30" height="6" rx="3" className="fill-blue-500" 
              initial={{ width: 0 }} animate={{ width: 30 }} transition={{ delay: 0.8, duration: 0.4 }}
            />
            <motion.rect x="58" y="72" width="60" height="4" rx="2" className="fill-slate-200" 
              initial={{ width: 0 }} animate={{ width: 60 }} transition={{ delay: 0.9, duration: 0.4 }}
            />
            <motion.rect x="58" y="82" width="45" height="4" rx="2" className="fill-slate-200" 
              initial={{ width: 0 }} animate={{ width: 45 }} transition={{ delay: 1.0, duration: 0.4 }}
            />
            
            {/* UI Dashboard Graphic (e.g. bar chart) */}
            <motion.rect x="125" y="86" width="6" height="12" rx="2" className="fill-indigo-400" 
              initial={{ height: 0, y: 12 }} animate={{ height: 12, y: 0 }} transition={{ delay: 1.1 }}
            />
            <motion.rect x="135" y="78" width="6" height="20" rx="2" className="fill-blue-500" 
              initial={{ height: 0, y: 20 }} animate={{ height: 20, y: 0 }} transition={{ delay: 1.2 }}
            />

            {/* --- Accessories --- */}

            {/* Plant */}
            <motion.g initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 15 }}>
              <path d="M17 105 Q22 75 37 85 Q27 95 22 105 Z" className="fill-emerald-400" />
              <path d="M22 105 Q12 85 7 90 Q12 100 17 105 Z" className="fill-emerald-500" />
              <path d="M20 105 L20 90" className="stroke-emerald-600" strokeWidth="1.5" strokeLinecap="round" />
              {/* Extra Leaves */}
              <path d="M20 92 Q16 80 20 74 Q24 80 20 92 Z" className="fill-emerald-400" />
              <path d="M20 105 Q28 96 32 100 Q26 104 20 105 Z" className="fill-emerald-600" />
              <path d="M19 105 Q10 95 4 100 Q10 103 19 105 Z" className="fill-emerald-300" />
            </motion.g>
            {/* Plant Pot */}
            <motion.path d="M16 120 L24 120 L28 105 L12 105 Z" className="fill-amber-600" 
              initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            />
            
            {/* Coffee Cup */}
            <motion.rect x="165" y="105" width="12" height="15" rx="2" className="fill-white drop-shadow-sm" 
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            />
            <motion.path d="M177 110 Q182 110 182 113 Q182 116 177 116" className="stroke-white" fill="none" strokeWidth="2.5" 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            />
            {/* Animated Steam */}
            <motion.path d="M168 102 C165 96, 172 92, 168 86" className="stroke-slate-300" strokeWidth="1.5" strokeLinecap="round" fill="none" 
              animate={{ y: [0, -6], opacity: [0, 0.7, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 1 }}
            />
            <motion.path d="M173 104 C171 98, 176 94, 174 88" className="stroke-slate-300" strokeWidth="1.5" strokeLinecap="round" fill="none" 
              animate={{ y: [0, -6], opacity: [0, 0.7, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear", delay: 1.5 }}
            />
          </svg>
        </motion.div>

        {/* Branding & Loading Text */}
        <motion.div variants={itemVariants} className="text-center flex flex-col items-center w-full">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-800 tracking-tight mb-3 lg:mb-5">Acme HRMS</h1>
          
          <div className="flex flex-col items-center w-full space-y-6 lg:space-y-8">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-slate-500">Loading Workspace</p>
              <div className="flex space-x-1 mt-1 lg:mt-2">
                <motion.div 
                  className="w-1.5 h-1.5 md:w-2 md:h-2 lg:w-2.5 lg:h-2.5 bg-blue-500 rounded-full"
                  animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                />
                <motion.div 
                  className="w-1.5 h-1.5 md:w-2 md:h-2 lg:w-2.5 lg:h-2.5 bg-blue-500 rounded-full"
                  animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
                />
                <motion.div 
                  className="w-1.5 h-1.5 md:w-2 md:h-2 lg:w-2.5 lg:h-2.5 bg-blue-500 rounded-full"
                  animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                />
              </div>
            </div>
            
            {/* Elegant Progress Indicator */}
            <div className="w-56 sm:w-64 md:w-80 lg:w-96 h-1.5 md:h-2 bg-slate-200 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-blue-600 rounded-full"
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
