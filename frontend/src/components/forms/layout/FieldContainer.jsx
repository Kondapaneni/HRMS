import React from 'react';

/**
 * Standardized wrapper for field label, required indicator, help text, error message, and layout column span.
 * Matches exact design tokens from AddEmployeeModal.
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
  readOnly = false
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
      12: 'col-span-12'
    };
    return spanMap[span] || `col-span-12 sm:col-span-${span}`;
  };

  return (
    <div className={`flex flex-col space-y-1 ${getColSpanClass(colSpan)} ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className={`block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1 select-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <span>{label}</span>
          {required && <span className="text-red-500 font-bold" title="Required field">*</span>}
          {readOnly && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-normal ml-auto">Read-only</span>}
        </label>
      )}

      <div className="relative">
        {children}
      </div>

      {helpText && !error && (
        <p className="text-[11px] text-slate-500 leading-tight">{helpText}</p>
      )}

      {error && (
        <p className="text-[11px] font-medium text-red-600 flex items-center gap-1 mt-0.5 animate-fadeIn">
          <span>{typeof error === 'string' ? error : 'Invalid value.'}</span>
        </p>
      )}
    </div>
  );
});

FieldContainer.displayName = 'FieldContainer';
