import React from 'react';
import { TextField } from './TextField';
import { autoUppercase } from '../utils/formatters';

export const IFSCField = React.memo(({ onChange, value = '', placeholder = 'SBIN0001234', ...props }) => {
  const handleChange = (val) => {
    const clean = autoUppercase(val).slice(0, 11);
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
      maxLength={11}
      autoComplete="off"
    />
  );
});

IFSCField.displayName = 'IFSCField';
