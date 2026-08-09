import React from 'react';
import { TextField } from './TextField';
import { digitsOnly } from '../utils/formatters';

export const BankAccountField = React.memo(({ onChange, value = '', placeholder = 'Enter Bank Account Number', ...props }) => {
  const handleChange = (val) => {
    const clean = digitsOnly(val).slice(0, 18);
    if (onChange) {
      onChange(clean);
    }
  };

  return (
    <TextField
      {...props}
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={18}
    />
  );
});

BankAccountField.displayName = 'BankAccountField';
