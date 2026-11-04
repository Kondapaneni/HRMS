import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Input Component
 * Spec:
 *  - #F8F8F8 fill, 1px #EFEFF1 border, radius 12px, height 40px (36px for sm)
 *  - Label above in 13px --muted
 *  - Focus: border #8AADDB + 3px #EAF0FA ring
 *  - Error: border #D64550 with 12px #D64550 message
 */
export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  size = 'md', // 'sm' (36px) | 'md' (40px)
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  wrapperClassName = '',
  disabled = false,
  required = false,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const heightClass = size === 'sm' ? 'h-[36px] text-[13px]' : 'h-[40px] text-[14px]';

  return (
    <div className={`w-full flex flex-col ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-normal text-[var(--muted)] mb-1.5 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[var(--danger-text)] ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative w-full">
        {LeftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--icon-muted)] pointer-events-none">
            <LeftIcon size={16} strokeWidth={1.7} />
          </div>
        )}

        <input
          id={inputId}
          ref={ref}
          disabled={disabled}
          className={`w-full ${heightClass} bg-[var(--surface-alt)] text-[var(--text)] border rounded-[12px] px-3 transition-all placeholder:text-[var(--muted)]/60 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            LeftIcon ? 'pl-9' : ''
          } ${RightIcon || error ? 'pr-9' : ''} ${
            error
              ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-3 focus:ring-[var(--danger-bg)]'
              : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-tint)]'
          } ${className}`}
          {...props}
        />

        {error ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--danger-text)] pointer-events-none">
            <AlertCircle size={16} />
          </div>
        ) : RightIcon ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--icon-muted)] pointer-events-none">
            <RightIcon size={16} strokeWidth={1.7} />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-[12px] text-[var(--danger-text)] mt-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[12px] text-[var(--muted)] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});
Input.displayName = 'Input';

/**
 * Select Component
 */
export const Select = React.forwardRef(({
  label,
  error,
  helperText,
  size = 'md',
  children,
  options = [],
  className = '',
  wrapperClassName = '',
  disabled = false,
  required = false,
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const heightClass = size === 'sm' ? 'h-[36px] text-[13px]' : 'h-[40px] text-[14px]';

  return (
    <div className={`w-full flex flex-col ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-[13px] font-normal text-[var(--muted)] mb-1.5 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[var(--danger-text)] ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative w-full">
        <select
          id={selectId}
          ref={ref}
          disabled={disabled}
          className={`w-full ${heightClass} bg-[var(--surface-alt)] text-[var(--text)] border rounded-[12px] px-3 pr-8 transition-all appearance-none cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-3 focus:ring-[var(--danger-bg)]'
              : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-tint)]'
          } ${className}`}
          {...props}
        >
          {children ||
            options.map((opt) => (
              <option key={opt.value ?? opt} value={opt.value ?? opt}>
                {opt.label ?? opt}
              </option>
            ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--icon-muted)] text-[10px]">
          ▼
        </div>
      </div>

      {error ? (
        <p className="text-[12px] text-[var(--danger-text)] mt-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[12px] text-[var(--muted)] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});
Select.displayName = 'Select';

/**
 * Textarea Component
 */
export const Textarea = React.forwardRef(({
  label,
  error,
  helperText,
  rows = 3,
  className = '',
  wrapperClassName = '',
  disabled = false,
  required = false,
  id,
  ...props
}, ref) => {
  const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`w-full flex flex-col ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="text-[13px] font-normal text-[var(--muted)] mb-1.5 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[var(--danger-text)] ml-1">*</span>}
          </span>
        </label>
      )}

      <textarea
        id={textareaId}
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`w-full bg-[var(--surface-alt)] text-[var(--text)] border rounded-[12px] p-3 text-[14px] transition-all placeholder:text-[var(--muted)]/60 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-y ${
          error
            ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-3 focus:ring-[var(--danger-bg)]'
            : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-tint)]'
        } ${className}`}
        {...props}
      />

      {error ? (
        <p className="text-[12px] text-[var(--danger-text)] mt-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[12px] text-[var(--muted)] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});
Textarea.displayName = 'Textarea';

export default Input;

