import React from 'react';

/**
 * FormCard layout component matching Acme HRMS employee page card container standards.
 */
export const FormCard = React.memo(({
  title,
  subtitle,
  headerAction,
  footer,
  children,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      <div className="p-6 space-y-6">
        {children}
      </div>

      {footer && (
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
});

FormCard.displayName = 'FormCard';
