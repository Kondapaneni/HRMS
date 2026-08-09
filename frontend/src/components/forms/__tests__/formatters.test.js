import { describe, it, expect } from 'vitest';
import {
  formatCurrencyINR,
  parseCurrencyINR,
  formatPercentage,
  digitsOnly,
  autoUppercase
} from '../utils/formatters';

describe('Formatter Utilities', () => {
  it('formats numbers into Indian Rupee currency string', () => {
    expect(formatCurrencyINR(500000)).toBe('₹ 5,00,000');
    expect(formatCurrencyINR(10000000)).toBe('₹ 1,00,00,000');
    expect(formatCurrencyINR('')).toBe('');
  });

  it('parses formatted currency string back to pure number', () => {
    expect(parseCurrencyINR('₹ 5,00,000')).toBe(500000);
    expect(parseCurrencyINR('500000')).toBe(500000);
    expect(parseCurrencyINR('')).toBeNull();
  });

  it('formats percentages', () => {
    expect(formatPercentage(10.5)).toBe('10.50 %');
    expect(formatPercentage(8)).toBe('8.00 %');
  });

  it('filters non-digits', () => {
    expect(digitsOnly('9876-543-210')).toBe('9876543210');
    expect(digitsOnly('ABC-123-XYZ')).toBe('123');
  });

  it('converts text to uppercase', () => {
    expect(autoUppercase('abcde1234f')).toBe('ABCDE1234F');
  });
});
