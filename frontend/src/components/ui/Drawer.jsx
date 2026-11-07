import { useEffect } from 'react';
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
            <div className="px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)] shrink-0">
              <div>
                {subtitle && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                      {subtitle}
                    </span>
                  </div>
                )}
                {title && (
                  <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                    {title}
                  </h2>
                )}
              </div>
              {showClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
                  aria-label="Close sheet"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex items-center justify-end gap-3 shrink-0">
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

