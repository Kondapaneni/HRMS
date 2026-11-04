import React from 'react';

/**
 * FormActions layout component
 * Spec:
 *  - Sticky bottom bar on mobile (surface bg, top border #EFEFF1, primary button #131315)
 */
export const FormActions = React.memo(({
  align = 'right',
  sticky = false,
  children,
  className = '',
}) => {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  }[align] || 'justify-end';

  const stickyClass = sticky 
    ? 'sticky bottom-0 z-20 bg-[var(--surface)]/95 backdrop-blur-md p-4 border-t border-[var(--line)]' 
    : 'mt-6 pt-4 border-t border-[var(--line)]';

  return (
    <div className={`flex flex-wrap items-center gap-3 ${alignClass} ${stickyClass} ${className}`}>
      {children}
    </div>
  );
});

FormActions.displayName = 'FormActions';
export default FormActions;
