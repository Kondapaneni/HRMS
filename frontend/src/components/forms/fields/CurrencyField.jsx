import React, { useState, useEffect } from 'react';
import { FieldContainer } from '../layout/FieldContainer';
import { formatCurrencyINR, parseCurrencyINR } from '../utils/formatters';

export const CurrencyField = React.memo(({
  name,
  label,
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  readOnly = false,
  placeholder = '0',
  helpText,
  error,
  className = '',
  id,
  colSpan,
  currencySymbol = '₹'
}) => {
  const fieldId = id || `field-${name}`;

  const [displayValue, setDisplayValue] = useState(() => {
    if (value === null || value === undefined || value === '') return '';
    return typeof value === 'number' ? value.toLocaleString('en-IN') : String(value);
  });

  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      if (value === null || value === undefined || value === '') {
        setDisplayValue('');
      } else {
        const num = typeof value === 'number' ? value : parseCurrencyINR(value);
        setDisplayValue(num !== null ? num.toLocaleString('en-IN') : '');
      }
    }
  }, [value, isFocused]);

  const handleChange = (e) => {
    const raw = e.target.value;
    const cleanRaw = raw.replace(/[^0-9.]/g, '');
    
    if (cleanRaw === '') {
      setDisplayValue('');
      if (onChange) onChange(null);
      return;
    }

    const parsedNum = parseCurrencyINR(cleanRaw);
    setDisplayValue(cleanRaw);

    if (onChange) {
      onChange(parsedNum);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value !== null && value !== undefined) {
      setDisplayValue(String(value));
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (value !== null && value !== undefined && typeof value === 'number') {
      setDisplayValue(value.toLocaleString('en-IN'));
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
        <div className="absolute left-3 text-slate-500 font-semibold text-sm flex items-center pointer-events-none select-none">
          {currencySymbol}
        </div>

        <input
          id={fieldId}
          name={name}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`w-full pl-8 pr-3 py-2 text-sm text-slate-800 bg-white border rounded-md transition-colors outline-none ${
            error 
              ? 'border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
              : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          } ${
            disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''
          } ${
            readOnly ? 'bg-slate-50 text-slate-600 font-medium' : ''
          }`}
        />

        {value !== null && value !== undefined && !isFocused && typeof value === 'number' && (
          <div className="absolute right-3 text-[11px] text-slate-400 font-medium pointer-events-none">
            {formatCurrencyINR(value)}
          </div>
        )}
      </div>
    </FieldContainer>
  );
});

CurrencyField.displayName = 'CurrencyField';
