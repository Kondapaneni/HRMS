import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowDown, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const PULL_THRESHOLD = 65; // pixels needed to trigger refresh
const MAX_PULL = 110;       // max visual pull distance

/**
 * PullToRefresh Wrapper Component
 * Enables a smooth swipe-down-from-top gesture to refresh app data in PWA mode.
 */
const PullToRefresh = ({ children, onRefresh }) => {
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const currentPullRef = useRef(0);
  const isAtTopRef = useRef(false);
  const hasVibratedRef = useRef(false);

  // Helper to check if any scrollable parent is scrolled down
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

    // Only activate if dragging downward and mostly vertical
    if (deltaY > 5 && Math.abs(deltaY) > Math.abs(deltaX) * 1.1) {
      // Apply elastic damping formula
      const damp = Math.min(MAX_PULL, Math.pow(deltaY, 0.83));
      currentPullRef.current = damp;
      setPullDistance(damp);
      setIsDragging(true);

      // Trigger light haptic feedback when passing threshold for native PWA feel
      if (damp >= PULL_THRESHOLD && !hasVibratedRef.current) {
        if (navigator.vibrate) {
          navigator.vibrate(35);
        }
        hasVibratedRef.current = true;
      } else if (damp < PULL_THRESHOLD) {
        hasVibratedRef.current = false;
      }

      // Prevent native browser scroll/rubberband when pulling down
      if (e.cancelable && deltaY > 10) {
        e.preventDefault();
      }
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing) return;
    setIsDragging(false);

    if (currentPullRef.current >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(55); // Lock header position during refresh animation

      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          // Default: refetch all active TanStack Query queries
          await queryClient.refetchQueries();
        }
        setIsSuccess(true);
        toast.success('App data refreshed', { id: 'pwa-pull-refresh', duration: 2000 });
      } catch (err) {
        console.error('Pull-to-refresh error:', err);
        toast.error('Failed to refresh data', { id: 'pwa-pull-refresh' });
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

  // Global listeners for non-passive touchmove to prevent browser drag artifacts
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
      {/* Top Floating Pull-to-Refresh Indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.8 }}
            animate={{
              opacity: 1,
              y: Math.min(pullDistance, 55),
              scale: 1,
            }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 25 }}
            className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
          >
            <div className={`px-4 py-2 rounded-full shadow-lg border backdrop-blur-xl flex items-center gap-2.5 transition-colors duration-200 ${
              isSuccess 
                ? 'bg-emerald-500/90 text-white border-emerald-400/50 shadow-emerald-500/20'
                : pullDistance >= PULL_THRESHOLD || isRefreshing
                ? 'bg-blue-600/90 text-white border-blue-400/50 shadow-blue-500/25'
                : 'bg-white/90 text-slate-700 border-slate-200/80 shadow-slate-900/10'
            }`}>
              {isSuccess ? (
                <Check className="w-4 h-4 text-white animate-bounce" />
              ) : isRefreshing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : pullDistance >= PULL_THRESHOLD ? (
                <RefreshCw 
                  className="w-4 h-4 text-white transition-transform duration-200" 
                  style={{ transform: `rotate(${pullRatio * 360}deg)` }}
                />
              ) : (
                <ArrowDown 
                  className="w-4 h-4 text-blue-600 transition-transform duration-200" 
                  style={{ transform: `rotate(${pullRatio * 180}deg)` }}
                />
              )}

              <span className="text-xs font-semibold tracking-wide select-none">
                {isSuccess
                  ? 'Updated!'
                  : isRefreshing
                  ? 'Updating HRMS...'
                  : pullDistance >= PULL_THRESHOLD
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div 
        className="w-full h-full transition-transform duration-75 ease-out"
        style={{
          transform: pullDistance > 0 ? `translate3d(0, ${pullDistance * 0.35}px, 0)` : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
