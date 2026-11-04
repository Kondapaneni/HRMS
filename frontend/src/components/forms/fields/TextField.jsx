import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';

export const TextField = React.memo(({
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
  type = 'text',
  maxLength,
  minLength,
  autoComplete = 'off',
  prefix,
  suffix,
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
        {prefix && (
          <div className="absolute left-3 text-[var(--muted)] text-[13px] flex items-center pointer-events-none">
            {prefix}
          </div>
        )}
        
        <input
          id={fieldId}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          maxLength={maxLength}
          minLength={minLength}
          autoComplete={autoComplete}
          className={`w-full h-[40px] px-3.5 border rounded-[12px] text-[14px] outline-none transition-all placeholder:text-[var(--muted)]/50 ${
            prefix ? 'pl-9' : ''
          } ${
            suffix ? 'pr-9' : ''
          } ${
            error 
              ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-3 focus:ring-[var(--danger-bg)]' 
              : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-tint)]'
          } ${
            disabled || readOnly
              ? 'bg-[var(--line)]/60 text-[var(--muted)] cursor-not-allowed border-[var(--line)]'
              : 'bg-[var(--surface-alt)] text-[var(--text)]'
          }`}
        />

        {suffix && (
          <div className="absolute right-3 text-[var(--muted)] text-[13px] flex items-center pointer-events-none">
            {suffix}
          </div>
        )}
      </div>
    </FieldContainer>
  );
});

TextField.displayName = 'TextField';
export default TextField;
