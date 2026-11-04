import React, { useState } from 'react';
import { Settings, RefreshCw, Terminal, KeyRound, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './ui/Button';

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
        className="bg-[var(--surface)] text-[var(--text)] rounded-[24px] shadow-[var(--shadow-modal)] max-w-sm sm:max-w-md w-full p-6 sm:p-8 text-center relative overflow-hidden border border-[var(--line)]/50"
      >
        {/* Clickable Maintenance Icon Container (5-click secret trigger) */}
        <div 
          onClick={handleIconClick}
          className="w-14 h-14 bg-[var(--warning-bg)] text-[var(--warning-text)] rounded-[14px] flex items-center justify-center mx-auto mb-4 cursor-pointer select-none transition-transform active:scale-95 group relative"
          title="Maintenance Mode"
        >
          <Settings size={26} className="animate-[spin_6s_linear_infinite]" strokeWidth={1.7} />
        </div>

        <h2 className="text-[18px] sm:text-[20px] font-medium text-[var(--text)] mb-1.5 leading-snug">
          Scheduled maintenance
        </h2>
        
        <p className="text-[13px] text-[var(--muted)] mb-6 leading-relaxed">
          {message || "The Acme HRMS platform is currently undergoing scheduled maintenance. Please check back shortly."}
        </p>

        <div className="flex flex-col items-center gap-2.5 w-full">
          <Button
            variant="secondary"
            size="md"
            onClick={handleRefresh}
            disabled={isRefreshing}
            isLoading={isRefreshing}
            leftIcon={!isRefreshing ? RefreshCw : undefined}
            className="w-full"
          >
            {isRefreshing ? 'Checking status...' : 'Check again / Refresh'}
          </Button>

          {/* Secret Developer Bypass Button (Revealed after 5 clicks) */}
          {showBypassBtn && (
            <motion.div 
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowModal(true)}
                leftIcon={Terminal}
                className="w-full"
              >
                Developer bypass
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Developer Password Authentication Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] bg-[#131315]/45 backdrop-blur-[2px] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-[var(--surface)] text-[var(--text)] rounded-[24px] shadow-[var(--shadow-modal)] max-w-sm w-full p-6 relative overflow-hidden border border-[var(--line)]/50"
            >
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-[var(--icon-muted)] hover:text-[var(--text)] w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
              >
                <X size={16} strokeWidth={1.7} />
              </button>

              <div className="w-12 h-12 bg-[var(--brand-tint)] text-[var(--brand-deep)] rounded-[14px] flex items-center justify-center mx-auto mb-3 mt-1">
                <ShieldCheck size={22} strokeWidth={1.7} />
              </div>

              <h3 className="text-[16px] font-medium text-[var(--text)] text-center mb-0.5">
                Developer authentication
              </h3>
              <p className="text-[12px] text-[var(--muted)] text-center mb-5">
                Enter developer credentials to bypass maintenance mode
              </p>

              <form onSubmit={handleBypassSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <KeyRound size={16} strokeWidth={1.7} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--icon-muted)]" />
                    <input 
                      type="password"
                      autoFocus
                      placeholder="Developer Password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-[40px] pl-10 pr-4 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-[13px] outline-none focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-tint)] transition-all text-[var(--text)]"
                    />
                  </div>
                  {error && (
                    <p className="text-[12px] text-[var(--danger-text)] font-medium mt-1.5 flex items-center gap-1">
                      <AlertCircle size={13} /> {error}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                  >
                    Authenticate
                  </Button>
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
