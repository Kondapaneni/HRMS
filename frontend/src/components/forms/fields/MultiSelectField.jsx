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
  colSpan
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
          className={`w-full min-h-[38px] px-3 py-1.5 text-sm bg-white border rounded-md transition-colors flex items-center justify-between gap-2 cursor-pointer outline-none focus:outline-none ${
            error
              ? 'border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          } ${
            disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''
          } ${
            readOnly ? 'bg-slate-50 text-slate-600 pointer-events-none' : ''
          }`}
        >
          <div className="flex flex-wrap items-center gap-1 flex-1">
            {selectedValues.length === 0 ? (
              <span className="text-slate-400 select-none">{placeholder}</span>
            ) : (
              selectedValues.map((val) => {
                const opt = normalizedOptions.find((o) => o.value === val);
                return (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md"
                  >
                    <span>{opt ? opt.label : val}</span>
                    {!disabled && !readOnly && (
                      <button
                        type="button"
                        onClick={(e) => removeValue(e, val)}
                        className="hover:text-blue-900 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            {selectedValues.length > 0 && !disabled && !readOnly && (
              <button
                type="button"
                onClick={clearAll}
                className="hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear all"
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden animate-fadeIn">
            <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-transparent outline-none text-slate-700"
                autoFocus
              />
            </div>

            <div className="max-h-48 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">No matching options</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedValues.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleOption(opt.value)}
                      className={`flex items-center justify-between px-3 py-2 text-xs rounded-md cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={14} className="text-blue-600" />}
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
