import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';

export const RadioGroup = React.memo(({
  name,
  label,
  value,
  onChange,
  onBlur,
  options = [],
  required = false,
  disabled = false,
  readOnly = false,
  helpText,
  error,
  className = '',
  id,
  colSpan,
  direction = 'horizontal' // 'horizontal' | 'vertical'
}) => {
  const groupName = name || id;

  const handleChange = (optValue) => {
    if (disabled || readOnly) return;
    if (onChange) {
      onChange(optValue);
    }
  };

  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { label: opt.label ?? String(opt.value), value: opt.value };
    }
    return { label: String(opt), value: opt };
  });

  return (
    <FieldContainer
      id={groupName}
      label={label}
      required={required}
      helpText={helpText}
      error={error}
      colSpan={colSpan}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
    >
      <div className={`flex ${direction === 'vertical' ? 'flex-col space-y-2' : 'flex-wrap gap-4'} pt-1`}>
        {normalizedOptions.map((opt, idx) => {
          const isSelected = value === opt.value;
          const radioId = `${groupName}-${opt.value}-${idx}`;

          return (
            <label
              key={`${opt.value}-${idx}`}
              htmlFor={radioId}
              className={`flex items-center gap-2 text-xs font-medium cursor-pointer select-none ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <input
                id={radioId}
                type="radio"
                name={groupName}
                value={opt.value}
                checked={isSelected}
                onChange={() => handleChange(opt.value)}
                onBlur={onBlur}
                disabled={disabled || readOnly}
                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </FieldContainer>
  );
});

RadioGroup.displayName = 'RadioGroup';
