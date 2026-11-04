import React from 'react';

export const HeadingField = React.memo(({ title, level = 3, className = '', colSpan = 12 }) => {
  const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : level === 4 ? 'h4' : 'h3';
  const sizeClass = {
    1: 'text-[20px] font-medium text-[var(--text)]',
    2: 'text-[18px] font-medium text-[var(--text)]',
    3: 'text-[15px] font-medium text-[var(--text)]',
    4: 'text-[14px] font-medium text-[var(--text)]',
  }[level] || 'text-[15px] font-medium text-[var(--text)]';

  const spanMap = {
    1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4',
    6: 'col-span-6', 12: 'col-span-12',
  };

  return (
    <div className={`${spanMap[colSpan] || 'col-span-12'} pt-2 pb-1.5 border-b border-[var(--line)] ${className}`}>
      <Tag className={sizeClass}>{title}</Tag>
    </div>
  );
});

HeadingField.displayName = 'HeadingField';
export default HeadingField;
