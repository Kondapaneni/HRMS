import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * FormSection layout component for grouping related form fields.
 * Spec:
 *  - FormSection titles are 15px / 500 with a 1px #EFEFF1 divider
 *  - Card background surface, radius 24px, padding 18px
 */
export const FormSection = React.memo(({
  title,
  description,
  badge,
  icon: Icon,
  collapsible = false,
  defaultOpen = true,
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-[var(--surface)] text-[var(--text)] rounded-[24px] p-[18px] border border-[var(--line)]/50 transition-colors mb-4 ${className}`}>
      {(title || description) && (
        <div 
          onClick={() => collapsible && setIsOpen(!isOpen)}
          className={`pb-3.5 mb-4 border-b border-[var(--line)] flex items-center justify-between ${
            collapsible ? 'cursor-pointer select-none' : ''
          }`}
        >
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                <Icon size={16} strokeWidth={1.7} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-medium text-[var(--text)] leading-snug">{title}</h3>
                {badge && (
                  <span className="px-2 py-0.5 text-[11px] font-medium bg-[var(--brand-tint)] text-[var(--brand-deep)] rounded-[7px]">
                    {badge}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-[12px] text-[var(--muted)] mt-0.5">{description}</p>
              )}
            </div>
          </div>

          {collapsible && (
            <button 
              type="button" 
              className="text-[var(--icon-muted)] hover:text-[var(--text)] transition-colors p-1 rounded-full cursor-pointer"
              aria-label={isOpen ? "Collapse section" : "Expand section"}
            >
              {isOpen ? <ChevronUp size={18} strokeWidth={1.7} /> : <ChevronDown size={18} strokeWidth={1.7} />}
            </button>
          )}
        </div>
      )}

      {(!collapsible || isOpen) && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
});

FormSection.displayName = 'FormSection';
export default FormSection;
