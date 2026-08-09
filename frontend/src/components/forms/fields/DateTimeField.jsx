import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';
import { Clock } from 'lucide-react';

export const DateTimeField = React.memo(({
  name,
  label,
  value = '',
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
  min,
  max
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
        <input
          id={fieldId}
          name={name}
          type="datetime-local"
          value={value ?? ''}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          readOnly={readOnly}
          min={min}
          max={max}
          className={`w-full pl-3 pr-9 py-2 text-sm text-slate-800 bg-white border rounded-md transition-colors outline-none focus:outline-none cursor-pointer ${
            error 
              ? 'border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
              : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          } ${
            disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''
          } ${
            readOnly ? 'bg-slate-50 text-slate-600 font-medium' : ''
          }`}
        />
        <Clock size={16} className="absolute right-3 text-slate-400 pointer-events-none" />
      </div>
    </FieldContainer>
  );
});

DateTimeField.displayName = 'DateTimeField';
