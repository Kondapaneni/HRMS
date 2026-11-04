import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, RotateCw } from 'lucide-react';

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
        className="orientation-warning fixed inset-0 z-[99999] flex-col items-center justify-center bg-[#131315]/45 backdrop-blur-md p-6 text-center select-none"
      >
        {/* Card Container */}
        <div className="relative z-10 bg-[var(--surface)] border border-[var(--line)]/50 rounded-[24px] shadow-[var(--shadow-modal)] p-6 sm:p-8 max-w-sm w-full mx-auto flex flex-col items-center text-center">
          
          {/* Animated Device Rotation Graphic */}
          <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
            <div className="w-16 h-16 rounded-[16px] bg-[var(--brand-tint)] flex items-center justify-center">
              <motion.div
                animate={{ 
                  rotate: [-90, 0, 0, -90],
                  scale: [0.95, 1.05, 1, 0.95],
                }}
                transition={{ 
                  duration: 2.6, 
                  repeat: Infinity, 
                  ease: [0.34, 1.56, 0.64, 1],
                  times: [0, 0.45, 0.8, 1],
                }}
              >
                <Smartphone className="w-8 h-8 text-[var(--brand-deep)]" strokeWidth={1.7} />
              </motion.div>
            </div>
            {/* Rotate badge */}
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--line)] shadow-sm flex items-center justify-center text-[var(--brand-deep)]">
              <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} strokeWidth={1.7} />
            </div>
          </div>

          <h3 className="text-[18px] font-medium text-[var(--text)] mb-1.5 leading-snug">
            Rotate back to portrait
          </h3>

          <p className="text-[13px] text-[var(--muted)] max-w-xs font-normal leading-relaxed mb-4">
            Acme HRMS is designed for portrait orientation. Please rotate your device upright to continue.
          </p>

          <div className="text-[11px] font-medium text-[var(--success-text)] bg-[var(--success-bg)] px-3 py-1 rounded-[9px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-text)] animate-ping" />
            <span>Resumes automatically when upright</span>
          </div>
        </div>
      </div>
    </>
  );
}
