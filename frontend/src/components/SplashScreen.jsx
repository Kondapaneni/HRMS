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
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#f8fafd] overflow-hidden z-[9999] select-none">
      
      {/* Google Ambient Glow Blobs */}
      <motion.div 
        className="absolute top-[-10%] left-[-10%] w-[32rem] h-[32rem] bg-[#4285F4]/10 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.1, 1], 
          opacity: [0.3, 0.6, 0.3],
          x: [0, 30, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-[#34A853]/10 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.15, 1], 
          opacity: [0.3, 0.5, 0.3],
          x: [0, -30, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div 
        className="absolute top-[30%] right-[-10%] w-80 h-80 bg-[#FBBC05]/10 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.1, 1], 
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <motion.div 
        className="relative z-10 flex flex-col items-center w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Animated Google Workspace Illustration */}
        <motion.div variants={itemVariants} className="w-full max-w-[18rem] sm:max-w-[22rem] md:max-w-[26rem] mb-6 sm:mb-8 relative flex items-end justify-center">
          <svg viewBox="0 0 200 150" className="w-full h-auto drop-shadow-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
            
            {/* Window Background Element */}
            <motion.rect 
              x="30" y="10" width="140" height="70" rx="10" 
              className="fill-white/80 stroke-[#e0e3e7]" strokeWidth="1.5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            />
            
            {/* Sun/Light */}
            <motion.circle cx="140" cy="35" r="12" className="fill-[#fef7e0]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            />
            {/* Cloud */}
            <motion.path d="M120 40 Q120 35 125 35 Q130 30 135 35 Q145 35 140 45 L120 45 Z" className="fill-white shadow-xs"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 1 }}
            />

            {/* --- Desk Elements --- */}

            {/* Desk Surface */}
            <motion.rect 
              x="10" y="120" width="180" height="8" rx="4" 
              className="fill-[#e0e3e7]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            
            {/* Desk Legs */}
            <motion.path 
              d="M30 128 L25 150 M170 128 L175 150" 
              className="stroke-[#dadce0]" strokeWidth="5" strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            />
            
            {/* Monitor Stand Base & Neck */}
            <motion.rect x="85" y="116" width="30" height="4" rx="2" className="fill-[#bdc1c6]" 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            />
            <motion.path d="M100 116 L100 95" className="stroke-[#bdc1c6]" strokeWidth="5" strokeLinecap="round" 
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.3 }}
            />

            {/* Main Monitor Frame */}
            <motion.rect 
              x="45" y="45" width="110" height="70" rx="8" 
              className="fill-[#1f1f1f]"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            {/* Monitor Screen Area */}
            <motion.rect 
              x="50" y="50" width="100" height="55" rx="4" 
              className="fill-white"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            />
            
            {/* Top 4-Color Accent Line on Screen */}
            <motion.rect x="50" y="50" width="100" height="2.5" rx="1" className="fill-[#4285F4]"
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.7, duration: 0.4 }}
            />

            {/* UI Abstraction */}
            <motion.rect x="58" y="58" width="30" height="5" rx="2.5" className="fill-[#1a73e8]" 
              initial={{ width: 0 }} animate={{ width: 30 }} transition={{ delay: 0.8, duration: 0.4 }}
            />
            <motion.rect x="58" y="68" width="55" height="3.5" rx="1.75" className="fill-[#e8eaed]" 
              initial={{ width: 0 }} animate={{ width: 55 }} transition={{ delay: 0.9, duration: 0.4 }}
            />
            <motion.rect x="58" y="76" width="40" height="3.5" rx="1.75" className="fill-[#e8eaed]" 
              initial={{ width: 0 }} animate={{ width: 40 }} transition={{ delay: 1.0, duration: 0.4 }}
            />
            
            {/* Dashboard Chart Bars with Google Colors */}
            <motion.rect x="120" y="86" width="5" height="12" rx="2" className="fill-[#FBBC05]" 
              initial={{ height: 0, y: 12 }} animate={{ height: 12, y: 0 }} transition={{ delay: 1.1 }}
            />
            <motion.rect x="128" y="78" width="5" height="20" rx="2" className="fill-[#34A853]" 
              initial={{ height: 0, y: 20 }} animate={{ height: 20, y: 0 }} transition={{ delay: 1.2 }}
            />
            <motion.rect x="136" y="70" width="5" height="28" rx="2" className="fill-[#4285F4]" 
              initial={{ height: 0, y: 28 }} animate={{ height: 28, y: 0 }} transition={{ delay: 1.3 }}
            />

            {/* --- Accessories --- */}

            {/* Plant */}
            <motion.g initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 15 }}>
              <path d="M17 105 Q22 75 37 85 Q27 95 22 105 Z" className="fill-[#34A853]" />
              <path d="M22 105 Q12 85 7 90 Q12 100 17 105 Z" className="fill-[#137333]" />
              <path d="M20 105 L20 90" className="stroke-[#0d652d]" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M20 92 Q16 80 20 74 Q24 80 20 92 Z" className="fill-[#34A853]" />
            </motion.g>
            {/* Plant Pot */}
            <motion.path d="M16 120 L24 120 L28 105 L12 105 Z" className="fill-[#EA4335]" 
              initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            />
            
            {/* Coffee Cup */}
            <motion.rect x="165" y="105" width="12" height="15" rx="2.5" className="fill-white stroke-[#dadce0]" strokeWidth="1" 
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            />
            <motion.path d="M177 110 Q182 110 182 113 Q182 116 177 116" className="stroke-[#dadce0]" fill="none" strokeWidth="2" 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            />
            {/* Animated Steam */}
            <motion.path d="M168 102 C165 96, 172 92, 168 86" className="stroke-[#bdc1c6]" strokeWidth="1.2" strokeLinecap="round" fill="none" 
              animate={{ y: [0, -6], opacity: [0, 0.7, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 1 }}
            />
            <motion.path d="M173 104 C171 98, 176 94, 174 88" className="stroke-[#bdc1c6]" strokeWidth="1.2" strokeLinecap="round" fill="none" 
              animate={{ y: [0, -6], opacity: [0, 0.7, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear", delay: 1.5 }}
            />
          </svg>
        </motion.div>

        {/* Branding & Loading Text */}
        <motion.div variants={itemVariants} className="text-center flex flex-col items-center w-full">
          
          {/* Logo with 4-Color Accent Dots */}
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
              <span className="text-[#1f1f1f]">Acme </span>
              <span className="text-[#4285F4]">HRMS</span>
            </h1>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            </div>
          </div>
          
          <div className="flex flex-col items-center w-full space-y-4">
            
            {/* Status with animated 4-Color Jumping Dots */}
            <div className="flex items-center space-x-2">
              <p className="text-xs sm:text-sm font-semibold text-[#5f6368] tracking-wide">
                Loading Workspace
              </p>
              <div className="flex space-x-1 mt-0.5">
                <motion.div 
                  className="w-1.5 h-1.5 bg-[#4285F4] rounded-full"
                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                />
                <motion.div 
                  className="w-1.5 h-1.5 bg-[#EA4335] rounded-full"
                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
                />
                <motion.div 
                  className="w-1.5 h-1.5 bg-[#FBBC05] rounded-full"
                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                />
                <motion.div 
                  className="w-1.5 h-1.5 bg-[#34A853] rounded-full"
                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.45 }}
                />
              </div>
            </div>
            
            {/* Google 4-Color Gradient Progress Bar */}
            <div className="w-48 sm:w-56 md:w-64 h-1.5 bg-[#e0e3e7] rounded-full overflow-hidden p-0.25">
               <motion.div 
                 className="h-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] rounded-full"
                 initial={{ width: "0%" }}
                 animate={{ width: "100%" }}
                 transition={{ duration: 2.8, ease: [0.4, 0, 0.2, 1] }}
               />
            </div>

            <p className="text-[10px] text-[#5f6368]/80 font-medium">
              Enterprise Human Resource Management
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
