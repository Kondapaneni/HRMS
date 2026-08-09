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
          className={`w-full px-3 py-2 text-sm text-slate-800 bg-white border rounded-md transition-colors outline-none resize-y ${
            error 
              ? 'border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
              : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          } ${
            disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''
          } ${
            readOnly ? 'bg-slate-50 text-slate-600 font-medium' : ''
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
