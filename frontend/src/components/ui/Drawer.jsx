import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Drawer (Side Sheet) Component
 * Spec:
 *  - Full height, radius 24px on the inner edge (rounded-l-[24px])
 *  - White/Surface, scrim rgba(19,19,21,0.45)
 *  - Slides in from right (150-250ms ease)
 *  - Header with title/subtitle, scrollable body, sticky/fixed footer
 */
export const Drawer = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'w-full sm:max-w-[480px]',
  showClose = true,
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose?.();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end">
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            className="fixed inset-0 bg-[#131315]/45 backdrop-blur-[2px]"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            className={`relative ${width} h-full bg-[var(--surface)] text-[var(--text)] rounded-l-[24px] shadow-[var(--shadow-modal)] flex flex-col z-10 overflow-hidden border-l border-[var(--line)]`}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--line)] flex items-start justify-between gap-4 shrink-0">
              <div>
                {title && (
                  <h3 className="text-[17px] font-medium text-[var(--text)] leading-snug">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-[12px] text-[var(--muted)] mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
              {showClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  aria-label="Close sheet"
                >
                  <X size={16} strokeWidth={1.7} />
                </button>
              )}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex items-center justify-end gap-2.5 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Drawer;

