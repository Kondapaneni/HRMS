import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Check } from 'lucide-react';

const PULL_THRESHOLD = 65; // pixels needed to trigger refresh
const MAX_PULL = 110;       // max visual pull distance

/**
 * Native Mobile-Style PullToRefresh Component
 * Replaces text badges with a sleek, native circular glass pull indicator.
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
      // Damped elastic formula
      const damp = Math.min(MAX_PULL, Math.pow(deltaY, 0.83));
      currentPullRef.current = damp;
      setPullDistance(damp);
      setIsDragging(true);

      // Light tactile vibration on reaching refresh point
      if (damp >= PULL_THRESHOLD && !hasVibratedRef.current) {
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
        hasVibratedRef.current = true;
      } else if (damp < PULL_THRESHOLD) {
        hasVibratedRef.current = false;
      }

      // Prevent native browser scroll artifacts while pulling
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
      setPullDistance(52); // Lock position during refresh animation

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
        }, 500);
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
      {/* Sleek Native Floating Pull Indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.5 }}
            animate={{
              opacity: Math.min(1, pullRatio * 1.3),
              y: Math.min(pullDistance, 52),
              scale: isRefreshing ? 1 : 0.4 + pullRatio * 0.6,
            }}
            exit={{ opacity: 0, y: -10, scale: 0.3 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
          >
            <div className={`w-10 h-10 rounded-full shadow-lg border backdrop-blur-xl flex items-center justify-center transition-colors duration-200 ${
              isSuccess 
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
                : pullDistance >= PULL_THRESHOLD || isRefreshing
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/25'
                : 'bg-white/95 text-blue-600 border-slate-200/90 shadow-slate-900/10'
            }`}>
              {isSuccess ? (
                <Check className="w-5 h-5 text-white animate-bounce" />
              ) : isRefreshing ? (
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
              ) : (
                <div 
                  className="transition-transform duration-75 flex items-center justify-center"
                  style={{ transform: `rotate(${pullRatio * 360}deg)` }}
                >
                  <RefreshCw 
                    className={`w-5 h-5 transition-colors ${
                      pullDistance >= PULL_THRESHOLD ? 'text-white' : 'text-blue-600'
                    }`} 
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content View with Elastic Displacement */}
      <div 
        className="w-full h-full transition-transform duration-75 ease-out"
        style={{
          transform: pullDistance > 0 ? `translate3d(0, ${pullDistance * 0.38}px, 0)` : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
