import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone } from 'lucide-react';

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
      <div className="orientation-warning fixed inset-0 z-[99999] flex-col items-center justify-center bg-white/95 backdrop-blur-xl p-6 text-center select-none">
        <div className="relative mb-5">
          {/* Animated phone rotation container with Google colors */}
          <div className="w-20 h-20 border border-dashed border-[#4285F4]/40 bg-[#e8f0fe]/60 rounded-full flex items-center justify-center animate-[spin_8s_linear_infinite]">
            <Smartphone className="w-8 h-8 text-[#4285F4] opacity-30" />
          </div>
          {/* Main phone rotation icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, -90, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Smartphone className="w-10 h-10 text-[#1a73e8]" />
            </motion.div>
          </div>
        </div>

        {/* 4 Google Colors Accent */}
        <div className="flex items-center justify-center gap-1 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-1">
            Display Orientation
          </span>
        </div>

        <h3 className="text-xl font-black text-[#1f1f1f] mb-2 uppercase tracking-wide">
          Rotate your device
        </h3>
        <p className="text-[#5f6368] text-xs max-w-xs font-medium leading-relaxed">
          Please rotate your screen back to portrait orientation for the best Acme HRMS experience.
        </p>
      </div>
    </>
  );
}
