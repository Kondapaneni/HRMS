import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ChevronDown } from 'lucide-react';
import StatusBadge from './StatusBadge';
import Button from './Button';

/**
 * DataTable Component
 * Spec:
 *  - White card (radius 24px, padding 18px)
 *  - Header row: --muted 13px, 1px #EFEFF1 border
 *  - Row height: 52px, no zebra, hover #F8F8F8, selected #EAF0FA
 *  - First column avatar support (32px rounded square)
 *  - Toolbar: search input (36px, radius 12px, #F8F8F8 fill), filter chips, actions
 *  - Footer: pagination with "Rows per page" & Prev/Next 36px buttons
 *  - Server or client pagination support (page, limit, total, onPageChange)
 */
export const DataTable = ({
  columns = [],
  data = [],
  keyField = 'id',
  isLoading = false,
  emptyMessage = 'No records found',
  emptySubtext = 'Try adjusting your filters or search term.',
  // Search & Filtering
  searchable = true,
  searchPlaceholder = 'Search...',
  searchValue: controlledSearch,
  onSearchChange: setControlledSearch,
  // Server-side pagination
  page,
  limit = 20,
  total,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50, 100],
  // Selection
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  // Toolbar additions
  toolbarLeft,
  toolbarRight,
  filterChips, // array of { id, label, active, count, onClick }
  // Row click
  onRowClick,
  className = '',
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const isControlledSearch = controlledSearch !== undefined;
  const searchTerm = isControlledSearch ? controlledSearch : internalSearch;

  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (isControlledSearch) {
      setControlledSearch?.(val);
    } else {
      setInternalSearch(val);
    }
  };

  // Client-side filtering & sorting if not server-controlled
  const isServerPagination = typeof onPageChange === 'function' && total !== undefined;

  const processedData = useMemo(() => {
    if (isServerPagination) return data;

    let res = [...data];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      res = res.filter((item) =>
        Object.values(item).some((v) => String(v || '').toLowerCase().includes(q))
      );
    }

    if (sortConfig.key) {
      res.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return res;
  }, [data, searchTerm, sortConfig, isServerPagination]);

  // Client-side pagination calculations
  const [clientPage, setClientPage] = useState(1);
  const [clientLimit, setClientLimit] = useState(limit);

  const currentPage = isServerPagination ? page || 1 : clientPage;
  const currentLimit = isServerPagination ? limit : clientLimit;
  const currentTotal = isServerPagination ? total || 0 : processedData.length;

  const totalPages = Math.max(1, Math.ceil(currentTotal / currentLimit));

  const displayRows = useMemo(() => {
    if (isServerPagination) return processedData;
    const start = (currentPage - 1) * currentLimit;
    return processedData.slice(start, start + currentLimit);
  }, [processedData, isServerPagination, currentPage, currentLimit]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (isServerPagination) {
      onPageChange(newPage);
    } else {
      setClientPage(newPage);
    }
  };

  const handleLimitChange = (newLimit) => {
    if (isServerPagination) {
      onLimitChange?.(newLimit);
    } else {
      setClientLimit(newLimit);
      setClientPage(1);
    }
  };

  const handleSort = (colKey) => {
    setSortConfig((prev) => {
      if (prev.key === colKey) {
        return { key: colKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: colKey, direction: 'asc' };
    });
  };

  const isAllSelected =
    displayRows.length > 0 &&
    displayRows.every((r) => selectedRows.includes(r[keyField]));

  return (
    <div className={`bg-[var(--surface)] rounded-[24px] p-[18px] transition-colors ${className}`}>
      {/* Toolbar */}
      {(searchable || toolbarLeft || toolbarRight || filterChips) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {searchable && (
              <div className="relative w-full sm:w-64">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--icon-muted)]"
                  strokeWidth={1.7}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder={searchPlaceholder}
                  className="w-full h-[36px] pl-9 pr-3 text-[13px] bg-[var(--surface-alt)] text-[var(--text)] rounded-[12px] border border-[var(--line)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-tint)] transition-all"
                />
              </div>
            )}
            {filterChips?.map((chip) => (
              <button
                key={chip.id || chip.label}
                type="button"
                onClick={chip.onClick}
                className={`h-[36px] px-3.5 rounded-full text-[12px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  chip.active
                    ? 'bg-[var(--ink)] text-white dark:bg-white dark:text-[#131315]'
                    : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)]'
                }`}
              >
                <span>{chip.label}</span>
                {chip.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      chip.active
                        ? 'bg-white/20 text-white dark:bg-black/10 dark:text-[#131315]'
                        : 'bg-[var(--line)] text-[var(--muted)]'
                    }`}
                  >
                    {chip.count}
                  </span>
                )}
              </button>
            ))}
            {toolbarLeft}
          </div>
          {toolbarRight && (
            <div className="flex items-center gap-2 shrink-0">{toolbarRight}</div>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto -mx-[18px] px-[18px]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {onSelectAll && (
                <th className="py-2.5 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded-[4px] border-[var(--line)] accent-[var(--brand)] cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key || col.accessor}
                  onClick={() => col.sortable && handleSort(col.key || col.accessor)}
                  className={`py-3 px-3 text-[13px] font-normal text-[var(--muted)] select-none whitespace-nowrap ${
                    col.sortable ? 'cursor-pointer hover:text-[var(--text)]' : ''
                  } ${col.headerClassName || ''}`}
                  style={{ width: col.width }}
                >
                  <div className="inline-flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ArrowUpDown size={12} className="text-[var(--icon-muted)]" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: Math.min(5, currentLimit) }).map((_, rIdx) => (
                <tr key={rIdx} className="h-[52px] border-b border-[var(--line)]">
                  {onSelectAll && (
                    <td className="px-3">
                      <div className="w-4 h-4 bg-[var(--line)] rounded-[4px] animate-pulse" />
                    </td>
                  )}
                  {columns.map((c, cIdx) => (
                    <td key={cIdx} className="px-3">
                      <div className="h-4 bg-[var(--line)] rounded-[6px] animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onSelectAll ? 1 : 0)}
                  className="py-12 text-center"
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <p className="text-[13px] font-medium text-[var(--text)]">{emptyMessage}</p>
                    <p className="text-[12px] text-[var(--muted)] mt-1 max-w-xs">{emptySubtext}</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayRows.map((row, rIdx) => {
                const rowKey = row[keyField] ?? rIdx;
                const isSelected = selectedRows.includes(rowKey);

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(row)}
                    className={`h-[52px] border-b border-[var(--line)] transition-colors ${
                      isSelected
                        ? 'bg-[var(--brand-tint)]'
                        : 'hover:bg-[var(--surface-alt)]'
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {onSelectAll && (
                      <td
                        className="py-2.5 px-3 w-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectRow?.(rowKey, e.target.checked)}
                          className="w-4 h-4 rounded-[4px] border-[var(--line)] accent-[var(--brand)] cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const colKey = col.key || col.accessor;
                      const cellValue = row[colKey];

                      return (
                        <td
                          key={colKey}
                          className={`py-2 px-3 text-[13px] text-[var(--text)] whitespace-nowrap ${
                            col.className || ''
                          }`}
                        >
                          {col.render ? col.render(cellValue, row, rIdx) : cellValue ?? '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      {currentTotal > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-2 border-t border-[var(--line)] text-[12px] text-[var(--muted)]">
          <div className="flex items-center gap-3">
            <span>
              Showing{' '}
              <strong className="text-[var(--text)] font-medium">
                {Math.min(currentTotal, (currentPage - 1) * currentLimit + 1)}
              </strong>{' '}
              to{' '}
              <strong className="text-[var(--text)] font-medium">
                {Math.min(currentTotal, currentPage * currentLimit)}
              </strong>{' '}
              of <strong className="text-[var(--text)] font-medium">{currentTotal}</strong> results
            </span>

            {/* Page Size Select */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-[var(--line)]">
              <span>Rows per page:</span>
              <select
                value={currentLimit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="h-[28px] px-2 text-[12px] bg-[var(--surface-alt)] border border-[var(--line)] rounded-[8px] text-[var(--text)] focus:outline-none focus:border-[var(--brand)] cursor-pointer"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prev / Next Page Buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-[12px] mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => handlePageChange(currentPage - 1)}
              className="h-[32px] w-[32px] p-0 rounded-[8px]"
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} strokeWidth={1.7} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => handlePageChange(currentPage + 1)}
              className="h-[32px] w-[32px] p-0 rounded-[8px]"
              aria-label="Next Page"
            >
              <ChevronRight size={16} strokeWidth={1.7} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;

