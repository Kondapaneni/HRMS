import React from 'react';
import { TextField } from './TextField';
import { autoUppercase } from '../utils/formatters';

export const PANField = React.memo(({ onChange, value = '', placeholder = 'ABCDE1234F', ...props }) => {
  const handleChange = (val) => {
    const clean = autoUppercase(val).slice(0, 10);
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
      maxLength={10}
      autoComplete="off"
    />
  );
});

PANField.displayName = 'PANField';
