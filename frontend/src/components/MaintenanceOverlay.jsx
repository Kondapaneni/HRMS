import React, { useState } from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * SEC-020: Informational maintenance notice only.
 * Maintenance access is decided on the PHP server, never by a browser
 * password, a hidden click sequence, or a localStorage override.
 */
const MaintenanceOverlay = ({ message }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#131315]/45 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        className="bg-white text-[#131315] rounded-[32px] sm:rounded-[36px] shadow-2xl max-w-sm sm:max-w-md w-full p-6 sm:p-8 text-center relative overflow-hidden border border-neutral-200/70"
      >
        <div
          className="w-16 h-16 bg-[#F3F9F1] border border-neutral-200 text-[#2F6B38] rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs"
          aria-hidden="true"
        >
          <Settings size={28} className="animate-[spin_6s_linear_infinite]" strokeWidth={1.8} />
        </div>
        <h2 className="text-2xl font-bold text-[#131315] mb-2 tracking-tight">
          Scheduled maintenance
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mb-6 leading-relaxed max-w-xs mx-auto font-normal">
          {message || 'The Acme HRMS platform is currently undergoing scheduled maintenance. Please check back shortly.'}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <RefreshCw size={16} className={`inline-block mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Checking status...' : 'Check again / Refresh'}
        </button>
      </motion.div>
    </div>
  );
};

export default MaintenanceOverlay;
