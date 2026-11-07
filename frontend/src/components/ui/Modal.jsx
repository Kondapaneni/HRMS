import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal component
 * Spec:
 *  - White/Surface, radius 24px, max-width 560px default (or custom)
 *  - Padding 24px, scrim rgba(19,19,21,0.45)
 *  - Shadow: 0 24px 60px rgba(19,19,21,0.18)
 *  - Right-aligned footer buttons
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-[560px]',
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Scrim / Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={closeOnBackdrop ? onClose : undefined}
            className="fixed inset-0 bg-[#131315]/45 backdrop-blur-[2px]"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            className={`relative w-full ${maxWidth} bg-[var(--surface)] text-[var(--text)] rounded-[24px] p-6 shadow-[var(--shadow-modal)] border border-[var(--line)]/50 z-10 my-auto`}
          >
            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  {title && (
                    <h3 className="text-[18px] font-medium text-[var(--text)] leading-snug">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-[13px] text-[var(--muted)] mt-1">
                      {subtitle}
                    </p>
                  )}
                </div>
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    aria-label="Close dialog"
                  >
                    <X size={16} strokeWidth={1.7} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="text-[14px] text-[var(--text-2)]">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--line)]">
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

export default Modal;

