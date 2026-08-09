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
          className={`w-full px-3 py-2 text-sm text-slate-800 bg-white border rounded-md transition-colors outline-none ${
            prefix ? 'pl-9' : ''
          } ${
            suffix ? 'pr-9' : ''
          } ${
            error 
              ? 'border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
              : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          } ${
            disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''
          } ${
            readOnly ? 'bg-slate-50 text-slate-600 font-medium' : ''
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
