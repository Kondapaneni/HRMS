import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';

export const SwitchField = React.memo(({
  name,
  label,
  value = false,
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
  switchLabel
}) => {
  const fieldId = id || `field-${name}`;

  const toggle = () => {
    if (disabled || readOnly) return;
    if (onChange) {
      onChange(!value);
    }
  };

  return (
    <FieldContainer
      id={fieldId}
      label={label}
      required={false}
      helpText={helpText}
      error={error}
      colSpan={colSpan}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
    >
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          role="switch"
          aria-checked={!!value}
          onClick={toggle}
          disabled={disabled || readOnly}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-100 ${
            value ? 'bg-blue-600' : 'bg-slate-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              value ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>

        {(switchLabel || label) && (
          <span
            onClick={toggle}
            className={`text-xs font-medium text-slate-600 cursor-pointer select-none ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {switchLabel || label}
            {required && <span className="text-red-500 font-bold ml-1">*</span>}
          </span>
        )}
      </div>
    </FieldContainer>
  );
});

SwitchField.displayName = 'SwitchField';
