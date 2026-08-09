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
  showCount = false
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
          className={`w-full px-3 py-2 border rounded-md text-sm outline-none focus:outline-none transition-all resize-y ${
            error 
              ? 'border-red-400 focus:ring-2 focus:ring-red-100 focus:border-red-400' 
              : 'border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400'
          } ${
            disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : ''
          } ${
            readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white text-slate-800'
          }`}
        />

        {showCount && maxLength && (
          <div className="text-[10px] text-slate-400 text-right mt-1">
            {currentLength} / {maxLength}
          </div>
        )}
      </div>
    </FieldContainer>
  );
});

TextareaField.displayName = 'TextareaField';
