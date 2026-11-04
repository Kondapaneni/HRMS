import React from 'react';
import { motion } from 'framer-motion';

/**
 * Tabs / Chips Component
 * Spec:
 *  - Pill style, radius 999px
 *  - Inactive: white background, #6B6B75 text
 *  - Active: #131315 background, white text (dark theme: #F4F4F6 bg, #18181B text)
 */
export const Tabs = ({
  tabs = [],
  activeTab,
  onChange,
  size = 'md', // 'sm' (32px) | 'md' (36px) | 'lg' (40px)
  className = '',
  layoutId = 'tabs-active-pill',
}) => {
  const sizeClasses = {
    sm: 'h-[32px] px-3 text-[12px]',
    md: 'h-[36px] px-4 text-[13px]',
    lg: 'h-[40px] px-5 text-[14px]',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 p-1 rounded-full bg-[var(--surface-alt)] border border-[var(--line)] ${className}`}>
      {tabs.map((tab) => {
        const tabId = typeof tab === 'object' ? tab.id : tab;
        const tabLabel = typeof tab === 'object' ? tab.label : tab;
        const tabCount = typeof tab === 'object' ? tab.count : undefined;
        const tabIcon = typeof tab === 'object' ? tab.icon : undefined;
        const isActive = activeTab === tabId;

        return (
          <button
            key={tabId}
            type="button"
            onClick={() => onChange?.(tabId)}
            className={`relative ${sizeClasses[size] || sizeClasses.md} rounded-full font-medium transition-colors cursor-pointer select-none flex items-center gap-1.5 z-10 ${
              isActive
                ? 'text-white dark:text-[#131315]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-[var(--ink)] dark:bg-white z-[-1]"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
              />
            )}
            {tabIcon && <span className="shrink-0">{tabIcon}</span>}
            <span>{tabLabel}</span>
            {tabCount !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/20 text-white dark:bg-black/10 dark:text-[#131315]'
                    : 'bg-[var(--line)] text-[var(--muted)]'
                }`}
              >
                {tabCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;

