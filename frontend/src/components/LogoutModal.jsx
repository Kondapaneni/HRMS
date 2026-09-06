import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';

export default function LogoutModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = 'Sign out of your account?',
  description = 'Are you sure you want to end your session? You will need to sign in again to access the portal.',
  confirmText = 'Sign Out',
  cancelText = 'Cancel'
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isLoading && onClose && onClose()}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl border border-[#e0e3e7] overflow-hidden z-10 font-editorial antialiased"
            style={{ fontFamily: "'Newsreader', Georgia, serif" }}
          >
            {/* Top 4-Color Accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

            <div className="p-6 text-center space-y-4 pt-7">
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl bg-[#fce8e6] border border-[#fad2cf] text-[#d93025] flex items-center justify-center mx-auto shadow-2xs">
                <LogOut className="w-6 h-6" />
              </div>

              {/* Text */}
              <div className="space-y-1">
                <h3 className="text-xl font-medium text-[#1f1f1f] tracking-tight" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
                  {title}
                </h3>
                <p className="text-xs text-[#5f6368] leading-relaxed">
                  {description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3.5 px-4 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-sm font-semibold text-[#1f1f1f] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center active:scale-[0.98]"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 py-3.5 px-4 rounded-full bg-[#d93025] hover:bg-[#b3261e] text-white text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Signing Out...</span>
                    </>
                  ) : (
                    <span>{confirmText}</span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
