
import { ChevronDown } from 'lucide-react';

/**
 * FilterSelect Component
 * Spec:
 *  - 36px height, radius 10px, 1px #EFEFF1 border, 12px --muted text
 *  - Native select styling or custom dropdown
 */
export const FilterSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'All',
  className = '',
  ariaLabel,
  disabled = false,
}) => {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        className="h-[36px] pl-3 pr-7 bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)] rounded-[10px] text-[12px] font-medium appearance-none cursor-pointer focus:outline-none focus:border-[var(--brand)] transition-colors disabled:opacity-50"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const label = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val} className="text-[var(--text)]">
              {label}
            </option>
          );
        })}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--icon-muted)]"
      />
    </div>
  );
};

export default FilterSelect;

