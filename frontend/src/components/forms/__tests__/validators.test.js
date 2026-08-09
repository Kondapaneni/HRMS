import { describe, it, expect } from 'vitest';
import { validators } from '../validation/validators';
import {
  validatePAN,
  validateAadhaar,
  validateIFSC,
  validateGSTIN,
  validatePincode,
  validateBankAccount
} from '../validation/businessValidators';

describe('Base Validators', () => {
  it('validates required fields', () => {
    expect(validators.required('')).toBe('This field is required.');
    expect(validators.required(null)).toBe('This field is required.');
    expect(validators.required([])).toBe('Please select at least one option.');
    expect(validators.required('Rahul')).toBeNull();
  });

  it('validates email addresses', () => {
    expect(validators.email('invalid-email')).toBe('Please enter a valid email address.');
    expect(validators.email('user@domain.com')).toBeNull();
  });

  it('validates 10-digit mobile numbers', () => {
    expect(validators.phone('123')).toBe('Please enter a valid 10-digit Indian mobile number starting with 6-9.');
    expect(validators.phone('9876543210')).toBeNull();
  });

  it('validates min/max number constraints', () => {
    const minValidator = validators.min(500);
    expect(minValidator(100)).toBe('Value must be at least 500.');
    expect(minValidator(600)).toBeNull();

    const maxValidator = validators.max(1000);
    expect(maxValidator(1500)).toBe('Value cannot exceed 1000.');
    expect(maxValidator(800)).toBeNull();
  });
});

describe('Indian Business & Financial Domain Validators', () => {
  it('validates PAN numbers', () => {
    expect(validatePAN('INVALID123')).toBe('Invalid PAN number format (e.g. ABCDE1234F).');
    expect(validatePAN('ABCDE1234F')).toBeNull();
    expect(validatePAN('abcde1234f')).toBeNull(); // Auto upper case normalized
  });

  it('validates Aadhaar numbers', () => {
    expect(validateAadhaar('123456')).toBe('Aadhaar number must be exactly 12 digits.');
    expect(validateAadhaar('111111111111')).toBe('Invalid Aadhaar number (cannot be 12 identical digits).');
    expect(validateAadhaar('123456789012')).toBeNull();
  });

  it('validates IFSC codes', () => {
    expect(validateIFSC('SBIN1234567')).toBe('Invalid IFSC Code (e.g. SBIN0001234, 5th character must be 0).');
    expect(validateIFSC('SBIN0001234')).toBeNull();
  });

  it('validates GSTIN numbers', () => {
    expect(validateGSTIN('INVALIDGSTIN')).toBe('Invalid GSTIN format (15 characters, e.g. 22AAAAA0000A1Z5).');
    expect(validateGSTIN('22AAAAA0000A1Z5')).toBeNull();
  });

  it('validates Pincodes', () => {
    expect(validatePincode('012345')).toBe('Invalid Indian pincode (6 digits, cannot start with 0).');
    expect(validatePincode('500001')).toBeNull();
  });

  it('validates Bank Account numbers', () => {
    expect(validateBankAccount('123')).toBe('Bank account number must be between 9 and 18 digits.');
    expect(validateBankAccount('987654321098')).toBeNull();
  });
});
