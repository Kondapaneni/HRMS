import React from 'react';
import { TextField } from './TextField';
import { Phone } from 'lucide-react';
import { digitsOnly } from '../utils/formatters';

export const PhoneField = React.memo(({ onChange, value = '', ...props }) => {
  const handleChange = (val) => {
    const clean = digitsOnly(val).slice(0, 10);
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
      prefix={<Phone size={16} className="text-slate-400" />}
      placeholder={props.placeholder || '9876543210'}
      maxLength={10}
    />
  );
});

PhoneField.displayName = 'PhoneField';
