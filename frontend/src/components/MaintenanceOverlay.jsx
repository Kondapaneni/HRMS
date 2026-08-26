import React, { useState } from 'react';
import { Settings, RefreshCw, Terminal, Lock, KeyRound, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MaintenanceOverlay = ({ message, onBypassSuccess }) => {
  const [clickCount, setClickCount] = useState(0);
  const [showBypassBtn, setShowBypassBtn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleIconClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 5) {
      setShowBypassBtn(true);
    }
  };

  const handleBypassSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Developer password verification
    if (password.trim() === 'AcmeDev@2026') {
      localStorage.setItem('dev_bypass_maintenance_session', 'true');
      if (onBypassSuccess) {
        onBypassSuccess();
      } else {
        window.location.reload();
      }
    } else {
      setError('Incorrect Developer Password');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full p-6 sm:p-8 text-center relative overflow-hidden border border-[#e0e3e7]"
      >
        {/* Top 4-Color Gradient Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />
        
        {/* Clickable Maintenance Icon Container (5-click secret trigger) */}
        <div 
          onClick={handleIconClick}
          className="w-16 h-16 bg-[#fef7e0] border border-[#feefc3] text-[#b06000] rounded-2xl flex items-center justify-center mx-auto mb-4 mt-1 cursor-pointer select-none transition-transform active:scale-95 group relative shadow-2xs"
          title="Maintenance Mode"
        >
          <Settings size={30} className="animate-[spin_6s_linear_infinite]" />
        </div>

        {/* 4 Google Colors Accent */}
        <div className="flex items-center justify-center gap-1 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-1">
            System Maintenance
          </span>
        </div>
        
        <h2 className="text-xl sm:text-2xl font-bold text-[#1f1f1f] mb-2 tracking-tight">
          Under Scheduled Maintenance
        </h2>
        
        <p className="text-[#5f6368] text-xs sm:text-sm mb-6 leading-relaxed px-2">
          {message || "The Acme HRMS platform is currently undergoing scheduled maintenance. Please check back shortly."}
        </p>

        <div className="flex flex-col items-center gap-3 w-full">
          <button 
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-70 active:scale-95"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-[#1a73e8]' : 'text-[#5f6368]'} />
            <span>{isRefreshing ? 'Checking Status...' : 'Check Again / Refresh'}</span>
          </button>

          {/* Secret Developer Bypass Button (Revealed after 5 clicks) */}
          {showBypassBtn && (
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-full text-white text-sm font-bold transition-all cursor-pointer shadow-xs active:scale-95 bg-[#1a73e8] hover:bg-[#1557b0]"
            >
              <Terminal size={16} />
              <span>Developer Bypass</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Developer Password Authentication Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative overflow-hidden border border-[#e0e3e7]"
            >
              {/* Top 4-Color Gradient Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-[#5f6368] hover:text-[#1f1f1f] p-1.5 rounded-full hover:bg-[#f1f3f4] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="w-12 h-12 bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] rounded-2xl flex items-center justify-center mx-auto mb-3 mt-1 shadow-2xs">
                <ShieldCheck size={22} />
              </div>

              <h3 className="text-base font-bold text-[#1f1f1f] text-center mb-0.5">
                Developer Authentication
              </h3>
              <p className="text-xs text-[#5f6368] text-center mb-5">
                Enter developer credentials to bypass maintenance mode
              </p>

              <form onSubmit={handleBypassSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                    <input 
                      type="password"
                      autoFocus
                      placeholder="Developer Password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#f8fafd] border border-[#dadce0] rounded-full text-xs font-medium outline-none focus:border-[#1a73e8] focus:bg-white transition-all text-[#1f1f1f]"
                    />
                  </div>
                  {error && (
                    <p className="text-[11px] text-[#d93025] font-medium mt-1.5 flex items-center gap-1">
                      <AlertCircle size={13} /> {error}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full py-3.5 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-full text-white text-sm font-bold transition-all cursor-pointer shadow-xs active:scale-95 bg-[#1a73e8] hover:bg-[#1557b0]"
                  >
                    Authenticate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MaintenanceOverlay;
