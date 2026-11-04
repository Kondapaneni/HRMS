import React, { useState, useRef, useEffect } from 'react';
import { FieldContainer } from '../layout/FieldContainer';
import { X, ChevronDown, Check, Search } from 'lucide-react';

export const MultiSelectField = React.memo(({
  name,
  label,
  value = [],
  onChange,
  onBlur,
  options = [],
  required = false,
  disabled = false,
  readOnly = false,
  placeholder = 'Select options...',
  helpText,
  error,
  className = '',
  id,
  colSpan,
}) => {
  const fieldId = id || `field-${name}`;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  const selectedValues = Array.isArray(value) ? value : [];

  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { label: opt.label ?? String(opt.value), value: opt.value };
    }
    return { label: String(opt), value: opt };
  });

  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (val) => {
    if (disabled || readOnly) return;
    let next;
    if (selectedValues.includes(val)) {
      next = selectedValues.filter((v) => v !== val);
    } else {
      next = [...selectedValues, val];
    }
    if (onChange) onChange(next);
  };

  const removeValue = (e, val) => {
    e.stopPropagation();
    if (disabled || readOnly) return;
    const next = selectedValues.filter((v) => v !== val);
    if (onChange) onChange(next);
  };

  const clearAll = (e) => {
    e.stopPropagation();
    if (disabled || readOnly) return;
    if (onChange) onChange([]);
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
      <div ref={containerRef} className="relative w-full">
        <div
          tabIndex={disabled || readOnly ? -1 : 0}
          onClick={() => !disabled && !readOnly && setIsOpen(!isOpen)}
          className={`w-full min-h-[40px] px-3 py-1.5 text-[14px] bg-[var(--surface-alt)] border rounded-[12px] transition-all flex items-center justify-between gap-2 cursor-pointer outline-none ${
            error
              ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-3 focus:ring-[var(--danger-bg)]'
              : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-tint)]'
          } ${
            disabled || readOnly ? 'bg-[var(--line)]/60 text-[var(--muted)] cursor-not-allowed border-[var(--line)]' : 'text-[var(--text)]'
          }`}
        >
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {selectedValues.length === 0 ? (
              <span className="text-[var(--muted)]/50 select-none">{placeholder}</span>
            ) : (
              selectedValues.map((val) => {
                const opt = normalizedOptions.find((o) => o.value === val);
                return (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[12px] font-medium bg-[var(--brand-tint)] text-[var(--brand-deep)] rounded-[9px]"
                  >
                    <span>{opt ? opt.label : val}</span>
                    {!disabled && !readOnly && (
                      <button
                        type="button"
                        onClick={(e) => removeValue(e, val)}
                        className="hover:text-[var(--text)] cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-1 text-[var(--icon-muted)]">
            {selectedValues.length > 0 && !disabled && !readOnly && (
              <button
                type="button"
                onClick={clearAll}
                className="hover:text-[var(--text)] p-0.5 cursor-pointer"
                title="Clear all"
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown size={16} strokeWidth={1.7} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--line)] rounded-[14px] shadow-[var(--shadow-modal)] overflow-hidden">
            <div className="p-2 border-b border-[var(--line)] flex items-center gap-2 bg-[var(--surface-alt)]">
              <Search size={14} className="text-[var(--icon-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-[13px] bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--muted)]/50"
                autoFocus
              />
            </div>

            <div className="max-h-48 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-[12px] text-[var(--muted)] text-center">No matching options</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedValues.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleOption(opt.value)}
                      className={`flex items-center justify-between px-3 py-2 text-[13px] rounded-[10px] cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)] font-medium'
                          : 'text-[var(--text)] hover:bg-[var(--surface-alt)]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={14} className="text-[var(--brand-deep)]" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </FieldContainer>
  );
});

MultiSelectField.displayName = 'MultiSelectField';
export default MultiSelectField;
