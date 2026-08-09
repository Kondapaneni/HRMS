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
          className={`w-full pl-3 pr-9 py-2 text-sm text-slate-800 bg-white border rounded-md transition-colors outline-none appearance-none cursor-pointer ${
            error 
              ? 'border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
              : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          } ${
            disabled || loading ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''
          } ${
            readOnly ? 'bg-slate-50 text-slate-600 pointer-events-none' : ''
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

        <div className="absolute right-3 pointer-events-none text-slate-400 flex items-center">
          {loading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <ChevronDown size={16} />}
        </div>
      </div>
    </FieldContainer>
  );
});

SelectField.displayName = 'SelectField';
