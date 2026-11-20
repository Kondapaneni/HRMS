import React from 'react';

/** Bounded server-side pagination shared across HRMS directory screens. */
export default function PaginationControls({ page, limit, total, onPageChange, isFetching = false, compact = false }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = Math.ceil(safeTotal / limit);
  if (totalPages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, safeTotal);
  return (
    <nav
      className={compact
        ? 'flex flex-nowrap items-center justify-between gap-2 overflow-x-auto whitespace-nowrap border-t border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-xs text-[var(--text)]'
        : 'flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--surface)] p-4 text-xs text-[var(--text)]'}
      aria-label="Directory pagination"
    >
      <span className={compact ? 'shrink-0 whitespace-nowrap' : ''} aria-live="polite">
        {compact
          ? `Showing ${start}–${end} / ${safeTotal.toLocaleString('en-IN')}`
          : `Showing ${start}–${end} of ${safeTotal.toLocaleString('en-IN')} records`}
      </span>
      <div className={compact ? 'flex shrink-0 items-center gap-1.5 whitespace-nowrap' : 'flex items-center gap-2'}>
        <button type="button"
          className={`rounded-full border border-[var(--line)] py-2 disabled:opacity-40 ${compact ? 'px-2.5 cursor-pointer transition-all duration-150 hover:bg-[var(--surface-alt)] hover:border-[var(--muted)] active:scale-95 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[var(--line)] disabled:active:scale-100' : 'px-3'}`}
          disabled={page <= 1 || isFetching} onClick={() => onPageChange(Math.max(1, page - 1))}>
          Previous
        </button>
        <span aria-live="polite">Page {page} of {totalPages}</span>
        <button type="button"
          className={`rounded-full border border-[var(--line)] py-2 disabled:opacity-40 ${compact ? 'px-2.5 cursor-pointer transition-all duration-150 hover:bg-[var(--surface-alt)] hover:border-[var(--muted)] active:scale-95 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[var(--line)] disabled:active:scale-100' : 'px-3'}`}
          disabled={page >= totalPages || isFetching} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
          Next
        </button>
      </div>
    </nav>
  );
}
