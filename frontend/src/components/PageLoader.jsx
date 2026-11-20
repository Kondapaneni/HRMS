import React from 'react';

/**
 * Read-only loading placeholder shown inside the existing page navigation.
 * No old employee, payroll, attendance or customer records are displayed
 * while private queries wait for fresh, authorized server responses.
 */
export const PageLoader = ({ message = 'Loading...' }) => (
  <div role="status" aria-live="polite" aria-busy="true"
    className="w-full min-h-[calc(100dvh-8rem)] py-3 sm:py-5 space-y-5 select-none">
    <p className="text-xs font-medium text-[var(--muted)]">{message}</p>
    <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2 flex-1 max-w-xs">
          <div className="h-5 w-3/5 rounded-lg bg-[var(--line)]" />
          <div className="h-3 w-4/5 rounded-lg bg-[var(--line)] opacity-60" />
        </div>
        <div className="h-9 w-20 rounded-full bg-[var(--surface)] border border-[var(--line)]" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i}
            className="h-24 sm:h-28 rounded-[20px] bg-[var(--surface)] border border-[var(--line)] p-4 space-y-3">
            <div className="h-3 w-1/2 rounded bg-[var(--line)]" />
            <div className="h-7 w-2/3 rounded-lg bg-[var(--line)] opacity-60" />
          </div>
        ))}
      </div>
      <div className="rounded-[22px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-4">
        <div className="h-5 w-40 max-w-full rounded bg-[var(--line)]" />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 items-center">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-[var(--line)] opacity-70" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-[var(--line)]" />
              <div className="h-2 w-1/2 rounded bg-[var(--line)] opacity-60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default PageLoader;
