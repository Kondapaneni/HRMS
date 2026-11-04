import React from 'react';

/**
 * FormCard layout component
 * Spec:
 *  - White/Surface card with radius 24px, padding 18px (p-[18px])
 *  - No shadow, no heavy border (subtle 1px line optional)
 *  - Title 15px / 500
 */
export const FormCard = React.memo(({
  title,
  subtitle,
  headerAction,
  footer,
  children,
  className = '',
}) => {
  return (
    <div className={`bg-[var(--surface)] text-[var(--text)] rounded-[24px] p-[18px] transition-colors border border-[var(--line)]/50 ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="pb-4 mb-4 border-b border-[var(--line)] flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-[15px] font-medium text-[var(--text)] leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[12px] text-[var(--muted)] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className="space-y-4">
        {children}
      </div>

      {footer && (
        <div className="pt-4 mt-4 border-t border-[var(--line)] flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
});

FormCard.displayName = 'FormCard';
export default FormCard;
