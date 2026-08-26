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
  loading = false
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
          className={`w-full pl-4 pr-10 py-2.5 md:pl-3 md:pr-9 md:py-2 border rounded-full md:rounded-md text-sm outline-none focus:outline-none transition-all appearance-none cursor-pointer ${
            error 
              ? 'border-red-400 focus:ring-2 focus:ring-red-100 focus:border-red-400' 
              : 'border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400'
          } ${
            disabled || loading ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : ''
          } ${
            readOnly ? 'bg-slate-100 text-slate-500 pointer-events-none' : 'bg-white text-slate-800'
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

        <div className="absolute right-3.5 md:right-3 pointer-events-none text-slate-400 flex items-center">
          {loading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <ChevronDown size={16} />}
        </div>
      </div>
    </FieldContainer>
  );
});

SelectField.displayName = 'SelectField';
