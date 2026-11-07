import { useState } from 'react';
import { Settings, RefreshCw, Terminal, KeyRound, AlertCircle, X, ShieldCheck } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] bg-[#131315]/45 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        className="bg-white text-[#131315] rounded-[32px] sm:rounded-[36px] shadow-2xl max-w-sm sm:max-w-md w-full p-6 sm:p-8 text-center relative overflow-hidden border border-neutral-200/70"
      >
        {/* Clickable Maintenance Icon Container (5-click secret trigger) */}
        <div 
          onClick={handleIconClick}
          className="w-16 h-16 bg-[#F3F9F1] border border-neutral-200 text-[#2F6B38] rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer select-none transition-transform active:scale-95 group relative shadow-xs"
          title="Maintenance Mode"
        >
          <Settings size={28} className="animate-[spin_6s_linear_infinite]" strokeWidth={1.8} />
        </div>

        <h2 className="text-2xl font-bold text-[#131315] mb-2 tracking-tight">
          Scheduled maintenance
        </h2>
        
        <p className="text-xs sm:text-sm text-neutral-500 mb-6 leading-relaxed max-w-xs mx-auto font-normal">
          {message || "The Acme HRMS platform is currently undergoing scheduled maintenance. Please check back shortly."}
        </p>

        <div className="flex flex-col items-center gap-2.5 w-full">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Checking status...' : 'Check again / Refresh'}</span>
          </button>

          {/* Secret Developer Bypass Button (Revealed after 5 clicks) */}
          {showBypassBtn && (
            <motion.div 
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full h-12 rounded-full border border-neutral-300 hover:bg-neutral-50 text-neutral-800 font-medium text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <Terminal size={16} />
                <span>Developer bypass</span>
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Developer Password Authentication Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] bg-[#131315]/50 backdrop-blur-[2px] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-white text-[#131315] rounded-[32px] sm:rounded-[36px] shadow-2xl max-w-sm w-full p-6 sm:p-7 relative overflow-hidden border border-neutral-200/70"
            >
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-black w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X size={18} strokeWidth={1.8} />
              </button>

              <div className="w-12 h-12 bg-[#F3F9F1] border border-neutral-200 text-[#2F6B38] rounded-full flex items-center justify-center mx-auto mb-3 mt-1">
                <ShieldCheck size={22} strokeWidth={1.8} />
              </div>

              <h3 className="text-lg font-bold text-[#131315] text-center mb-1">
                Developer authentication
              </h3>
              <p className="text-xs text-neutral-500 text-center mb-5">
                Enter developer credentials to bypass maintenance mode
              </p>

              <form onSubmit={handleBypassSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <KeyRound size={16} strokeWidth={1.8} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                      type="password"
                      autoFocus
                      placeholder="Developer Password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 bg-white border border-neutral-300 rounded-full text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-[#131315] shadow-2xs"
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1 justify-center">
                      <AlertCircle size={14} /> {error}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full h-11 rounded-full border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full h-11 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-xs transition-all cursor-pointer shadow-sm"
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
