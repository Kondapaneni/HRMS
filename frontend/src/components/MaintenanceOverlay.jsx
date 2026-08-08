import React, { useState } from 'react';
import { Settings, RefreshCw, Terminal, Lock, KeyRound, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MaintenanceOverlay = ({ message, onBypassSuccess }) => {
  const [clickCount, setClickCount] = useState(0);
  const [showBypassBtn, setShowBypassBtn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />
        
        {/* Clickable Maintenance Icon Container (5-click secret trigger) */}
        <div 
          onClick={handleIconClick}
          className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 cursor-pointer select-none transition-transform active:scale-95 group relative"
          title="Maintenance Mode"
        >
          <Settings size={36} className="text-amber-600 animate-[spin_4s_linear_infinite]" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
          Under Maintenance
        </h2>
        
        <p className="text-slate-600 mb-8 leading-relaxed">
          {message || "The application is currently undergoing maintenance. Please check back later."}
        </p>

        <div className="flex flex-col items-center gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={18} />
            Refresh Page
          </button>

          {/* Secret Developer Bypass Button (Revealed after 5 clicks) */}
          {showBypassBtn && (
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-md cursor-pointer"
            >
              <Terminal size={18} />
              Developer Bypass
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Developer Password Authentication Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative overflow-hidden"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={24} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 text-center mb-1">
                Developer Authentication
              </h3>
              <p className="text-xs text-slate-500 text-center mb-5">
                Enter developer password to bypass maintenance mode
              </p>

              <form onSubmit={handleBypassSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password"
                      autoFocus
                      placeholder="Developer Password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                      <AlertCircle size={14} /> {error}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
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
