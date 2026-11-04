import React from 'react';

export const DescriptionField = React.memo(({ text, className = '', colSpan = 12 }) => {
  const spanMap = {
    1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4',
    6: 'col-span-6', 12: 'col-span-12',
  };

  return (
    <div className={`${spanMap[colSpan] || 'col-span-12'} text-[12px] text-[var(--muted)] leading-relaxed ${className}`}>
      {text}
    </div>
  );
});

DescriptionField.displayName = 'DescriptionField';
export default DescriptionField;
