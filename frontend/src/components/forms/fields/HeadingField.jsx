import React from 'react';

export const HeadingField = React.memo(({ title, level = 3, className = '', colSpan = 12 }) => {
  const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : level === 4 ? 'h4' : 'h3';
  const sizeClass = {
    1: 'text-2xl font-bold text-slate-900',
    2: 'text-xl font-bold text-slate-800',
    3: 'text-lg font-semibold text-slate-800',
    4: 'text-base font-semibold text-slate-700'
  }[level] || 'text-lg font-semibold text-slate-800';

  const spanMap = {
    1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4',
    6: 'col-span-6', 12: 'col-span-12'
  };

  return (
    <div className={`${spanMap[colSpan] || 'col-span-12'} pt-2 pb-1 border-b border-slate-100 ${className}`}>
      <Tag className={sizeClass}>{title}</Tag>
    </div>
  );
});

HeadingField.displayName = 'HeadingField';
