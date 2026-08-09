import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';

export const PercentageField = React.memo(({
  name,
  label,
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  readOnly = false,
  placeholder = '0.00',
  helpText,
  error,
  className = '',
  id,
  colSpan,
  min = 0,
  max = 100,
  step = 0.01
}) => {
  const fieldId = id || `field-${name}`;

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      if (onChange) onChange(null);
      return;
    }
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      if (onChange) onChange(num);
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
          type="number"
          step={step}
          min={min}
          max={max}
          value={value ?? ''}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`w-full pl-3 pr-8 py-2 border rounded-md text-sm outline-none focus:outline-none transition-all ${
            error 
              ? 'border-red-400 focus:ring-2 focus:ring-red-100 focus:border-red-400' 
              : 'border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400'
          } ${
            disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : ''
          } ${
            readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white text-slate-800'
          }`}
        />

        <div className="absolute right-3 text-slate-500 font-semibold text-sm pointer-events-none select-none">
          %
        </div>
      </div>
    </FieldContainer>
  );
});

PercentageField.displayName = 'PercentageField';
