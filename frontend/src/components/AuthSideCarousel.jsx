import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CalendarCheck, Wallet } from 'lucide-react';

const carouselSlides = [
  {
    id: 'workforce',
    cardTitle: 'Workforce Hub',
    cardSubtitle: '248 Active Staff',
    cardBadge: 'People Ops',
    cardProgress: '96%',
    badgeIcon: Users,
    headline: 'Make your work easier and organized with Acme HRMS',
    description: 'Streamline team directories, organizational hierarchy, and employee onboarding.',
    themeAccent: '#10B981',
  },
  {
    id: 'attendance',
    cardTitle: 'Smart Attendance',
    cardSubtitle: 'Shift Geofenced',
    cardBadge: 'Live Verified',
    cardProgress: '98%',
    badgeIcon: CalendarCheck,
    headline: 'Automated attendance & real-time shift verification',
    description: 'Geofenced check-ins, automated leave approvals, and dynamic shift roster tracking.',
    themeAccent: '#0D9488',
  },
  {
    id: 'payroll',
    cardTitle: 'Payroll Engine',
    cardSubtitle: 'Disbursements Ready',
    cardBadge: 'Compliant',
    cardProgress: '100%',
    badgeIcon: Wallet,
    headline: 'Frictionless payroll processing & tax compliance',
    description: 'Automated salary disbursements, tax deductions, and verified employee pay slips.',
    themeAccent: '#5B86C2',
  },
];

