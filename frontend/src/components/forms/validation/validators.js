/**
 * Base field validation utilities for HRMS form components.
 */

export const validators = {
  required: (value, customMsg) => {
    if (value === null || value === undefined || value === '') {
      return customMsg || 'This field is required.';
    }
    if (Array.isArray(value) && value.length === 0) {
      return customMsg || 'Please select at least one option.';
    }
    if (typeof value === 'boolean' && !value) {
      return customMsg || 'This checkbox must be checked.';
    }
    return null;
  },

  email: (value, customMsg) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return customMsg || 'Please enter a valid email address.';
    }
    return null;
  },

  phone: (value, customMsg) => {
    if (!value) return null;
    const clean = String(value).replace(/\D/g, '');
    if (clean.length !== 10 || !/^[6-9]\d{9}$/.test(clean)) {
      return customMsg || 'Please enter a valid 10-digit Indian mobile number starting with 6-9.';
    }
    return null;
  },

  number: (value, customMsg) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (isNaN(num)) {
      return customMsg || 'Please enter a valid number.';
    }
    return null;
  },

  decimal: (value, customMsg) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (isNaN(num)) {
      return customMsg || 'Please enter a valid decimal number.';
    }
    return null;
  },

  min: (minVal, customMsg) => (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (!isNaN(num) && num < minVal) {
      return customMsg || `Value must be at least ${minVal}.`;
    }
    return null;
  },

  max: (maxVal, customMsg) => (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (!isNaN(num) && num > maxVal) {
      return customMsg || `Value cannot exceed ${maxVal}.`;
    }
    return null;
  },

  minLength: (minLen, customMsg) => (value) => {
    if (!value) return null;
    if (String(value).length < minLen) {
      return customMsg || `Must be at least ${minLen} characters.`;
    }
    return null;
  },

  maxLength: (maxLen, customMsg) => (value) => {
    if (!value) return null;
    if (String(value).length > maxLen) {
      return customMsg || `Cannot exceed ${maxLen} characters.`;
    }
    return null;
  },

  pattern: (regex, customMsg) => (value) => {
    if (!value) return null;
    const re = typeof regex === 'string' ? new RegExp(regex) : regex;
    if (!re.test(String(value))) {
      return customMsg || 'Invalid format.';
    }
    return null;
  },

  date: (value, customMsg) => {
    if (!value) return null;
    const dateObj = new Date(value);
    if (isNaN(dateObj.getTime())) {
      return customMsg || 'Please enter a valid date.';
    }
    return null;
  }
};
