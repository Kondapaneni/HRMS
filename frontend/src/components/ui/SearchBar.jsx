import React from 'react';
import { Search, Loader2, X } from 'lucide-react';

/**
 * Reusable SearchBar Component
 * Based on the design tokens and layout of AdminDirectory search pill:
 * - Capsule rounded-full shape
 * - Left search icon (or spinner when loading / isFetching)
 * - Optional clear button when onClear is supplied and value is present
 * - Accessible and fully theme-variable styled
 */
export const SearchBar = React.forwardRef(({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  loading = false,
  isFetching = false,
  disabled = false,
  wrapperClassName = '',
  containerClassName = '',
  inputClassName = '',
  className = '',
  type = 'search',
  ...props
}, ref) => {
  // Only show the spinner when there is an active search term driving the fetch.
  // Background refetches triggered by navigation (refetchOnMount) must not show
  // the spinner on an otherwise idle, empty search bar.
  const isLoading = (loading || isFetching) && Boolean(value);
  const wrapperClass = wrapperClassName || containerClassName;
  const hasClear = Boolean(onClear && value);

  return (
    <div className={`relative ${wrapperClass ? wrapperClass : 'w-full'}`}>
      {isLoading ? (
        <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-deep)] animate-spin pointer-events-none" />
      ) : (
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
      )}
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pl-10 ${hasClear ? 'pr-9' : 'pr-4'} py-2 text-xs bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-full text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all ${inputClassName || className}`}
        {...props}
      />
      {hasClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] p-0.5 rounded-full transition-colors cursor-pointer"
          title="Clear search"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;

