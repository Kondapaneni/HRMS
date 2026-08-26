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
          className={`w-full px-4 py-2.5 md:px-3 md:py-2 border rounded-full md:rounded-md text-sm outline-none focus:outline-none transition-all ${
            prefix ? 'pl-10 md:pl-8' : ''
          } ${
            suffix ? 'pr-10 md:pr-8' : ''
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

DecimalField.displayName = 'DecimalField';
