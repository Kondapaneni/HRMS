import React from 'react';
import { FieldContainer } from '../layout/FieldContainer';
import StatusBadge from '../../ui/StatusBadge';

export const DisplayField = React.memo(({
  label,
  value,
  variant = 'info',
  helpText,
  className = '',
  colSpan,
}) => {
  return (
    <FieldContainer label={label} helpText={helpText} colSpan={colSpan} className={className}>
      <div className="py-1">
        <StatusBadge variant={variant} status={value || '—'} />
      </div>
    </FieldContainer>
  );
});

DisplayField.displayName = 'DisplayField';
export default DisplayField;
