import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import Button from './ui/Button';

export default function LogoutModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = 'Sign out of your account?',
  description = 'Are you sure you want to end your session? You will need to sign in again to access the portal.',
  confirmText = 'Sign Out',
  cancelText = 'Cancel',
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => !isLoading && onClose && onClose()}
            className="fixed inset-0 bg-[#131315]/45 backdrop-blur-[2px]"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm bg-[var(--surface)] text-[var(--text)] rounded-[24px] p-6 shadow-[var(--shadow-modal)] border border-[var(--line)]/50 z-10 text-center"
          >
            {/* Danger Icon Tile */}
            <div className="w-12 h-12 rounded-[14px] bg-[var(--danger-bg)] text-[var(--danger-text)] flex items-center justify-center mx-auto mb-4">
              <LogOut size={22} strokeWidth={1.7} />
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5 mb-6">
              <h3 className="text-[18px] font-medium text-[var(--text)] leading-snug">
                {title}
              </h3>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                {description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                {cancelText}
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={onConfirm}
                disabled={isLoading}
                isLoading={isLoading}
                className="flex-1"
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
