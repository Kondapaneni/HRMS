import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';
import { Calendar } from 'lucide-react';

export const MonthField = React.memo(({
  name,
  label,
  value = '',
  onChange,
  onBlur,
  required = false,
  disabled = false,
  readOnly = false,
  helpText,
  error,
  className = '',
  id,
  colSpan,
  min,
  max,
}) => {
  const fieldId = id || `field-${name}`;

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <FieldContainer
      id={fieldId}
      label={label}
      required={required}
      helpText={helpText}
      error={error}
      colSpan={colSpan}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
    >
      <div className="relative flex items-center w-full">
        <input
          id={fieldId}
          name={name}
          type="month"
          value={value ?? ''}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          readOnly={readOnly}
          min={min}
          max={max}
          className={`w-full h-[40px] pl-3.5 pr-9 border rounded-[12px] text-[14px] outline-none transition-all cursor-pointer ${
            error 
              ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-3 focus:ring-[var(--danger-bg)]' 
              : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-tint)]'
          } ${
            disabled || readOnly
              ? 'bg-[var(--line)]/60 text-[var(--muted)] cursor-not-allowed border-[var(--line)]'
              : 'bg-[var(--surface-alt)] text-[var(--text)]'
          }`}
        />
        <Calendar size={16} strokeWidth={1.7} className="absolute right-3 text-[var(--icon-muted)] pointer-events-none" />
      </div>
    </FieldContainer>
  );
});

MonthField.displayName = 'MonthField';
export default MonthField;
