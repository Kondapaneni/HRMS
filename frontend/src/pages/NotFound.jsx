import React from 'react';
import { Link } from 'react-router-dom';
import FuzzyText from '../components/FuzzyText';
import { Home, ArrowLeft, AlertCircle, Compass } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-6 overflow-hidden relative select-none">
      
      {/* Background Ambient Glow Blobs */}
      <motion.div 
        className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-[#4285F4]/10 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.1, 1], 
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-[-10%] right-[-10%] w-[32rem] h-[32rem] bg-[#34A853]/10 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.15, 1], 
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center">
        
        {/* Large 404 Text */}
        <div className="h-44 sm:h-52 mb-2 relative flex items-center justify-center w-full">
          <FuzzyText 
            baseIntensity={0.15}
            hoverIntensity={0.4}
            enableHover
            color="#1a73e8"
            fontSize="clamp(6rem, 15vw, 9rem)"
            fontWeight={900}
          >
            404
          </FuzzyText>
        </div>

        {/* 4 Google Colors Accent Dots */}
        <div className="flex items-center justify-center gap-1 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-1">
            Page Not Found • Acme HRMS
          </span>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1f1f1f] mb-2 tracking-tight">
          Lost in Space?
        </h1>
        
        <p className="text-[#5f6368] text-xs sm:text-sm mb-8 max-w-sm leading-relaxed">
          The page you are searching for might have been moved, renamed, or is temporarily inaccessible in your workspace.
        </p>
        
        <Link 
          to="/"
          className="inline-flex items-center gap-2 py-3 px-6 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-full transition-all shadow-xs active:scale-98 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return to Workspace</span>
        </Link>
      </div>

    </div>
  );
};

export default NotFound;
