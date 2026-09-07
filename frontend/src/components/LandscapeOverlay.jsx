import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, RefreshCw } from 'lucide-react';

export default function LandscapeOverlay() {
  return (
    <>
      <style>{`
        .orientation-warning {
          display: none;
        }
        @media (orientation: landscape) and (max-width: 1024px) {
          .orientation-warning {
            display: flex;
          }
        }
      `}</style>

      {/* Landscape Orientation Warning Overlay for Mobile/Tablet */}
      <div 
        className="orientation-warning fixed inset-0 z-[99999] flex-col items-center justify-center bg-[#f8fafd]/95 backdrop-blur-2xl p-6 text-center select-none font-editorial antialiased"
        style={{ fontFamily: "'Newsreader', Georgia, serif" }}
      >
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#4285F4]/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#34A853]/12 rounded-full blur-3xl pointer-events-none" />

        {/* Card Container */}
        <div className="relative z-10 bg-white/95 border border-[#dadce0]/80 rounded-3xl shadow-xl shadow-slate-200/50 p-7 sm:p-8 max-w-sm w-full mx-auto flex flex-col items-center">
          
          {/* Animated Device Rotation Graphic */}
          <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
            <div className="w-20 h-20 border border-dashed border-[#4285F4]/30 bg-[#e8f0fe]/60 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ 
                  rotate: [-90, 0, 0, -90],
                  scale: [0.95, 1.05, 1, 0.95]
                }}
                transition={{ 
                  duration: 2.6, 
                  repeat: Infinity, 
                  ease: [0.34, 1.56, 0.64, 1],
                  times: [0, 0.45, 0.8, 1]
                }}
              >
                <Smartphone className="w-10 h-10 text-[#1a73e8]" />
              </motion.div>
            </div>
            {/* Small Rotate badge */}
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border border-[#d2e3fc] shadow-2xs flex items-center justify-center text-[#1a73e8]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          </div>

          {/* 4 Google Colors Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f1f3f4] border border-[#dadce0]/60 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="font-sans text-[10.5px] font-semibold uppercase tracking-wider text-[#444746] ml-0.5">
              Display Orientation
            </span>
          </div>

          {/* Heading with Newsreader Editorial Font */}
          <h3 
            className="font-editorial text-2xl sm:text-[26px] font-medium text-[#1f1f1f] mb-2 leading-tight tracking-tight"
            style={{ fontFamily: "'Newsreader', Georgia, serif" }}
          >
            Rotate back to <span className="font-medium italic text-[#1a73e8]">Portrait</span>
          </h3>

          {/* Description with font-sans */}
          <p className="font-sans text-xs sm:text-[13px] text-[#5f6368] max-w-xs font-normal leading-relaxed mb-4">
            Acme HRMS is crafted for portrait orientation. Please rotate your device upright to continue.
          </p>

          {/* Auto-resume badge */}
          <div className="font-sans text-[11px] font-medium text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-3.5 py-1.2 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#137333] animate-ping" />
            <span>Resumes automatically when upright</span>
          </div>
        </div>
      </div>
    </>
  );
}

