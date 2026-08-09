import React from 'react';

/**
 * FormActions layout component for primary, secondary, and draft buttons.
 */
export const FormActions = React.memo(({
  align = 'right',
  sticky = false,
  children,
  className = ''
}) => {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  }[align] || 'justify-end';

  const stickyClass = sticky 
    ? 'sticky bottom-0 z-20 bg-white/90 backdrop-blur-md p-4 border-t border-slate-200 shadow-lg' 
    : 'mt-8 pt-4 border-t border-slate-100';

  return (
    <div className={`flex flex-wrap items-center gap-3 ${alignClass} ${stickyClass} ${className}`}>
      {children}
    </div>
  );
});

FormActions.displayName = 'FormActions';
