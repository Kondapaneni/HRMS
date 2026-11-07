import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 65; // pixels needed to trigger refresh
const MAX_PULL = 110;       // max visual pull distance

/**
 * Mobile PullToRefresh Component
 * Spec from Section 4.4:
 *  - Floating pill dock with #131315 background and white text
 *  - Brand accent #8AADDB spinner
 *  - Smooth haptic vibration on reach
 */
const PullToRefresh = ({ children, onRefresh }) => {
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const currentPullRef = useRef(0);
  const isAtTopRef = useRef(false);
  const hasVibratedRef = useRef(false);

  const checkIfAtTop = (target) => {
    let el = target;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.scrollTop && el.scrollTop > 1) {
        return false;
      }
      el = el.parentElement;
    }
    return window.scrollY <= 1;
  };

  const handleTouchStart = useCallback((e) => {
    if (isRefreshing) return;
    const touch = e.touches ? e.touches[0] : e;
    startYRef.current = touch.clientY;
    startXRef.current = touch.clientX;
    isAtTopRef.current = checkIfAtTop(e.target);
    hasVibratedRef.current = false;
    currentPullRef.current = 0;
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e) => {
    if (isRefreshing || !isAtTopRef.current) return;

    const touch = e.touches ? e.touches[0] : e;
    const deltaY = touch.clientY - startYRef.current;
    const deltaX = touch.clientX - startXRef.current;

    if (deltaY > 5 && Math.abs(deltaY) > Math.abs(deltaX) * 1.1) {
      const damp = Math.min(MAX_PULL, Math.pow(deltaY, 0.83));
      currentPullRef.current = damp;
      setPullDistance(damp);

      if (damp >= PULL_THRESHOLD && !hasVibratedRef.current) {
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
        hasVibratedRef.current = true;
      } else if (damp < PULL_THRESHOLD) {
        hasVibratedRef.current = false;
      }

      if (e.cancelable && deltaY > 10) {
        e.preventDefault();
      }
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing) return;

    if (currentPullRef.current >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(50);

      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          await queryClient.refetchQueries();
        }
        setIsSuccess(true);
      } catch (err) {
        console.error('Pull-to-refresh error:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setIsSuccess(false);
          setPullDistance(0);
          currentPullRef.current = 0;
        }, 600);
      }
    } else {
      setPullDistance(0);
      currentPullRef.current = 0;
    }
  }, [isRefreshing, onRefresh, queryClient]);

  useEffect(() => {
    const options = { passive: false };
    const onMove = (e) => handleTouchMove(e);
    window.addEventListener('touchmove', onMove, options);
    
    return () => {
      window.removeEventListener('touchmove', onMove, options);
    };
  }, [handleTouchMove]);

  const pullRatio = Math.min(1, pullDistance / PULL_THRESHOLD);

  return (
    <div
      className="relative w-full h-full min-h-screen"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing || isSuccess) && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.8 }}
            animate={{
              opacity: Math.min(1, pullRatio * 1.5),
              y: Math.min(pullDistance, 50),
              scale: 1,
            }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed top-2 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none"
          >
            <div className={`px-4 py-2 rounded-full shadow-[var(--shadow-modal)] border flex items-center gap-2 transition-all duration-200 ${
              isSuccess 
                ? 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-text)]/30'
                : 'bg-[var(--ink)] text-white border-white/10 dark:bg-[var(--surface)] dark:text-[var(--text)] dark:border-[var(--line)]'
            }`}>
              <RefreshCw 
                size={14}
                className={`${
                  isRefreshing ? 'animate-spin text-[var(--brand)]' : isSuccess ? 'text-[var(--success-text)]' : 'text-[var(--brand)]'
                }`}
                style={{
                  transform: !isRefreshing && !isSuccess ? `rotate(${pullRatio * 360}deg)` : undefined,
                }}
              />

              <span className="text-[12px] font-medium tracking-wide select-none">
                {isSuccess
                  ? 'Updated'
                  : isRefreshing
                  ? 'Refreshing...'
                  : pullDistance >= PULL_THRESHOLD
                  ? 'Release to refresh'
                  : 'Pull down to refresh'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full min-h-screen">
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
