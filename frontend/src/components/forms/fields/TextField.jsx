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
  suffix
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
          <div className="absolute left-3 text-slate-400 text-sm flex items-center pointer-events-none">
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
          className={`w-full px-4 py-2.5 md:px-3 md:py-2 border rounded-full md:rounded-md text-sm outline-none focus:outline-none transition-all ${
            prefix ? 'pl-10 md:pl-9' : ''
          } ${
            suffix ? 'pr-10 md:pr-9' : ''
          } ${
            error 
              ? 'border-red-400 focus:ring-2 focus:ring-red-100 focus:border-red-400' 
              : 'border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400'
          } ${
            disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : ''
          } ${
            readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white text-slate-800'
          }`}
        />

        {suffix && (
          <div className="absolute right-3 text-slate-400 text-sm flex items-center pointer-events-none">
            {suffix}
          </div>
        )}
      </div>
    </FieldContainer>
  );
});

TextField.displayName = 'TextField';
