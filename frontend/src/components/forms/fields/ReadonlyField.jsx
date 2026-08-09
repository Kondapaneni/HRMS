import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';

export const ReadonlyField = React.memo(({
  name,
  label,
  value,
  helpText,
  className = '',
  id,
  colSpan,
  copyable = false
}) => {
  const fieldId = id || `field-${name}`;
  const displayVal = value !== null && value !== undefined && value !== '' ? String(value) : '—';

  return (
    <FieldContainer
      id={fieldId}
      label={label}
      helpText={helpText}
      colSpan={colSpan}
      readOnly={true}
      className={className}
    >
      <div className="w-full px-3 py-2 text-sm font-medium text-slate-800 bg-slate-100/70 border border-slate-200/80 rounded-lg flex items-center justify-between">
        <span className="truncate">{displayVal}</span>
        {copyable && value && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(String(value))}
            className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors px-1.5 py-0.5 rounded bg-white border border-slate-200 cursor-pointer"
          >
            Copy
          </button>
        )}
      </div>
    </FieldContainer>
  );
});

ReadonlyField.displayName = 'ReadonlyField';
