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
  currencySymbol = '₹',
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
        <div className="absolute left-3.5 text-[var(--muted)] font-medium text-[14px] flex items-center pointer-events-none select-none">
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
          className={`w-full h-[40px] pl-8 pr-4 border rounded-[12px] text-[14px] outline-none transition-all placeholder:text-[var(--muted)]/50 ${
            error 
              ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-3 focus:ring-[var(--danger-bg)]' 
              : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-tint)]'
          } ${
            disabled || readOnly
              ? 'bg-[var(--line)]/60 text-[var(--muted)] cursor-not-allowed border-[var(--line)]'
              : 'bg-[var(--surface-alt)] text-[var(--text)]'
          }`}
        />

        {value !== null && value !== undefined && !isFocused && typeof value === 'number' && (
          <div className="absolute right-3.5 text-[11px] text-[var(--muted)] font-medium pointer-events-none">
            {formatCurrencyINR(value)}
          </div>
        )}
      </div>
    </FieldContainer>
  );
});

CurrencyField.displayName = 'CurrencyField';
export default CurrencyField;
