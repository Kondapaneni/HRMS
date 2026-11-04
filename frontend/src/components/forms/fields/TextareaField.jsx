import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';

export const TextareaField = React.memo(({
  name,
  label,
  value = '',
  onChange,
  onBlur,
  required = false,
  disabled = false,
  readOnly = false,
  placeholder = '',
  helpText,
  error,
  className = '',
  id,
  colSpan,
  rows = 3,
  maxLength,
  showCount = false,
}) => {
  const fieldId = id || `field-${name}`;
  const currentLength = (value || '').length;

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
      <div className="relative w-full">
        <textarea
          id={fieldId}
          name={name}
          rows={rows}
          value={value ?? ''}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full p-3 border rounded-[12px] text-[14px] outline-none transition-all resize-y placeholder:text-[var(--muted)]/50 ${
            error 
              ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-3 focus:ring-[var(--danger-bg)]' 
              : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-tint)]'
          } ${
            disabled || readOnly
              ? 'bg-[var(--line)]/60 text-[var(--muted)] cursor-not-allowed border-[var(--line)]'
              : 'bg-[var(--surface-alt)] text-[var(--text)]'
          }`}
        />

        {showCount && maxLength && (
          <div className="text-[11px] text-[var(--muted)] text-right mt-1">
            {currentLength} / {maxLength}
          </div>
        )}
      </div>
    </FieldContainer>
  );
});

TextareaField.displayName = 'TextareaField';
export default TextareaField;
