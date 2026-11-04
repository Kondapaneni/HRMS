import React from 'react';

/**
 * Standardized wrapper for field label, required indicator, help text, error message, and layout column span.
 * Spec:
 *  - Label above in 13px --muted
 *  - Error in 12px #D64550 (--danger-text)
 *  - Help text in 12px --muted
 */
export const FieldContainer = React.memo(({
  id,
  label,
  required,
  helpText,
  error,
  children,
  className = '',
  colSpan,
  disabled = false,
  readOnly = false,
}) => {
  // Compute column span utility if specified (1 to 12)
  const getColSpanClass = (span) => {
    if (!span) return '';
    const spanMap = {
      1: 'col-span-12 sm:col-span-1',
      2: 'col-span-12 sm:col-span-2',
      3: 'col-span-12 sm:col-span-3',
      4: 'col-span-12 sm:col-span-4',
      6: 'col-span-12 sm:col-span-6',
      8: 'col-span-12 sm:col-span-8',
      9: 'col-span-12 sm:col-span-9',
      12: 'col-span-12',
    };
    return spanMap[span] || `col-span-12 sm:col-span-${span}`;
  };

  return (
    <div className={`flex flex-col ${getColSpanClass(colSpan)} ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className={`block text-[13px] font-normal text-[var(--muted)] mb-1.5 flex items-center gap-1 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>{label}</span>
          {required && <span className="text-[var(--danger-text)] font-semibold" title="Required field">*</span>}
          {readOnly && (
            <span className="text-[10px] bg-[var(--surface-alt)] text-[var(--muted)] px-1.5 py-0.5 rounded-[6px] font-normal ml-auto border border-[var(--line)]">
              Read-only
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {children}
      </div>

      {helpText && !error && (
        <p className="text-[12px] text-[var(--muted)] mt-1 leading-tight">{helpText}</p>
      )}

      {error && (
        <p className="text-[12px] font-medium text-[var(--danger-text)] flex items-center gap-1 mt-1">
          <span>{typeof error === 'string' ? error : 'Invalid value.'}</span>
        </p>
      )}
    </div>
  );
});

FieldContainer.displayName = 'FieldContainer';
export default FieldContainer;
