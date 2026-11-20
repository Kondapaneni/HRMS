import React, { useSyncExternalStore } from 'react';
import { isLandscapeWarningActive, subscribeLandscapeWarning } from '../performance/orientationWarning.js';
import { motion } from 'framer-motion';
import { Smartphone, RotateCw } from 'lucide-react';

export default function LandscapeOverlay() {
  const shouldShow = useSyncExternalStore(
    subscribeLandscapeWarning, isLandscapeWarningActive, () => false
  );
  // No element is left behind to consume touches after returning to portrait.
  if (!shouldShow) return null;
  return (
    <>
      {/* Landscape Orientation Warning Overlay for Mobile/Tablet */}
      <div 
        role="status" aria-label="Rotate back to portrait" aria-live="polite"
        // This is only an informational illustration: it has no controls.
        // Never let a stale iOS PWA / Android WebView compositing layer block
        // navigation taps if an orientation event arrives late.
        className="orientation-warning pointer-events-none fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#131315]/45 backdrop-blur-md p-6 text-center select-none"
      >
        {/* Card Container matching Login UI */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 bg-white border border-neutral-200/70 rounded-[32px] sm:rounded-[36px] shadow-2xl p-6 sm:p-8 max-w-sm w-full mx-auto flex flex-col items-center text-center"
        >
          {/* Animated Device Rotation Graphic */}
          <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F3F9F1] border border-[#2F6B38]/20 flex items-center justify-center">
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
                <Smartphone className="w-8 h-8 text-[#2F6B38]" strokeWidth={1.8} />
              </motion.div>
            </div>
            {/* Rotate badge */}
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-black">
              <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} strokeWidth={1.8} />
            </div>
          </div>

          <h3 className="text-xl font-bold text-[#131315] mb-1.5 leading-snug">
            Rotate back to portrait
          </h3>

          <p className="text-xs sm:text-sm text-neutral-500 max-w-xs font-normal leading-relaxed mb-5">
            Acme HRMS is optimized for portrait orientation. Please rotate your device upright to continue.
          </p>

          <div className="text-xs font-semibold text-[#2F6B38] bg-[#E6F6EC] border border-emerald-200 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#2F6B38] animate-ping" />
            <span>Resumes automatically when upright</span>
          </div>
        </motion.div>
      </div>
    </>
  );
}
