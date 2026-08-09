import React from 'react';

/**
 * FormGrid responsive layout component.
 * Supports 1, 2, 3, 4, 6, 12 grid columns on desktop, automatically collapsing on smaller screens.
 */
export const FormGrid = React.memo(({
  columns = 2,
  gap = 4,
  children,
  className = ''
}) => {
  const getGridColsClass = (cols) => {
    switch (cols) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      case 6:
        return 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-6';
      case 12:
        return 'grid-cols-12';
      default:
        return 'grid-cols-1 sm:grid-cols-2';
    }
  };

  const getGapClass = (g) => {
    const gapMap = {
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      6: 'gap-6',
      8: 'gap-8'
    };
    return gapMap[g] || 'gap-4';
  };

  return (
    <div className={`grid ${getGridColsClass(columns)} ${getGapClass(gap)} ${className}`}>
      {children}
    </div>
  );
});

FormGrid.displayName = 'FormGrid';
