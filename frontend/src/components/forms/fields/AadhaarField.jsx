import React from 'react';
import { TextField } from './TextField';
import { digitsOnly } from '../utils/formatters';

export const AadhaarField = React.memo(({ onChange, value = '', placeholder = '1234 5678 9012', ...props }) => {
  const handleChange = (val) => {
    const clean = digitsOnly(val).slice(0, 12);
    if (onChange) {
      onChange(clean);
    }
  };

  // Format value for display with spaces every 4 digits
  const formatDisplay = (val) => {
    const clean = digitsOnly(val).slice(0, 12);
    return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  return (
    <TextField
      {...props}
      value={formatDisplay(value)}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={14}
    />
  );
});

AadhaarField.displayName = 'AadhaarField';
