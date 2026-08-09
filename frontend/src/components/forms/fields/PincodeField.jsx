import React from 'react';
import { TextField } from './TextField';
import { digitsOnly } from '../utils/formatters';

export const PincodeField = React.memo(({ onChange, value = '', placeholder = '500001', ...props }) => {
  const handleChange = (val) => {
    const clean = digitsOnly(val).slice(0, 6);
    if (onChange) {
      onChange(clean);
    }
  };

  return (
    <TextField
      {...props}
      type="tel"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={6}
    />
  );
});

PincodeField.displayName = 'PincodeField';
