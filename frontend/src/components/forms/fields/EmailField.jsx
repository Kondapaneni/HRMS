import React from 'react';
import { TextField } from './TextField';
import { Mail } from 'lucide-react';

export const EmailField = React.memo((props) => {
  return (
    <TextField
      {...props}
      type="email"
      prefix={<Mail size={16} className="text-slate-400" />}
      placeholder={props.placeholder || 'example@domain.com'}
    />
  );
});

EmailField.displayName = 'EmailField';
