import React from 'react';

/**
 * FormRow component for horizontal inline layout of inputs or elements.
 */
export const FormRow = React.memo(({
  align = 'center',
  children,
  className = ''
}) => {
  const alignClass = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  }[align] || 'items-center';

  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${alignClass} ${className}`}>
      {children}
    </div>
  );
});

FormRow.displayName = 'FormRow';
