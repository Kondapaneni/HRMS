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
  copyable = false,
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
      <div className="w-full h-[40px] px-3.5 text-[14px] font-medium text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] flex items-center justify-between">
        <span className="truncate">{displayVal}</span>
        {copyable && value && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(String(value))}
            className="text-[11px] font-medium text-[var(--brand-deep)] hover:underline transition-colors px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--line)] cursor-pointer"
          >
            Copy
          </button>
        )}
      </div>
    </FieldContainer>
  );
});

ReadonlyField.displayName = 'ReadonlyField';
export default ReadonlyField;
