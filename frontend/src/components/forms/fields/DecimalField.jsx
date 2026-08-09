import React, { useState, useEffect } from 'react';
import { FieldContainer } from '../layout/FieldContainer';

export const DecimalField = React.memo(({
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
  min,
  max,
  decimalPlaces = 2,
  prefix,
  suffix
}) => {
  const fieldId = id || `field-${name}`;
  const [displayValue, setDisplayValue] = useState(value !== null && value !== undefined ? String(value) : '');

  useEffect(() => {
    setDisplayValue(value !== null && value !== undefined ? String(value) : '');
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setDisplayValue(raw);

    if (raw === '' || raw === '-') {
      if (onChange) onChange(null);
      return;
    }

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      if (onChange) onChange(parsed);
    }
  };

  const handleBlur = (e) => {
    if (displayValue && !isNaN(parseFloat(displayValue))) {
      const fixed = parseFloat(displayValue).toFixed(decimalPlaces);
      setDisplayValue(fixed);
      if (onChange) onChange(parseFloat(fixed));
    }
    if (onBlur) onBlur(e);
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
          type="number"
          step="any"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          min={min}
          max={max}
          className={`w-full px-3 py-2 text-sm text-slate-800 bg-white border rounded-md transition-colors outline-none ${
            prefix ? 'pl-8' : ''
          } ${
            suffix ? 'pr-8' : ''
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

DecimalField.displayName = 'DecimalField';
