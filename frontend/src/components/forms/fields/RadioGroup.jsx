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
      return {
        label: opt.label ?? String(opt.value),
        value: opt.value,
        disabled: Boolean(opt.disabled)
      };
    }
    return { label: String(opt), value: opt, disabled: false };
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
          const isOptDisabled = disabled || opt.disabled;

          return (
            <label
              key={`${opt.value}-${idx}`}
              htmlFor={radioId}
              className={`flex items-center gap-2 text-xs font-medium select-none ${
                isOptDisabled
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'text-slate-600 hover:text-slate-900 cursor-pointer'
              }`}
            >
              <input
                id={radioId}
                type="radio"
                name={groupName}
                value={opt.value}
                checked={isSelected}
                onChange={() => {
                  if (!isOptDisabled) {
                    handleChange(opt.value);
                  }
                }}
                onBlur={onBlur}
                disabled={isOptDisabled || readOnly}
                className={`w-4 h-4 text-blue-600 border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all ${
                  isOptDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
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
