import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthSideCarousel from '../components/AuthSideCarousel';

const NotFound = () => {
  return (
    <div className="min-h-screen w-full overflow-y-auto bg-[#ECEEEA] flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 lg:p-10 font-sans antialiased text-[#131315]">
      {/* Main 2-Column Card matching Login page */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="my-auto w-full max-w-md sm:max-w-lg lg:max-w-[1080px] bg-white rounded-[28px] sm:rounded-[36px] shadow-xl border border-neutral-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shrink-0"
      >
        {/* ============================================================
            LEFT COLUMN: 404 Notice
            ============================================================ */}
        <div className="order-2 lg:order-1 lg:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 max-w-md mx-auto w-full text-center sm:text-left">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
                A
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B38]">
                Acme HRMS
              </span>
            </div>

            <div className="text-6xl sm:text-7xl lg:text-8xl font-black leading-none tracking-tighter text-[#131315] mb-2 select-none">
              404
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#131315] tracking-tight mb-2">
              Page not found
            </h1>

            <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mb-8 leading-relaxed font-normal">
              The page or workspace resource you are searching for might have been moved, renamed, or is temporarily inaccessible.
            </p>

            <Link to="/" className="w-full inline-block">
              <button className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.99]">
                <Home size={16} />
                <span>Return to workspace</span>
              </button>
            </Link>
          </div>

          {/* Footer Support & Credits */}
          <div className="text-center space-y-2.5 pt-6">
            <p className="text-xs text-neutral-500 font-medium">
              Don't have Access?{' '}
              <a
                href="mailto:hr@acme.com?subject=HRMS%20Access%20Request"
                className="text-[#2F6B38] hover:text-[#1E4D27] hover:underline font-semibold transition-colors"
              >
                Contact HR Admin
              </a>
            </p>
            <p className="text-[11px] text-neutral-400 font-normal">
              Designed and developed by{' '}
              <span className="text-neutral-700 font-semibold">Gowtham Chowdary Kondapaneni</span>
            </p>
          </div>
        </div>

        {/* ============================================================
            RIGHT COLUMN: Calming Sage Green Interactive HRMS Carousel
            ============================================================ */}
        <AuthSideCarousel />
      </motion.div>
    </div>
  );
};

export default NotFound;
