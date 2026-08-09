import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';

export const DisplayField = React.memo(({
  label,
  value,
  badgeColor = 'blue',
  helpText,
  className = '',
  colSpan
}) => {
  return (
    <FieldContainer label={label} helpText={helpText} colSpan={colSpan} className={className}>
      <div className="py-1">
        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg bg-${badgeColor}-50 text-${badgeColor}-700 border border-${badgeColor}-200`}>
          {value || '—'}
        </span>
      </div>
    </FieldContainer>
  );
});

DisplayField.displayName = 'DisplayField';
