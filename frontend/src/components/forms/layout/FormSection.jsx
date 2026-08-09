import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * FormSection layout component for grouping related form fields.
 */
export const FormSection = React.memo(({
  title,
  description,
  badge,
  icon: Icon,
  collapsible = false,
  defaultOpen = true,
  children,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200 mb-6 ${className}`}>
      {(title || description) && (
        <div 
          onClick={() => collapsible && setIsOpen(!isOpen)}
          className={`px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between ${
            collapsible ? 'cursor-pointer hover:bg-slate-100/50 transition-colors' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Icon size={18} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-800">{title}</h3>
                {badge && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    {badge}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              )}
            </div>
          </div>

          {collapsible && (
            <button 
              type="button" 
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              aria-label={isOpen ? "Collapse section" : "Expand section"}
            >
              {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          )}
        </div>
      )}

      {(!collapsible || isOpen) && (
        <div className="p-6 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
});

FormSection.displayName = 'FormSection';
