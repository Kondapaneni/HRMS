import React from 'react';
import { TextField } from './TextField';
import { autoUppercase } from '../utils/formatters';

export const EmployeeIDField = React.memo(({ onChange, value = '', placeholder = 'EMP-12345678', ...props }) => {
  const handleChange = (val) => {
    const clean = autoUppercase(val);
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
    />
  );
});

EmployeeIDField.displayName = 'EmployeeIDField';