export default function AuthSideCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play carousel every 5 seconds (pauses on hover)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const currentSlide = carouselSlides[activeSlide];

  return (
    <div 
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="order-1 lg:order-2 lg:col-span-6 bg-[#F3F9F1] rounded-[24px] sm:rounded-[36px] m-3 sm:m-4 p-4 sm:p-8 lg:p-10 flex flex-col items-center justify-between min-h-[290px] sm:min-h-[420px] lg:min-h-[520px] relative overflow-hidden select-none border border-neutral-100"
    >
      {/* Subtle green ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 h-64 sm:h-80 bg-[#E2F2DE]/60 rounded-full blur-3xl pointer-events-none" />

      {/* Carousel Slide Animation Container */}
      <div className="relative w-full max-w-[320px] sm:max-w-[380px] h-[190px] sm:h-[260px] lg:h-[310px] flex items-center justify-center my-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="relative w-full h-full flex items-center justify-center"
          >
            {/* Floating Avatar 1 (Top Left) */}
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1 sm:top-2 left-2 sm:left-4 z-20"
            >
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full border-2 border-[#1F2937] bg-[#D1FAE5] p-0.5 shadow-md overflow-hidden flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-full h-full">
                  <circle cx="20" cy="20" r="18" fill="#A7F3D0" />
                  <circle cx="20" cy="18" r="8" fill="#1F2937" />
                  <circle cx="20" cy="17" r="7.5" fill="#FDE68A" />
                  <circle cx="17.5" cy="16.5" r="1.2" fill="#1F2937" />
                  <circle cx="22.5" cy="16.5" r="1.2" fill="#1F2937" />
                  <path d="M18 20 Q20 22 22 20" stroke="#1F2937" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  <path d="M15 13 Q20 8 25 13 Q22 10 18 11 Z" fill="#1F2937" />
                  <path d="M12 36 C12 28 28 28 28 36 Z" fill="#10B981" />
                </svg>
              </div>
            </motion.div>

            {/* Floating Avatar 2 (Mid Right) */}
            <motion.div 
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
              className="absolute top-16 sm:top-24 lg:top-32 right-1 sm:right-4 z-20"
            >
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full border-2 border-[#1F2937] bg-white p-0.5 shadow-md overflow-hidden flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-full h-full">
                  <circle cx="20" cy="20" r="18" fill="#FEE2E2" />
                  <circle cx="20" cy="18" r="8" fill="#1F2937" />
                  <circle cx="20" cy="17" r="7.5" fill="#FED7AA" />
                  <circle cx="17.5" cy="16.5" r="1.2" fill="#1F2937" />
                  <circle cx="22.5" cy="16.5" r="1.2" fill="#1F2937" />
                  <circle cx="20" cy="20.5" r="2" fill="#1F2937" />
                  <path d="M12 18 C12 10 28 10 28 18 C28 22 26 24 26 24 L24 17 C22 14 18 14 16 17 L14 24 C14 24 12 22 12 18 Z" fill="#1F2937" />
                  <path d="M11 36 C11 28 29 28 29 36 Z" fill="#1F2937" />
                </svg>
              </div>
            </motion.div>

            {/* Central Meditating Character Illustration */}
            <div className="relative z-10 flex flex-col items-center">
              <svg 
                className="w-[145px] h-[135px] sm:w-[185px] sm:h-[175px] lg:w-[220px] lg:h-[210px]" 
                viewBox="0 0 240 230" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Floating Green Aura Loops */}
                <path 
                  d="M 50 110 C 25 50, 100 10, 120 45 C 140 10, 215 50, 190 110" 
                  stroke="#86EFAC" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  fill="none" 
                  strokeDasharray="4 2"
                />
                <path 
                  d="M 45 105 C 15 45, 100 5, 120 40 C 140 5, 225 45, 195 105" 
                  stroke="#A7F3D0" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  fill="none" 
                />

                {/* Hair Back */}
                <ellipse cx="120" cy="95" rx="22" ry="24" fill="#1F2937" />
                {/* Neck */}
                <path d="M114 105 L114 120 L126 120 L126 105 Z" fill="#FCD34D" stroke="#1F2937" strokeWidth="2" />
                {/* Face */}
                <ellipse cx="120" cy="92" rx="16" ry="17" fill="#FDE68A" stroke="#1F2937" strokeWidth="2" />

                {/* Hair Front with Center Part */}
                <path d="M104 88 C104 74 136 74 136 88 C136 88 126 82 120 84 C114 82 104 88 104 88 Z" fill="#1F2937" stroke="#1F2937" strokeWidth="1.5" />
                <path d="M104 88 C104 98 107 106 107 106 C107 106 110 94 113 90 Z" fill="#1F2937" />
                <path d="M136 88 C136 98 133 106 133 106 C133 106 130 94 127 90 Z" fill="#1F2937" />

                {/* Serene Closed Eyes */}
                <path d="M111 92 Q114 94 116 92" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <path d="M124 92 Q126 94 129 92" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                {/* Smile */}
                <path d="M117 99 Q120 102 123 99" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" fill="none" />

                {/* Green Sweater Body */}
                <path 
                  d="M 96 122 C 84 126, 75 140, 78 178 L 162 178 C 165 140, 156 126, 144 122 Z" 
                  fill="#9FE1B8" 
                  stroke="#1F2937" 
                  strokeWidth="2.5" 
                  strokeLinejoin="round"
                />
                <path d="M110 120 C110 126 130 126 130 120" stroke="#1F2937" strokeWidth="2.5" fill="none" />

                {/* White Heart on Sweater */}
                <path 
                  d="M 120 148 C 120 148, 110 141, 110 134 C 110 129, 115 127, 120 131 C 125 127, 130 129, 130 134 C 130 141, 120 148, 120 148 Z" 
                  fill="none" 
                  stroke="#FFFFFF" 
                  strokeWidth="2.5" 
                  strokeLinejoin="round" 
                />

                {/* Arms in Mudra */}
                <path 
                  d="M 85 130 C 65 145, 55 175, 66 186 C 72 192, 85 186, 96 172" 
                  stroke="#1F2937" 
                  strokeWidth="2.5" 
                  fill="#9FE1B8" 
                  strokeLinejoin="round" 
                />
                <circle cx="68" cy="188" r="5" fill="#FDE68A" stroke="#1F2937" strokeWidth="2" />
                <path d="M65 184 Q62 188 66 191" stroke="#1F2937" strokeWidth="2" fill="none" />

                <path 
                  d="M 155 130 C 175 145, 185 175, 174 186 C 168 192, 155 186, 144 172" 
                  stroke="#1F2937" 
                  strokeWidth="2.5" 
                  fill="#9FE1B8" 
                  strokeLinejoin="round" 
                />
                <circle cx="172" cy="188" r="5" fill="#FDE68A" stroke="#1F2937" strokeWidth="2" />
                <path d="M175 184 Q178 188 174 191" stroke="#1F2937" strokeWidth="2" fill="none" />

                {/* White Trousers / Crossed Legs */}
                <path 
                  d="M 80 178 C 65 182, 45 200, 75 210 C 98 218, 120 205, 120 195" 
                  fill="#FFFFFF" 
                  stroke="#1F2937" 
                  strokeWidth="2.5" 
                  strokeLinejoin="round" 
                />
                <path 
                  d="M 160 178 C 175 182, 195 200, 165 210 C 142 218, 120 205, 120 195" 
                  fill="#FFFFFF" 
                  stroke="#1F2937" 
                  strokeWidth="2.5" 
                  strokeLinejoin="round" 
                />
                {/* Bare Feet */}
                <ellipse cx="100" cy="206" rx="6" ry="4" fill="#FDE68A" stroke="#1F2937" strokeWidth="1.8" />
                <ellipse cx="140" cy="206" rx="6" ry="4" fill="#FDE68A" stroke="#1F2937" strokeWidth="1.8" />
              </svg>
            </div>

            {/* Floating HRMS Task Card (Bottom Left of Graphic) */}
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              className="absolute -bottom-1 -left-1 sm:left-1 z-20"
            >
              <div className="bg-white rounded-[16px] sm:rounded-[20px] p-2.5 sm:p-3.5 shadow-xl border border-neutral-200/60 flex flex-col gap-1.5 sm:gap-2 min-w-[125px] sm:min-w-[140px] backdrop-blur-xs scale-90 sm:scale-100 origin-bottom-left">
                <div>
                  <h4 className="font-bold text-[11px] sm:text-[13px] text-neutral-800 tracking-tight leading-tight">
                    {currentSlide.cardTitle}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-neutral-400 font-medium">
                    {currentSlide.cardSubtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-0.5">
                  {/* HRMS Pill Badge */}
                  <span className="text-[9px] sm:text-[10px] font-semibold text-neutral-600 border border-neutral-300 rounded-full px-2 sm:px-2.5 py-0.5 inline-block">
                    {currentSlide.cardBadge}
                  </span>

                  {/* Radial Progress Ring */}
                  <div className="relative w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-neutral-200"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        style={{ stroke: currentSlide.themeAccent }}
                        strokeDasharray={`${parseInt(currentSlide.cardProgress)}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-[7px] sm:text-[8px] font-bold text-neutral-700">
                      {currentSlide.cardProgress}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Carousel Pagination Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-4 z-20">
        {carouselSlides.map((slide, idx) => {
          const isActive = activeSlide === idx;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveSlide(idx)}
              className={`transition-all duration-300 cursor-pointer ${
                isActive 
                  ? 'w-4 sm:w-5 h-1.5 bg-black rounded-full' 
                  : 'w-1.5 h-1.5 bg-neutral-300 hover:bg-neutral-500 rounded-full'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          );
        })}
      </div>

      {/* Bottom Slogan Headline with Smooth Transitions */}
      <div className="text-center mt-2 sm:mt-3 max-w-sm z-10 min-h-[44px] sm:min-h-[56px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-xs sm:text-base lg:text-xl font-bold text-neutral-900 leading-snug">
              {currentSlide.headline}
            </h2>
            <p className="text-[10px] sm:text-[11.5px] text-neutral-500 mt-0.5 sm:mt-1 line-clamp-2">
              {currentSlide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
