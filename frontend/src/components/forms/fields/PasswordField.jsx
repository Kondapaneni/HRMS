import React, { useState } from 'react';
import { TextField } from './TextField';
import { Lock, Eye, EyeOff } from 'lucide-react';

export const PasswordField = React.memo((props) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <TextField
      {...props}
      type={showPassword ? 'text' : 'password'}
      prefix={<Lock size={16} className="text-slate-400" />}
      suffix={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-slate-400 hover:text-slate-600 cursor-pointer pointer-events-auto transition-colors"
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  );
});

PasswordField.displayName = 'PasswordField';
