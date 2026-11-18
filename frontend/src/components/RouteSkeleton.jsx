import React from 'react';

// Route chunks suspend inside the persistent navigation shell, not above it.
export default function RouteSkeleton() {
  return (
    <div role="status" aria-label="Opening page" className="w-full space-y-5 py-5 animate-pulse">
      <div className="h-7 w-52 max-w-full rounded-lg bg-[var(--line)]" />
      <div className="h-4 w-72 max-w-full rounded-lg bg-[var(--line)] opacity-70" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-[var(--surface)] border border-[var(--line)]" />)}
      </div>
      <div className="h-60 rounded-2xl bg-[var(--surface)] border border-[var(--line)]" />
    </div>
  );
}
