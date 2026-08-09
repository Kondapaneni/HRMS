import React from 'react';
import { TextField } from './TextField';
import { autoUppercase } from '../utils/formatters';

export const GSTINField = React.memo(({ onChange, value = '', placeholder = '22AAAAA0000A1Z5', ...props }) => {
  const handleChange = (val) => {
    const clean = autoUppercase(val).slice(0, 15);
    if (onChange) {
      onChange(clean);
    }
  };

  return (
    <TextField
      {...props}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={15}
      autoComplete="off"
    />
  );
});

GSTINField.displayName = 'GSTINField';
