import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';
import { ChevronDown, Loader2 } from 'lucide-react';

export const SelectField = React.memo(({
  name,
  label,
  value = '',
  onChange,
  onBlur,
  options = [],
  required = false,
  disabled = false,
  readOnly = false,
  placeholder = 'Select option...',
  helpText,
  error,
  className = '',
  id,
  colSpan,
  loading = false,
}) => {
  const fieldId = id || `field-${name}`;

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { label: opt.label ?? opt.name ?? String(opt.value), value: opt.value };
    }
    return { label: String(opt), value: opt };
  });

  return (
    <FieldContainer
      id={fieldId}
      label={label}
      required={required}
      helpText={helpText}
      error={error}
      colSpan={colSpan}
      disabled={disabled || loading}
      readOnly={readOnly}
      className={className}
    >
      <div className="relative flex items-center w-full">
        <select
          id={fieldId}
          name={name}
          value={value ?? ''}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled || loading}
          aria-readonly={readOnly}
          className={`w-full h-[40px] pl-3.5 pr-9 border rounded-[12px] text-[14px] outline-none transition-all appearance-none cursor-pointer ${
            error 
              ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-3 focus:ring-[var(--danger-bg)]' 
              : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-tint)]'
          } ${
            disabled || loading || readOnly
              ? 'bg-[var(--line)]/60 text-[var(--muted)] cursor-not-allowed border-[var(--line)]'
              : 'bg-[var(--surface-alt)] text-[var(--text)]'
          }`}
        >
          {placeholder && (
            <option value="" disabled hidden={required && !!value}>
              {placeholder}
            </option>
          )}
          {normalizedOptions.map((opt, idx) => (
            <option key={`${opt.value}-${idx}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3 pointer-events-none text-[var(--icon-muted)] flex items-center">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-[var(--brand-deep)]" />
          ) : (
            <ChevronDown size={16} strokeWidth={1.7} />
          )}
        </div>
      </div>
    </FieldContainer>
  );
});

SelectField.displayName = 'SelectField';
export default SelectField;
