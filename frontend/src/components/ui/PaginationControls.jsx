import React from 'react';

/** Bounded server-side pagination shared across HRMS directory screens. */
export default function PaginationControls({ page, limit, total, onPageChange, isFetching = false }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = Math.ceil(safeTotal / limit);
  if (totalPages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, safeTotal);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--surface)] p-4 text-xs text-[var(--text)]" aria-label="Directory pagination">
      <span aria-live="polite">Showing {start}–{end} of {safeTotal.toLocaleString('en-IN')} records</span>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-full border border-[var(--line)] px-3 py-2 disabled:opacity-40"
          disabled={page <= 1 || isFetching} onClick={() => onPageChange(Math.max(1, page - 1))}>
          Previous
        </button>
        <span aria-live="polite">Page {page} of {totalPages}</span>
        <button type="button" className="rounded-full border border-[var(--line)] px-3 py-2 disabled:opacity-40"
          disabled={page >= totalPages || isFetching} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
          Next
        </button>
      </div>
    </nav>
  );
}
