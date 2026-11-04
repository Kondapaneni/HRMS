import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';

export const CheckboxField = React.memo(({
  name,
  label,
  value = false,
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
  checkboxLabel,
}) => {
  const fieldId = id || `field-${name}`;

  const handleChange = (e) => {
    if (disabled || readOnly) return;
    if (onChange) {
      onChange(e.target.checked);
    }
  };

  return (
    <FieldContainer
      id={fieldId}
      label={label}
      required={false}
      helpText={helpText}
      error={error}
      colSpan={colSpan}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
    >
      <label className={`flex items-start gap-2.5 cursor-pointer select-none pt-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <input
          id={fieldId}
          name={name}
          type="checkbox"
          checked={!!value}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled || readOnly}
          className={`mt-0.5 w-4 h-4 rounded-[4px] border-[var(--line)] accent-[var(--brand)] cursor-pointer transition-all ${
            error ? 'border-[var(--danger-text)]' : ''
          }`}
        />
        <span className="text-[13px] font-normal text-[var(--text-2)] leading-tight">
          {checkboxLabel || label}
          {required && <span className="text-[var(--danger-text)] font-semibold ml-1">*</span>}
        </span>
      </label>
    </FieldContainer>
  );
});

CheckboxField.displayName = 'CheckboxField';
export default CheckboxField;
